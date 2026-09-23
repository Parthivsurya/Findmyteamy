"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { respondToRequest, sendRequest } from "@/lib/services/requests";
import { field, guard, type FormResult } from "./shared";

/** Send an invite (leader → candidate) or a join request (candidate → leader). */
export async function sendRequestAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();

  const type = field(formData, "type") === "JOIN_REQUEST" ? "JOIN_REQUEST" : "INVITE";
  const teamId = field(formData, "teamId");
  const slotId = field(formData, "slotId");
  const toUserId = field(formData, "toUserId");
  const message = field(formData, "message");
  const returnTo = field(formData, "returnTo");

  if (!teamId || !slotId) {
    return { error: "Pick which team and role this is for" };
  }

  const result = await guard(
    () =>
      sendRequest({
        type,
        teamId,
        slotId,
        fromUserId: user.id,
        toUserId,
        message,
      }),
    () => ({
      ok: true,
      message:
        type === "INVITE"
          ? "Invite sent. You will be notified when they reply."
          : "Request sent to the team leader.",
    }),
  );

  if (result.ok) {
    revalidatePath("/requests");
    revalidatePath(`/teams/${teamId}`);
    if (returnTo) redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}sent=1`);
  }

  return result;
}

/** Accept, decline or cancel — the rules live in the requests service. */
export async function respondToRequestAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser("/requests");

  const requestId = field(formData, "requestId");
  const rawAction = field(formData, "action");

  if (!requestId || !rawAction) return { error: "Missing request details" };
  if (!["accept", "decline", "cancel"].includes(rawAction)) {
    return { error: "Unknown action" };
  }

  const result = await guard(
    () =>
      respondToRequest({
        requestId,
        userId: user.id,
        action: rawAction as "accept" | "decline" | "cancel",
      }),
    () => ({
      ok: true,
      message:
        rawAction === "accept"
          ? "Accepted — contact details are now shared with each other."
          : rawAction === "decline"
            ? "Request declined."
            : "Request cancelled.",
    }),
  );

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");

  return result;
}
