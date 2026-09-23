import { db } from "@/lib/db";
import { emailTransport, isEmailConfigured } from "@/lib/mailer";

/**
 * Health check for uptime monitoring and for confirming a deployment is wired
 * up correctly. Reports which optional services are configured, but never the
 * values themselves.
 */
export async function GET() {
  const startedAt = Date.now();

  let database = "ok";
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    database = "unreachable";
  }

  const body = {
    status: database === "ok" ? "ok" : "degraded",
    database,
    databaseProvider: process.env.DATABASE_PROVIDER ?? "sqlite",
    // Warn loudly about the two settings that are unsafe in production.
    config: {
      email: isEmailConfigured()
        ? `configured (${emailTransport()})`
        : "missing (sign-up will not work)",
      authSecret:
        (process.env.AUTH_SECRET ?? "").includes("change-me") ||
        (process.env.AUTH_SECRET ?? "").length < 16
          ? "INSECURE — still the development placeholder"
          : "set",
      demoLogin:
        process.env.ALLOW_DEMO_LOGIN === "true"
          ? "ENABLED — disable before a public launch"
          : "disabled",
      cron: process.env.CRON_SECRET ? "configured" : "disabled",
    },
    responseTimeMs: Date.now() - startedAt,
  };

  return Response.json(body, {
    status: database === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
