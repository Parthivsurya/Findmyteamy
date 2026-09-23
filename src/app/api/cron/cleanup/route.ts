import { ok, route } from "@/lib/api";
import { assertCronRequest } from "@/lib/cron";
import { db } from "@/lib/db";
import { purgeExpiredOtps } from "@/lib/services/otp";

/** Housekeeping: drop spent one-time codes and expire stale requests. Daily. */
export const GET = route(async (request) => {
  assertCronRequest(request);

  const otps = await purgeExpiredOtps();

  // A request nobody answered in 30 days is not going to be answered.
  const expired = await db.teamRequest.updateMany({
    where: {
      status: "PENDING",
      createdAt: { lt: new Date(Date.now() - 30 * 86_400_000) },
    },
    data: { status: "EXPIRED", respondedAt: new Date() },
  });

  // Clear lockouts whose window has passed, so the rows stay tidy.
  const unlocked = await db.user.updateMany({
    where: { lockedUntil: { lt: new Date() } },
    data: { lockedUntil: null, failedLoginCount: 0 },
  });

  return ok({
    job: "cleanup",
    otpsPurged: otps,
    requestsExpired: expired.count,
    accountsUnlocked: unlocked.count,
  });
});
