import { HttpError } from "./api";

/**
 * Scheduled jobs are plain HTTP endpoints so they work the same whether they
 * are triggered by Vercel Cron or by crontab on your own server.
 *
 * Every call must present CRON_SECRET, either as `Authorization: Bearer <s>`
 * (what Vercel Cron sends) or as `?key=<s>` (easier from curl). With no secret
 * configured the endpoints refuse to run rather than being left open.
 */
export function assertCronRequest(request: Request): void {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    throw new HttpError(
      503,
      "CRON_SECRET is not configured, so scheduled jobs are disabled",
    );
  }

  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const key = new URL(request.url).searchParams.get("key");

  if (bearer !== secret && key !== secret) {
    throw new HttpError(401, "Invalid cron credentials");
  }
}
