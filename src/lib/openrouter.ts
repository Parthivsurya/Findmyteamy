import { envNumber, envText } from "./env";

/**
 * OpenRouter client.
 *
 * One HTTP call, no SDK — the API is OpenAI-compatible and a dependency here
 * would only wrap fetch. Model defaults to Jev Router, which picks the
 * underlying model and reasoning effort per request.
 *
 * Every helper returns a discriminated result rather than throwing, because a
 * model being slow, rate limited or malformed must never take down the action
 * that asked for it.
 */

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_MODEL = "typesafe/jev-router";

/**
 * Fallback models, tried in order once the primary has exhausted its retries.
 *
 * This is our own fallback rather than OpenRouter's `models` parameter,
 * because the two fail at different layers. Measured live over four calls
 * each: `typesafe/jev-router` succeeded 2/4, failing with
 * `504 Decision model timed out`, while `openai/gpt-6-luna` and
 * `deepseek/deepseek-v4.1-flash` were 4/4. The router's decision step runs
 * before a model is chosen, so passing `models` never gets far enough to help
 * — only asking for a different model does.
 */
const DEFAULT_FALLBACKS = ["openai/gpt-6-luna", "deepseek/deepseek-v4.1-flash"];

function modelChain(): string[] {
  const configured = envText("OPENROUTER_FALLBACK_MODELS");
  const fallbacks = configured
    ? configured.split(",").map((m) => m.trim()).filter(Boolean)
    : DEFAULT_FALLBACKS;
  const primary = openRouterModel();
  return [primary, ...fallbacks.filter((m) => m !== primary)];
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(envText("OPENROUTER_API_KEY"));
}

export function openRouterModel(): string {
  return envText("OPENROUTER_MODEL") ?? DEFAULT_MODEL;
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatResult<T> =
  | { ok: true; data: T; model: string; usage?: { prompt: number; completion: number } }
  | { ok: false; error: string; retryable: boolean };

type ChatOptions = {
  /** Lower is steadier; judgements should not wander between runs. */
  temperature?: number;
  maxTokens?: number;
  /** Ask the model for JSON and validate it before returning. */
  json?: boolean;
  timeoutMs?: number;
  /** Extra attempts after the first, for retryable failures only. */
  retries?: number;
  /**
   * Let the model think before answering. Off by default.
   *
   * This matters more than it looks: reasoning tokens are spent from the same
   * max_tokens budget and, on the models the router picks, they arrive in the
   * content field. A structured call that leaves reasoning on returns a
   * truncated monologue — "We need one short question, <=30 words, asking
   * about..." — and no JSON at all.
   */
  reasoning?: boolean;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Raw completion, retrying transient failures.
 *
 * Worth the complexity because a routing model adds its own decision step in
 * front of the underlying model, and that step can time out: the first live
 * call made here came back `504 Decision model timed out`. Without a retry a
 * transient hiccup fails a student's assessment outright.
 *
 * Only 429 and 5xx and network timeouts are retried. A 400 or a 401 will fail
 * identically however many times it is sent.
 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<ChatResult<string>> {
  const retries = options.retries ?? envNumber("OPENROUTER_RETRIES", 2);
  const chain = modelChain();
  let last: ChatResult<string> = { ok: false, error: "No attempt was made", retryable: false };

  for (const [index, model] of chain.entries()) {
    // The primary gets the retries; a fallback is tried once before moving on.
    const attempts = index === 0 ? 1 + retries : 1;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      last = await chatOnce(messages, options, model);
      if (last.ok) return last;
      // A 400 or 401 will fail identically on every model, so stop.
      if (!last.retryable) return last;

      if (attempt < attempts) {
        // 600ms then 1800ms: long enough for a hiccup to pass, short enough
        // that a student is not left staring at a spinner.
        await sleep(600 * 3 ** (attempt - 1));
      }
    }
  }

  return last;
}

async function chatOnce(
  messages: ChatMessage[],
  options: ChatOptions = {},
  model: string = openRouterModel(),
): Promise<ChatResult<string>> {
  const key = envText("OPENROUTER_API_KEY");
  if (!key) {
    return { ok: false, error: "OPENROUTER_API_KEY is not configured", retryable: false };
  }

  const timeout = options.timeoutMs ?? envNumber("OPENROUTER_TIMEOUT_MS", 30_000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        // OpenRouter uses these for attribution on its dashboard.
        "HTTP-Referer": envText("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
        "X-Title": "FindMyTeammate",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 700,
        ...(options.reasoning ? {} : { reasoning: { enabled: false } }),
        ...(options.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      // 429 and 5xx are worth retrying; a 400 or 401 is not.
      const retryable = response.status === 429 || response.status >= 500;
      return {
        ok: false,
        retryable,
        error: `OpenRouter returned ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      };
    }

    const body = (await response.json()) as {
      model?: string;
      choices?: Array<{
        finish_reason?: string;
        message?: { content?: string };
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const choice = body.choices?.[0];
    const content = choice?.message?.content?.trim();
    if (!content) {
      return { ok: false, error: "OpenRouter returned an empty completion", retryable: true };
    }

    // Running out of budget mid-answer produces a truncated fragment that
    // looks like a valid reply. Retrying is better than parsing half of one.
    if (choice?.finish_reason === "length") {
      return {
        ok: false,
        error: "The model ran out of output budget before finishing",
        retryable: true,
      };
    }

    return {
      ok: true,
      data: content,
      model: body.model ?? model,
      usage: {
        prompt: body.usage?.prompt_tokens ?? 0,
        completion: body.usage?.completion_tokens ?? 0,
      },
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      retryable: true,
      error: aborted ? `OpenRouter timed out after ${timeout}ms` : "Could not reach OpenRouter",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A completion parsed as JSON.
 *
 * Models wrap JSON in prose or fences often enough that stripping them is
 * worth doing rather than failing the whole assessment on formatting.
 */
export async function chatJson<T>(
  messages: ChatMessage[],
  validate: (value: unknown) => T | null,
  options: ChatOptions = {},
): Promise<ChatResult<T>> {
  const result = await chat(messages, { ...options, json: true });
  if (!result.ok) return result;

  const cleaned = result.data
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  // Truncated so a failure is diagnosable from logs without dumping a whole
  // completion into them.
  const snippet = () => ` Received: ${JSON.stringify(cleaned.slice(0, 160))}`;

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Some models wrap the object in prose. Take the outermost balanced braces
    // rather than a greedy match, which over-runs when the reply also contains
    // example objects.
    const first = cleaned.indexOf("{");
    let depth = 0;
    let end = -1;
    for (let i = first; i >= 0 && i < cleaned.length; i++) {
      if (cleaned[i] === "{") depth++;
      else if (cleaned[i] === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    if (first === -1 || end === -1) {
      return { ok: false, error: `The model did not return JSON.${snippet()}`, retryable: true };
    }
    try {
      parsed = JSON.parse(cleaned.slice(first, end + 1));
    } catch {
      return { ok: false, error: `The model returned malformed JSON.${snippet()}`, retryable: true };
    }
  }

  const data = validate(parsed);
  if (data === null) {
    return {
      ok: false,
      error: `The model's JSON did not match the expected shape.${snippet()}`,
      retryable: true,
    };
  }

  return { ok: true, data, model: result.model, usage: result.usage };
}
