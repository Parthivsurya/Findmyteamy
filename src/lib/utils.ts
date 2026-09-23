/** Join conditional class names. A tiny local stand-in for clsx. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

/** Turns "Priya Sharma" into "PS" for avatar fallbacks. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

const DATE_FMT = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(date: Date | string): string {
  return DATE_FMT.format(new Date(date));
}

/** "12 Mar – 14 Mar 2026", collapsing the repeated month and year. */
export function formatDateRange(start: Date | string, end: Date | string): string {
  const a = new Date(start);
  const b = new Date(end);
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (sameMonth) {
    return `${a.getDate()}–${b.getDate()} ${DATE_FMT.format(b).split(" ").slice(1).join(" ")}`;
  }
  return `${formatDate(a)} – ${formatDate(b)}`;
}

export function daysSince(date: Date | string | null | undefined): number {
  if (!date) return Number.POSITIVE_INFINITY;
  const ms = Date.now() - new Date(date).getTime();
  return Math.floor(ms / 86_400_000);
}

export function daysUntil(date: Date | string): number {
  const ms = new Date(date).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export function relativeTime(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

/** Human countdown used on event pages. */
export function countdown(date: Date | string): string {
  const days = daysUntil(date);
  if (days < 0) return "Closed";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days left`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

export function parseThemes(themes: string): string[] {
  return themes
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Builds a URL that keeps the current query string and overrides only the
 * given keys — used by sort controls, tabs and pagination.
 */
export function withParams(
  basePath: string,
  current: Record<string, string | string[] | undefined>,
  overrides: Record<string, string | number | boolean | null | undefined>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "" || value === false) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
