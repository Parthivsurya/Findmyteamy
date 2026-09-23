/**
 * Environment reading that treats a blank value as absent.
 *
 * This matters because hosting dashboards store an unfilled variable as an
 * empty string, not as "unset" — and `process.env.X ?? fallback` only falls
 * back on undefined. An empty NEXT_PUBLIC_APP_URL therefore reached
 * `new URL("")` and failed the build, and an empty DATABASE_PROVIDER would
 * have silently disabled case-insensitive search on PostgreSQL.
 */

/** A trimmed value, or undefined when unset, blank or whitespace. */
export function envText(key: string): string | undefined {
  const raw = process.env[key];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function envNumber(key: string, fallback: number): number {
  const raw = envText(key);
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function envFlag(key: string): boolean {
  const raw = envText(key)?.toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

/**
 * The public base URL, resolved in order of how specific it is:
 *
 *   1. NEXT_PUBLIC_APP_URL — what you set deliberately, including a custom domain
 *   2. VERCEL_PROJECT_PRODUCTION_URL — the stable production domain on Vercel
 *   3. VERCEL_URL — this particular deployment, so previews link to themselves
 *   4. http://localhost:3000
 *
 * Steps 2 and 3 are injected by Vercel automatically, so email links and
 * metadata are correct on a Vercel deploy even with nothing configured.
 */
export function appUrl(): string {
  const explicit = envText("NEXT_PUBLIC_APP_URL");
  if (explicit) return normalise(explicit);

  const vercelProduction = envText("VERCEL_PROJECT_PRODUCTION_URL");
  if (vercelProduction) return normalise(vercelProduction);

  const vercelDeployment = envText("VERCEL_URL");
  if (vercelDeployment) return normalise(vercelDeployment);

  return "http://localhost:3000";
}

/** Adds a scheme if missing (Vercel's variables omit it) and drops any trailing slash. */
function normalise(value: string): string {
  const withScheme = /^https?:\/\//i.test(value)
    ? value
    : `https://${value.replace(/^\/+/, "")}`;

  const trimmed = withScheme.replace(/\/+$/, "");

  // A malformed value must not take the whole build down.
  try {
    return new URL(trimmed).origin;
  } catch {
    console.warn(`[env] Ignoring unusable base URL: ${value}`);
    return "http://localhost:3000";
  }
}

/** "sqlite" | "postgresql" — whichever the schema was generated against. */
export function databaseProvider(): string {
  return envText("DATABASE_PROVIDER") ?? "sqlite";
}
