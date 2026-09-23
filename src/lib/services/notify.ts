import { db } from "@/lib/db";
import type { NotificationType } from "@/lib/enums";

/**
 * Notifications and transactional email.
 *
 * In-app notifications are always written. Email is sent through whichever
 * provider is configured (Resend or SendGrid); with no API key present the
 * message is logged instead, so local development never needs credentials and
 * nothing silently fails.
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

  await sendEmail({
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

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    // Development: log rather than pretend to have sent something.
    console.info(`[email] to=${to} subject="${subject}"`);
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "FindMyTeammate <noreply@findmyteammate.com>",
        to,
        subject,
        text,
      }),
    });
    if (!response.ok) {
      console.error("[email] provider rejected the message", await response.text());
    }
  } catch (error) {
    // A failed email must never fail the action that triggered it.
    console.error("[email] send failed", error);
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
