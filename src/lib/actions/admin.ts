"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviewAchievement } from "@/lib/services/achievements";
import { eventReviewSchema } from "@/lib/validators";
import { field, guard, type FormResult } from "./shared";

/** Approve or reject an achievement's proof. */
export async function reviewAchievementAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const admin = await requireAdmin();

  const achievementId = field(formData, "achievementId");
  const status = field(formData, "status");
  const reviewNote = field(formData, "reviewNote");

  if (!achievementId || (status !== "VERIFIED" && status !== "REJECTED")) {
    return { error: "Missing review details" };
  }

  const result = await guard(
    () =>
      reviewAchievement({
        achievementId,
        reviewerId: admin.id,
        reviewerName: admin.name,
        status,
        reviewNote,
      }),
    () => ({
      ok: true,
      message: status === "VERIFIED" ? "Achievement verified." : "Achievement rejected.",
    }),
  );

  revalidatePath("/admin");
  return result;
}

/** Approve or reject a submitted event. */
export async function reviewEventAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();

  const eventId = field(formData, "eventId");
  const parsed = eventReviewSchema.safeParse({ status: field(formData, "status") });

  if (!eventId || !parsed.success) return { error: "Missing review details" };

  const result = await guard(
    async () => {
      const event = await db.event.update({
        where: { id: eventId },
        data: { status: parsed.data.status },
        select: { slug: true, createdById: true, name: true },
      });

      if (event.createdById) {
        await db.notification.create({
          data: {
            userId: event.createdById,
            type: "EVENT_SOON",
            title:
              parsed.data.status === "APPROVED"
                ? `${event.name} is now live`
                : `${event.name} was not approved`,
            body:
              parsed.data.status === "APPROVED"
                ? "Participants can now mark themselves as attending."
                : "An admin reviewed the submission and did not approve it.",
            href: `/events/${event.slug}`,
          },
        });
      }
      return event;
    },
    () => ({
      ok: true,
      message:
        parsed.data.status === "APPROVED" ? "Event published." : "Event rejected.",
    }),
  );

  revalidatePath("/admin");
  revalidatePath("/events");
  return result;
}

/** Approve a user-suggested skill into the master list, or discard it. */
export async function reviewSkillAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();

  const skillId = field(formData, "skillId");
  const decision = field(formData, "decision");
  if (!skillId || !decision) return { error: "Missing skill details" };

  const result = await guard(
    async () => {
      if (decision === "approve") {
        return db.skill.update({ where: { id: skillId }, data: { approved: true } });
      }
      return db.skill.delete({ where: { id: skillId } });
    },
    () => ({
      ok: true,
      message: decision === "approve" ? "Skill added to the master list." : "Suggestion discarded.",
    }),
  );

  revalidatePath("/admin");
  return result;
}

/** Close a moderation report once it has been dealt with. */
export async function resolveReportAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();

  const reportId = field(formData, "reportId");
  if (!reportId) return { error: "Missing report" };

  const result = await guard(
    () =>
      db.report.update({
        where: { id: reportId },
        data: { status: "RESOLVED" },
      }),
    () => ({ ok: true, message: "Report marked as resolved." }),
  );

  revalidatePath("/admin");
  return result;
}
