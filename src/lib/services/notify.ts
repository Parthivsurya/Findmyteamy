import { db } from "@/lib/db";
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
    subject: input.title,
    text: [
      `Hi ${recipient.name.split(" ")[0]},`,
      "",
      input.body ?? input.title,
      input.href ? `\n${appUrl()}${input.href}` : "",
      "",
      "— FindMyTeammate",
    ].join("\n"),
  });
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
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
