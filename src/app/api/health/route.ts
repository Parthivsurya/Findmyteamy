import { authSecretProblem } from "@/lib/auth";
import { db } from "@/lib/db";
import { databaseProvider } from "@/lib/env";
import { emailTransport, isEmailConfigured } from "@/lib/mailer";
import { isTypeSafeConfigured, typeSafeModel } from "@/lib/typesafe";

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
    databaseProvider: databaseProvider(),
    // Warn loudly about the two settings that are unsafe in production.
    config: {
      email: isEmailConfigured()
        ? `configured (${emailTransport()})`
        : "missing (sign-up will not work)",
      authSecret: authSecretProblem() ?? "set",
      demoLogin:
        process.env.ALLOW_DEMO_LOGIN === "true"
          ? process.env.NODE_ENV === "production"
            ? "requested but ignored (never listed in production builds)"
            : "ENABLED, development only"
          : "disabled",
      cron: process.env.CRON_SECRET ? "configured" : "disabled",
      // Neither provider exposes anything about its key, so reporting which
      // one is wired up is the only way to confirm a key actually landed.
      skillChecks: isTypeSafeConfigured()
        ? `enabled, judging on ${typeSafeModel()}`
        : "disabled (no TYPESAFE_API_KEY)",
    },
    responseTimeMs: Date.now() - startedAt,
  };

  return Response.json(body, {
    status: database === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
