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
};

/** Raw completion. Prefer chatJson() when the caller needs structured output. */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
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
        model: openRouterModel(),
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 700,
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
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const content = body.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return { ok: false, error: "OpenRouter returned an empty completion", retryable: true };
    }

    return {
      ok: true,
      data: content,
      model: body.model ?? openRouterModel(),
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

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Last resort: the first {...} block in the response.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      return { ok: false, error: "The model did not return JSON", retryable: true };
    }
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return { ok: false, error: "The model returned malformed JSON", retryable: true };
    }
  }

  const data = validate(parsed);
  if (data === null) {
    return { ok: false, error: "The model's JSON did not match the expected shape", retryable: true };
  }

  return { ok: true, data, model: result.model, usage: result.usage };
}
