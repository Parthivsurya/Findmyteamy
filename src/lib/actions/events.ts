"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { flattenZod } from "@/lib/api";
import { requireOnboardedUser } from "@/lib/auth";
import { createEvent, setParticipation } from "@/lib/services/events";
import { eventSchema, participationSchema } from "@/lib/validators";
import { field, guard, type FormResult } from "./shared";

export async function createEventAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireOnboardedUser("/events/new");

  const parsed = eventSchema.safeParse({
    name: field(formData, "name") ?? "",
    organizer: field(formData, "organizer") ?? "",
    description: field(formData, "description"),
    startDate: field(formData, "startDate") ?? "",
    endDate: field(formData, "endDate") ?? "",
    registrationDeadline: field(formData, "registrationDeadline"),
    mode: field(formData, "mode") ?? "ONLINE",
    location: field(formData, "location"),
    minTeamSize: field(formData, "minTeamSize") ?? 2,
    maxTeamSize: field(formData, "maxTeamSize") ?? 4,
    themes: field(formData, "themes"),
    prize: field(formData, "prize"),
    registrationLink: field(formData, "registrationLink"),
    bannerUrl: field(formData, "bannerUrl"),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields",
      fieldErrors: flattenZod(parsed.error),
    };
  }

  let slug: string | undefined;
  let status: string | undefined;

  const result = await guard(
    () =>
      createEvent({
        createdById: user.id,
        ...parsed.data,
        // Admins publish straight away; everyone else waits for review.
        autoApprove: user.role === "ADMIN",
      }),
    (event) => {
      slug = event.slug;
      status = event.status;
      return { ok: true };
    },
  );

  if (result.ok && slug) {
    revalidatePath("/events");
    revalidatePath("/admin");
    redirect(status === "APPROVED" ? `/events/${slug}` : "/events?submitted=1");
  }

  return result;
}

/** "I'm attending" plus the per-event status, or leaving the event entirely. */
export async function setParticipationAction(formData: FormData) {
  const user = await requireOnboardedUser();

  const eventId = field(formData, "eventId");
  const slug = field(formData, "slug");
  const raw = field(formData, "status");
  if (!eventId) return;

  const parsed = participationSchema.safeParse({
    status: raw === "LEAVE" || raw === undefined ? null : raw,
  });
  if (!parsed.success) return;

  await guard(() => setParticipation(user.id, eventId, parsed.data.status));

  if (slug) revalidatePath(`/events/${slug}`);
  revalidatePath("/dashboard");
  revalidatePath(`/u/${user.username}`);
}
