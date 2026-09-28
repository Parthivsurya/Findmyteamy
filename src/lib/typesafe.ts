import { envNumber, envText } from "./env";

/**
 * TypeSafe System One client.
 *
 * A different shape from a chat API: you send `state` (the text being judged)
 * plus named, typed questions, and get back typed answers with calibrated
 * probabilities and confidence. Nothing to parse out of prose, and no asking a
 * chat model to self-report a number it has no calibration for.
 *
 * Their own measurements put batching every question into one request at
 * roughly 12x cheaper and 10x faster than asking separately, so callers should
 * send all their questions together.
 */

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
export const DEFAULT_TYPESAFE_MODEL = "jev-latest";

export function isTypeSafeConfigured(): boolean {
  return Boolean(envText("TYPESAFE_API_KEY"));
}

export function typeSafeModel(): string {
  return envText("TYPESAFE_MODEL") ?? DEFAULT_TYPESAFE_MODEL;
}

/**
 * Anywhere the API accepts structure. System One models are trained to read
 * JSON, and labelled keys are clearer than a serialised prose template.
 */
export type Entry = string | number | boolean | null | Entry[] | { [k: string]: Entry };

/**
 * A yes/no question. The answer is the probability that the answer is yes.
 *
 * `criteria.true` and `criteria.false` describe each side explicitly, which
 * calibrates far better than describing both inside one prose instruction.
 */
export type NoulQuestion = {
  type: "noul";
  instructions: Entry;
  criteria?: { true?: Entry; false?: Entry };
};

/** One option from a fixed set, with a probability for each. */
export type ChoiceQuestion = {
  type: "choice";
  instructions: Entry;
  criteria: Record<string, Entry>;
};

/** A rating against ordered, described levels. */
export type ScoreQuestion = { type: "score"; instructions: Entry; criteria: Entry[] };

export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export type NoulAnswer = { type: "noul"; noul: number; confidence?: number };
export type ChoiceAnswer = {
  type: "choice";
  choice: string;
  confidence?: number;
  probabilities?: Record<string, number>;
};
export type ScoreAnswer = { type: "score"; score: number; confidence?: number };
export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

/** Token counts for one request. There is no account-level usage endpoint —
 *  every candidate path 404s — so this is the only way to track spend. */
export type TypeSafeUsage = { inputTokens: number; outputTokens: number };

export type SystemOneResult =
  | {
      ok: true;
      model: string;
      answers: Record<string, Answer>;
      usage: TypeSafeUsage;
    }
  | { ok: false; error: string; retryable: boolean };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Asks several questions about one piece of state in a single request.
 *
 * Retries the same transient classes as the OpenRouter client: 429 and 5xx and
 * network timeouts. A 400 or 401 will fail identically however often it is
 * sent, so those return immediately.
 */
export async function askSystemOne(
  state: Entry,
  questions: Record<string, Question>,
  options: { timeoutMs?: number; retries?: number } = {},
): Promise<SystemOneResult> {
  const key = envText("TYPESAFE_API_KEY");
  if (!key) {
    return { ok: false, error: "TYPESAFE_API_KEY is not configured", retryable: false };
  }

  const attempts = 1 + (options.retries ?? envNumber("TYPESAFE_RETRIES", 2));
  let last: SystemOneResult = { ok: false, error: "No attempt was made", retryable: false };

  for (let attempt = 1; attempt <= attempts; attempt++) {
    last = await askOnce(state, questions, key, options.timeoutMs);
    if (last.ok || !last.retryable) return last;
    if (attempt < attempts) await sleep(600 * 3 ** (attempt - 1));
  }

  return last;
}

async function askOnce(
  state: Entry,
  questions: Record<string, Question>,
  key: string,
  timeoutMs?: number,
): Promise<SystemOneResult> {
  const timeout = timeoutMs ?? envNumber("TYPESAFE_TIMEOUT_MS", 30_000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state, model: typeSafeModel(), questions }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        ok: false,
        retryable: response.status === 429 || response.status >= 500,
        error: `TypeSafe returned ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      };
    }

    const body = (await response.json()) as {
      model?: string;
      answers?: Record<string, Answer>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    if (!body.answers || typeof body.answers !== "object") {
      return { ok: false, error: "TypeSafe returned no answers", retryable: true };
    }

    // Every question asked must come back, or the caller would silently treat
    // a missing judgement as a default.
    const missing = Object.keys(questions).filter((k) => !(k in body.answers!));
    if (missing.length) {
      return {
        ok: false,
        retryable: true,
        error: `TypeSafe did not answer: ${missing.join(", ")}`,
      };
    }

    return {
      ok: true,
      model: body.model ?? typeSafeModel(),
      answers: body.answers,
      usage: {
        inputTokens: body.usage?.input_tokens ?? 0,
        outputTokens: body.usage?.output_tokens ?? 0,
      },
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      retryable: true,
      error: aborted ? `TypeSafe timed out after ${timeout}ms` : "Could not reach TypeSafe",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Reads a noul answer as a 0-100 percentage. */
export function noulPercent(answer: Answer | undefined): number | null {
  if (!answer || answer.type !== "noul" || typeof answer.noul !== "number") return null;
  return Math.round(Math.max(0, Math.min(1, answer.noul)) * 100);
}

/**
 * Confidence as a 0-100 percentage.
 *
 * When a noul carries no confidence of its own, distance from 0.5 is the
 * honest stand-in: a probability of 0.5 is maximally uncertain and one at
 * either extreme is not.
 */
export function confidencePercent(answer: Answer | undefined): number | null {
  if (!answer) return null;
  if (typeof answer.confidence === "number") {
    return Math.round(Math.max(0, Math.min(1, answer.confidence)) * 100);
  }
  if (answer.type === "noul" && typeof answer.noul === "number") {
    return Math.round(Math.abs(answer.noul - 0.5) * 2 * 100);
  }
  return null;
}
