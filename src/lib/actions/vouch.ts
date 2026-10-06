"use server";

import { revalidatePath } from "next/cache";
import { flattenZod } from "@/lib/api";
import { requireAdmin, requireOnboardedUser } from "@/lib/auth";
import {
  decideAccessRequest,
  submitAccessRequest,
} from "@/lib/services/access-requests";
import {
  createVouch,
  revokeVouch,
  setVouchHidden,
} from "@/lib/services/vouch";
import {
  accessDecisionSchema,
  accessRequestSchema,
  seedMemberSchema,
  vouchSchema,
} from "@/lib/validators";
import { field, fieldBool, guard, type FormResult } from "./shared";

/** One member vouching for another student by roll number. */
export async function createVouchAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireOnboardedUser("/settings/vouches");

  const parsed = vouchSchema.safeParse({
    shortRoll: field(formData, "shortRoll") ?? "",
    statement: field(formData, "statement") ?? "",
    campusCode: field(formData, "campusCode"),
    schoolCode: field(formData, "schoolCode"),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields",
      fieldErrors: flattenZod(parsed.error),
    };
  }

  const result = await guard(
    () =>
      createVouch({
        voucherId: user.id,
        shortRoll: parsed.data.shortRoll,
        statement: parsed.data.statement,
        campusCode: parsed.data.campusCode,
        schoolCode: parsed.data.schoolCode,
      }),
    () => ({
      ok: true,
      message:
        "Link created. Copy it from the list below and send it to them. Only that roll number can use it.",
    }),
  );

  revalidatePath("/settings/vouches");
  return result;
}

/** An admin planting a founding member, who becomes a root rather than a child. */
export async function seedMemberAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const admin = await requireAdmin();

  const parsed = seedMemberSchema.safeParse({
    shortRoll: field(formData, "shortRoll") ?? "",
    campusCode: field(formData, "campusCode"),
    schoolCode: field(formData, "schoolCode"),
  });

  if (!parsed.success) {
    return {
      error: "Enter a roll number like cse24535",
      fieldErrors: flattenZod(parsed.error),
    };
  }

  const result = await guard(
    () =>
      createVouch({
        voucherId: admin.id,
        shortRoll: parsed.data.shortRoll,
        statement: "",
        campusCode: parsed.data.campusCode,
        schoolCode: parsed.data.schoolCode,
        kind: "ADMIN_SEED",
      }),
    () => ({
      ok: true,
      message: "Founding member link created. Send it to them to sign up.",
    }),
  );

  revalidatePath("/admin");
  return result;
}

/** Withdrawing a statement. Never removes the account: see the service. */
export async function revokeVouchAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireOnboardedUser("/settings/vouches");
  const vouchId = field(formData, "vouchId");
  if (!vouchId) return { error: "Missing vouch" };

  const result = await guard(
    () => revokeVouch(vouchId, user.id),
    () => ({
      ok: true,
      message: "Withdrawn. The statement is gone; their account is untouched.",
    }),
  );

  revalidatePath("/settings/vouches");
  revalidatePath("/admin");
  return result;
}

/** The subject hiding a statement written about them. */
export async function setVouchHiddenAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireOnboardedUser("/settings/vouches");
  const vouchId = field(formData, "vouchId");
  if (!vouchId) return { error: "Missing vouch" };
  const hidden = fieldBool(formData, "hidden");

  const result = await guard(
    () => setVouchHidden(vouchId, user.id, hidden),
    () => ({
      ok: true,
      message: hidden
        ? "Hidden from your profile. An admin can still see it."
        : "Shown on your profile again.",
    }),
  );

  revalidatePath("/settings/vouches");
  revalidatePath(`/u/${user.username}`);
  return result;
}

// ---------------------------------------------------------------------------
// Access requests
// ---------------------------------------------------------------------------

/**
 * Asking to join without a link.
 *
 * The reply is deliberately identical whether or not anything was recorded, so
 * this cannot be used to discover which addresses already have accounts.
 */
export async function requestAccessAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const parsed = accessRequestSchema.safeParse({
    email: field(formData, "email") ?? "",
    note: field(formData, "note"),
  });

  if (!parsed.success) {
    return {
      error: "Please check your email address",
      fieldErrors: flattenZod(parsed.error),
    };
  }

  return guard(
    () => submitAccessRequest(parsed.data),
    () => ({
      ok: true,
      message:
        "Request received. If it is approved you will be able to sign up with that address.",
    }),
  );
}

export async function decideAccessRequestAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const admin = await requireAdmin();

  const parsed = accessDecisionSchema.safeParse({
    requestId: field(formData, "requestId") ?? "",
    decision: field(formData, "decision") ?? "",
    decisionNote: field(formData, "decisionNote"),
  });

  if (!parsed.success) return { error: "Missing decision details" };

  const result = await guard(
    () =>
      decideAccessRequest({
        requestId: parsed.data.requestId,
        deciderId: admin.id,
        decision: parsed.data.decision,
        decisionNote: parsed.data.decisionNote,
      }),
    (decided) => ({
      ok: true,
      message:
        decided.status === "APPROVED"
          ? `${decided.email} can now sign up.`
          : `${decided.email} was declined.`,
    }),
  );

  revalidatePath("/admin");
  return result;
}
