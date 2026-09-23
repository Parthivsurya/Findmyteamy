import { headers } from "next/headers";

/**
 * The client IP, as seen through the proxy in front of the app.
 *
 * Vercel sets x-forwarded-for to a comma-separated chain with the client
 * first. Behind nginx the same header is set by proxy_set_header. Nothing
 * sets it in local development, which is why "unknown" is a valid value
 * rather than an error — the limiter still groups those together.
 *
 * This is deliberately not used for anything security-critical on its own: a
 * forwarded header can be spoofed when the app is reachable directly. It only
 * shapes rate limits, where the worst case is an attacker spreading their
 * requests across forged values and still being caught by the per-address
 * limits.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();

  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return h.get("x-real-ip")?.trim() || h.get("cf-connecting-ip")?.trim() || "unknown";
}
