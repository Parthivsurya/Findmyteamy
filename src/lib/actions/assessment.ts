"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { flattenZod } from "@/lib/api";
import { requireOnboardedUser } from "@/lib/auth";
import { startAssessment, submitAssessment } from "@/lib/services/skill-assessment";
import { assessmentAnswerSchema } from "@/lib/validators";
import { field, guard, type FormResult } from "./shared";

/** Asks for a question about one claimed skill and opens an attempt. */
export async function startAssessmentAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireOnboardedUser("/settings/skills");
  const skillId = field(formData, "skillId");
  if (!skillId) return { error: "Pick a skill to check" };

  const result = await guard(() => startAssessment({ userId: user.id, skillId }));
  if (result.ok) redirect(`/settings/skills/${skillId}/check`);
  return result;
}

/** Submits the answer and runs both judgements. */
export async function submitAssessmentAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireOnboardedUser("/settings/skills");

  const parsed = assessmentAnswerSchema.safeParse({
    assessmentId: field(formData, "assessmentId") ?? "",
    answer: field(formData, "answer") ?? "",
  });
  if (!parsed.success) {
    return { error: "Please fix your answer", fieldErrors: flattenZod(parsed.error) };
  }

  const result = await guard(
    () =>
      submitAssessment({
        assessmentId: parsed.data.assessmentId,
        userId: user.id,
        answer: parsed.data.answer,
      }),
    (saved) => ({
      ok: true,
      message:
        saved.status === "FLAGGED"
          ? "Answer received. It has been sent to an admin to look over before your profile is updated."
          : `Assessed as ${saved.assessedLevel?.toLowerCase()}. ${saved.rationale ?? ""}`.trim(),
    }),
  );

  revalidatePath("/settings/skills");
  revalidatePath(`/u/${user.username}`);
  return result;
}
