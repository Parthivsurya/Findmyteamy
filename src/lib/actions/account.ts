"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endSession, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { field, guard, type FormResult } from "./shared";

/**
 * Data rights: a student can export everything held about them and delete the
 * account permanently, as the privacy section of the specification requires.
 */

export async function deleteAccountAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser("/settings");
  const confirmation = field(formData, "confirm");

  if (confirmation !== "DELETE") {
    return {
      error: "Type DELETE in the box to confirm",
      fieldErrors: { confirm: "Type DELETE exactly" },
    };
  }

  const result = await guard(async () => {
    // Every relation is declared onDelete: Cascade, so this removes the
    // profile, skills, roles, achievements, teams led, requests and
    // notifications in one go.
    await db.user.delete({ where: { id: user.id } });
  });

  if (result.ok) {
    await endSession();
    redirect("/?deleted=1");
  }
  return result;
}

/** Frees the username and email for reuse is deliberately not offered — the
 *  export is a read-only snapshot the student can keep. */
export async function exportDataAction() {
  const user = await requireUser("/settings");
  revalidatePath("/settings");
  redirect(`/api/me/export?ts=${Date.now()}`);
}
