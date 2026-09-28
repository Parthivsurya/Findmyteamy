import { ok, route } from "@/lib/api";
import { assertCronRequest } from "@/lib/cron";
import { db } from "@/lib/db";
import { notify } from "@/lib/services/notify";

/**
 * Availability older than 30 days gets a reminder, so search results stay
 * truthful about who is actually free. Run daily.
 */
export const GET = route(async (request) => {
  assertCronRequest(request);

  const cutoff = new Date(Date.now() - 30 * 86_400_000);

  const stale = await db.user.findMany({
    where: {
      onboarded: true,
      availability: { not: "NOT_AVAILABLE" },
      availabilityUpdatedAt: { lt: cutoff },
      // Do not nag the same person every day.
      notifications: {
        none: {
          type: "AVAILABILITY_REMINDER",
          createdAt: { gte: new Date(Date.now() - 14 * 86_400_000) },
        },
      },
    },
    select: { id: true, availability: true },
    take: 500,
  });

  for (const user of stale) {
    await notify({
      userId: user.id,
      type: "AVAILABILITY_REMINDER",
      title: "Is your availability still correct?",
      body: "You set it over a month ago. Confirming it keeps you visible to team leaders and keeps search results honest.",
      href: "/dashboard",
      emailPref: "emailOnRequests",
    });
  }

  return ok({ job: "availability-reminders", reminded: stale.length });
});
