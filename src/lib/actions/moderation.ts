"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { flattenZod } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { markNotificationsRead } from "@/lib/services/notify";
import { reportSchema } from "@/lib/validators";
import { field, fieldBool, guard, type FormResult } from "./shared";

/** Report someone to the admins, optionally blocking them at the same time. */
export async function reportUserAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();

  const parsed = reportSchema.safeParse({
    reportedUserId: field(formData, "reportedUserId") ?? "",
    reason: field(formData, "reason") ?? "",
  });

  if (!parsed.success) {
    return {
      error: "Please describe what happened",
      fieldErrors: flattenZod(parsed.error),
    };
  }

  if (parsed.data.reportedUserId === user.id) {
    return { error: "You cannot report yourself" };
  }

  const alsoBlock = fieldBool(formData, "block");

  const result = await guard(async () => {
    await db.report.create({
      data: {
        reporterId: user.id,
        reportedUserId: parsed.data.reportedUserId,
        reason: parsed.data.reason,
      },
    });

    if (alsoBlock) {
      await db.block.upsert({
        where: {
          blockerId_blockedId: {
            blockerId: user.id,
            blockedId: parsed.data.reportedUserId,
          },
        },
        update: {},
        create: { blockerId: user.id, blockedId: parsed.data.reportedUserId },
      });
    }
  });

  if (result.ok) {
    revalidatePath("/admin");
    revalidatePath("/settings");
    redirect("/settings?reported=1");
  }

  return result;
}

export async function blockUserAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const targetId = field(formData, "userId");
  if (!targetId) return { error: "Missing user" };
  if (targetId === user.id) return { error: "You cannot block yourself" };

  const result = await guard(
    () =>
      db.block.upsert({
        where: { blockerId_blockedId: { blockerId: user.id, blockedId: targetId } },
        update: {},
        create: { blockerId: user.id, blockedId: targetId },
      }),
    () => ({
      ok: true,
      message: "Blocked. They can no longer send you requests, and you will not see each other in search.",
    }),
  );

  revalidatePath("/settings");
  revalidatePath("/search");
  return result;
}

export async function unblockUserAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const targetId = field(formData, "userId");
  if (!targetId) return { error: "Missing user" };

  const result = await guard(
    () =>
      db.block.deleteMany({
        where: { blockerId: user.id, blockedId: targetId },
      }),
    () => ({ ok: true, message: "Unblocked." }),
  );

  revalidatePath("/settings");
  return result;
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser("/notifications");
  await markNotificationsRead(user.id);
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}
