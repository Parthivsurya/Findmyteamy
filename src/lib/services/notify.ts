import { db } from "@/lib/db";
import { notificationEmail } from "@/lib/email-templates";
import { sendMail } from "@/lib/mailer";
import type { NotificationType } from "@/lib/enums";

/**
 * Notifications and transactional email.
 *
 * In-app notifications are always written. Email goes through the single
 * transport in src/lib/mailer.ts (Resend, or SMTP, or the console in
 * development), and a failure to send never fails the action that caused it.
 */

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  data?: Record<string, unknown>;
  /** Which email preference governs this message. */
  emailPref?: "emailOnRequests" | "emailOnVerification" | "emailWeeklyDigest";
};

export async function notify(input: NotifyInput): Promise<void> {
  await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
      data: JSON.stringify(input.data ?? {}),
    },
  });

  if (!input.emailPref) return;

  const recipient = await db.user.findUnique({
    where: { id: input.userId },
    select: {
      email: true,
      name: true,
      emailOnRequests: true,
      emailOnVerification: true,
      emailWeeklyDigest: true,
    },
  });
  if (!recipient || !recipient[input.emailPref]) return;

  await sendMail({
    to: recipient.email,
    ...notificationEmail({
      firstName: recipient.name.split(" ")[0] ?? "there",
      heading: input.title,
      body: input.body,
      href: input.href,
      ctaLabel: ctaLabelFor(input.type),
    }),
  });
}

/** A button label that matches what the reader is being asked to do. */
function ctaLabelFor(type: NotificationType): string {
  switch (type) {
    case "INVITE":
    case "JOIN_REQUEST":
      return "View the request";
    case "REQUEST_ACCEPTED":
    case "TEAM_COMPLETE":
      return "View the team";
    case "REQUEST_DECLINED":
      return "View your requests";
    case "ACHIEVEMENT_VERIFIED":
    case "ACHIEVEMENT_REJECTED":
      return "View your achievements";
    case "AVAILABILITY_REMINDER":
      return "Confirm your availability";
    default:
      return "Open FindMyTeammate";
  }
}

export async function markNotificationsRead(
  userId: string,
  ids?: string[],
): Promise<number> {
  const result = await db.notification.updateMany({
    where: { userId, read: false, ...(ids?.length ? { id: { in: ids } } : {}) },
    data: { read: true },
  });
  return result.count;
}
