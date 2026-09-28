"use server";

import { revalidatePath } from "next/cache";
import { flattenZod } from "@/lib/api";
import { requireOnboardedUser } from "@/lib/auth";
import {
  addAchievement,
  deleteAchievement,
  updateAchievement,
} from "@/lib/services/achievements";
import { achievementSchema } from "@/lib/validators";
import { field, guard, type FormResult } from "./shared";

export async function addAchievementAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireOnboardedUser("/settings/achievements");

  const parsed = achievementSchema.safeParse({
    title: field(formData, "title") ?? "",
    eventName: field(formData, "eventName") ?? "",
    organizer: field(formData, "organizer"),
    position: field(formData, "position") ?? "PARTICIPANT",
    date: field(formData, "date") ?? "",
    description: field(formData, "description"),
    proofUrl: field(formData, "proofUrl"),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields",
      fieldErrors: flattenZod(parsed.error),
    };
  }

  const result = await guard(
    () => addAchievement(user.id, parsed.data),
    () => ({
      ok: true,
      message: parsed.data.proofUrl
        ? "Added and sent for review. You will be notified once an admin checks the proof."
        : "Added. Attach proof to have it verified. Only verified wins count in search filters.",
    }),
  );

  revalidatePath("/settings/achievements");
  revalidatePath(`/u/${user.username}`);
  revalidatePath("/admin");
  return result;
}

export async function updateAchievementAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireOnboardedUser("/settings/achievements");
  const id = field(formData, "achievementId");
  if (!id) return { error: "Missing achievement" };

  const parsed = achievementSchema.partial().safeParse({
    title: field(formData, "title"),
    eventName: field(formData, "eventName"),
    organizer: field(formData, "organizer"),
    position: field(formData, "position"),
    date: field(formData, "date"),
    description: field(formData, "description"),
    proofUrl: field(formData, "proofUrl"),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields",
      fieldErrors: flattenZod(parsed.error),
    };
  }

  const result = await guard(
    () => updateAchievement(id, user.id, parsed.data),
    () => ({ ok: true, message: "Updated and sent for review." }),
  );

  revalidatePath("/settings/achievements");
  revalidatePath(`/u/${user.username}`);
  return result;
}

export async function deleteAchievementAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireOnboardedUser("/settings/achievements");
  const id = field(formData, "achievementId");
  if (!id) return { error: "Missing achievement" };

  const result = await guard(
    () => deleteAchievement(id, user.id),
    () => ({ ok: true, message: "Achievement removed." }),
  );

  revalidatePath("/settings/achievements");
  revalidatePath(`/u/${user.username}`);
  return result;
}
