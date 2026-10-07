import { HttpError } from "@/lib/api";

export type FormResult = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Set by actions that want the page to show a confirmation. */
  message?: string;
  /** A URL the page should display for copying, such as a fresh vouch link. */
  link?: string;
};

/**
 * Runs a service call and turns the HttpErrors it throws into a form result,
 * so pages can render a message instead of an error screen.
 */
export async function guard<T>(
  run: () => Promise<T>,
  onSuccess?: (value: T) => FormResult,
): Promise<FormResult> {
  try {
    const value = await run();
    return onSuccess?.(value) ?? { ok: true };
  } catch (error) {
    if (error instanceof HttpError) return { error: error.message };
    // Next's redirect() and notFound() throw control-flow errors; let them pass.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string"
    ) {
      throw error;
    }
    console.error("[action]", error);
    return { error: "Something went wrong. Please try again." };
  }
}

export const field = (data: FormData, key: string): string | undefined => {
  const value = data.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

export const fieldList = (data: FormData, key: string): string[] =>
  data.getAll(key).map(String).filter(Boolean);

export const fieldBool = (data: FormData, key: string): boolean => {
  const value = data.get(key);
  return value === "on" || value === "true";
};
