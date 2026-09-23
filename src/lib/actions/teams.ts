"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { flattenZod } from "@/lib/api";
import { createTeam, releaseSlot, updateTeam } from "@/lib/services/teams";
import { teamSchema, teamUpdateSchema } from "@/lib/validators";
import { field, fieldList, guard, type FormResult } from "./shared";

/**
 * Team creation. The form sends one "slots" value per open role, encoded as
 * "roleId:skillA,skillB" by the slot editor.
 */
export async function createTeamAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireOnboardedUser("/teams/new");

  const slots = fieldList(formData, "slots").map((value) => {
    const [roleId, skillList = ""] = value.split(":");
    return {
      roleId: roleId ?? "",
      requiredSkillIds: skillList.split(",").filter(Boolean),
      note: undefined,
    };
  });

  const parsed = teamSchema.safeParse({
    name: field(formData, "name") ?? "",
    idea: field(formData, "idea"),
    eventId: field(formData, "eventId") ?? "",
    slots,
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields",
      fieldErrors: flattenZod(parsed.error),
    };
  }

  let createdId: string | undefined;
  const result = await guard(
    () => createTeam({ leaderId: user.id, ...parsed.data }),
    (team) => {
      createdId = team.id;
      return { ok: true };
    },
  );

  if (result.ok && createdId) {
    revalidatePath("/dashboard");
    revalidatePath("/teams");
    // Straight into Team Builder, pre-filled with the roles just opened.
    redirect(`/team-builder?team=${createdId}`);
  }

  return result;
}

export async function updateTeamAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireOnboardedUser();
  const teamId = field(formData, "teamId");
  if (!teamId) return { error: "Missing team" };

  const parsed = teamUpdateSchema.safeParse({
    name: field(formData, "name"),
    idea: field(formData, "idea"),
  });
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields",
      fieldErrors: flattenZod(parsed.error),
    };
  }

  const result = await guard(
    () => updateTeam(teamId, user.id, parsed.data),
    () => ({ ok: true, message: "Team updated." }),
  );

  revalidatePath(`/teams/${teamId}`);
  return result;
}

/** Leader removes a member, or a member leaves the team. */
export async function releaseSlotAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireOnboardedUser();
  const slotId = field(formData, "slotId");
  const teamId = field(formData, "teamId");
  if (!slotId) return { error: "Missing slot" };

  const result = await guard(
    () => releaseSlot(slotId, user.id),
    () => ({ ok: true, message: "That role is open again." }),
  );

  if (teamId) revalidatePath(`/teams/${teamId}`);
  revalidatePath("/dashboard");
  return result;
}
