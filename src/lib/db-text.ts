/**
 * Provider-aware text matching.
 *
 * SQLite's LIKE is already case-insensitive for ASCII, and Prisma rejects
 * `mode: "insensitive"` against it. PostgreSQL is case-sensitive and needs the
 * flag. Routing every `contains` filter through this helper means search
 * behaves the same on a laptop and in production instead of quietly missing
 * matches after the migration.
 */

const NEEDS_MODE = (process.env.DATABASE_PROVIDER ?? "sqlite") === "postgresql";

export type TextFilter = { contains: string; mode?: "insensitive" };

/** Case-insensitive "contains", whichever database is behind it. */
export function containsText(value: string): TextFilter {
  return NEEDS_MODE ? { contains: value, mode: "insensitive" } : { contains: value };
}
