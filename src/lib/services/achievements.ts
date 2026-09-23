import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { notify } from "./notify";

/**
 * Achievements and the verification queue.
 *
 * An achievement with proof attached goes to PENDING and waits for an admin;
 * without proof it stays UNVERIFIED. Only VERIFIED achievements are counted by
 * the "has verified wins" search filter and the match score — that is the whole
 * point of the review step.
 */

export type AchievementInput = {
  title: string;
  eventName: string;
  organizer?: string;
  position: string;
  date: Date;
  description?: string;
  proofUrl?: string;
};

export async function addAchievement(userId: string, input: AchievementInput) {
  const count = await db.achievement.count({ where: { userId } });
  if (count >= 40) {
    throw new HttpError(400, "That is the maximum number of achievements");
  }

  return db.achievement.create({
    data: {
      userId,
      ...input,
      // Proof present means it can be reviewed; otherwise it stays unverified.
      status: input.proofUrl ? "PENDING" : "UNVERIFIED",
    },
  });
}

export async function updateAchievement(
  achievementId: string,
  userId: string,
  input: Partial<AchievementInput>,
) {
  const existing = await db.achievement.findUnique({
    where: { id: achievementId },
    select: { userId: true, status: true, proofUrl: true },
  });

  if (!existing) throw new HttpError(404, "That achievement does not exist");
  if (existing.userId !== userId) {
    throw new HttpError(403, "You can only edit your own achievements");
  }

  // Editing a verified achievement sends it back for review, so a checked
  // badge always corresponds to what an admin actually saw.
  const proofUrl = input.proofUrl ?? existing.proofUrl;
  const resetReview = existing.status === "VERIFIED" || existing.status === "REJECTED";

  return db.achievement.update({
    where: { id: achievementId },
    data: {
      ...input,
      ...(resetReview
        ? {
            status: proofUrl ? "PENDING" : "UNVERIFIED",
            reviewedBy: null,
            reviewNote: null,
            reviewedAt: null,
          }
        : { status: proofUrl ? "PENDING" : "UNVERIFIED" }),
    },
  });
}

export async function deleteAchievement(achievementId: string, userId: string) {
  const existing = await db.achievement.findUnique({
    where: { id: achievementId },
    select: { userId: true },
  });

  if (!existing) throw new HttpError(404, "That achievement does not exist");
  if (existing.userId !== userId) {
    throw new HttpError(403, "You can only delete your own achievements");
  }

  await db.achievement.delete({ where: { id: achievementId } });
}

/** Admin review. A rejection must say why, so the user can fix and resubmit. */
export async function reviewAchievement({
  achievementId,
  reviewerId,
  reviewerName,
  status,
  reviewNote,
}: {
  achievementId: string;
  reviewerId: string;
  reviewerName: string;
  status: "VERIFIED" | "REJECTED";
  reviewNote?: string;
}) {
  const achievement = await db.achievement.findUnique({
    where: { id: achievementId },
    select: { id: true, userId: true, title: true, status: true },
  });
  if (!achievement) throw new HttpError(404, "That achievement does not exist");

  if (status === "REJECTED" && !reviewNote) {
    throw new HttpError(400, "Give a reason so the user knows what to fix");
  }

  const updated = await db.achievement.update({
    where: { id: achievementId },
    data: {
      status,
      reviewNote,
      reviewedBy: reviewerName,
      reviewedAt: new Date(),
    },
  });

  await notify({
    userId: achievement.userId,
    type: status === "VERIFIED" ? "ACHIEVEMENT_VERIFIED" : "ACHIEVEMENT_REJECTED",
    title:
      status === "VERIFIED"
        ? "Your achievement was verified"
        : "Your achievement could not be verified",
    body:
      status === "VERIFIED"
        ? `“${achievement.title}” now shows a verified badge on your profile.`
        : `“${achievement.title}” was not approved. ${reviewNote ?? ""}`.trim(),
    href: "/settings/achievements",
    data: { achievementId, reviewerId },
    emailPref: "emailOnVerification",
  });

  return updated;
}

export async function listVerificationQueue(status = "PENDING") {
  return db.achievement.findMany({
    where: { status },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: { id: true, name: true, username: true, image: true, college: true },
      },
    },
    take: 100,
  });
}
