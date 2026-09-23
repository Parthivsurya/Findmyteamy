import nodemailer, { type Transporter } from "nodemailer";
import { envNumber, envText } from "./env";

/**
 * Outbound email, with one implementation for the whole app.
 *
 * Two transports, tried in order:
 *
 *   1. Resend's HTTP API, if RESEND_API_KEY is set. Preferred on serverless
 *      hosting (Vercel), where holding an SMTP connection open competes with
 *      the function timeout and cold starts make it flaky.
 *   2. SMTP via Nodemailer, if SMTP_HOST/USER/PASS are set. Right for a
 *      long-running server, and the option to use if you already have a
 *      mailbox rather than an email provider.
 *
 * With neither configured, messages are logged to the server console — so a
 * fresh clone can complete sign-up locally by reading the code out of the
 * terminal, and nothing fails silently.
 */

let cachedTransport: Transporter | null = null;

export function isSmtpConfigured(): boolean {
  return Boolean(envText("SMTP_HOST") && envText("SMTP_USER") && envText("SMTP_PASS"));
}

export function isResendConfigured(): boolean {
  return Boolean(envText("RESEND_API_KEY"));
}

/** Whether email can actually be delivered at all. */
export function isEmailConfigured(): boolean {
  return isResendConfigured() || isSmtpConfigured();
}

/** Which transport is in use — reported by /api/health. */
export function emailTransport(): "resend" | "smtp" | "console" {
  if (isResendConfigured()) return "resend";
  if (isSmtpConfigured()) return "smtp";
  return "console";
}

function smtpTransport(): Transporter | null {
  if (!isSmtpConfigured()) return null;
  if (cachedTransport) return cachedTransport;

  const port = envNumber("SMTP_PORT", 587);

  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 is implicit TLS; 587 upgrades with STARTTLS.
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  return cachedTransport;
}

export function mailFrom(): string {
  return (
    envText("EMAIL_FROM") ??
    envText("SMTP_FROM") ??
    envText("SMTP_USER") ??
    "FindMyTeammate <onboarding@resend.dev>"
  );
}

export type Mail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendResult = { sent: boolean; via: ReturnType<typeof emailTransport>; error?: string };

export async function sendMail(mail: Mail): Promise<SendResult> {
  if (isResendConfigured()) return sendViaResend(mail);
  if (isSmtpConfigured()) return sendViaSmtp(mail);

  console.info(
    [
      "",
      "──────────── email (no transport configured) ────────────",
      `To:      ${mail.to}`,
      `Subject: ${mail.subject}`,
      "",
      mail.text,
      "─────────────────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
  return { sent: false, via: "console" };
}

async function sendViaResend(mail: Mail): Promise<SendResult> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: mailFrom(),
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("[mailer] Resend rejected the message", detail);
      return { sent: false, via: "resend", error: "The email provider rejected the message." };
    }
    return { sent: true, via: "resend" };
  } catch (error) {
    console.error("[mailer] Resend request failed", error);
    return { sent: false, via: "resend", error: "Could not reach the email provider." };
  }
}

async function sendViaSmtp(mail: Mail): Promise<SendResult> {
  const transport = smtpTransport();
  if (!transport) return { sent: false, via: "smtp", error: "SMTP is not configured." };

  try {
    await transport.sendMail({
      from: mailFrom(),
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    return { sent: true, via: "smtp" };
  } catch (error) {
    console.error("[mailer] SMTP send failed", error);
    return { sent: false, via: "smtp", error: "Could not send the email. Please try again." };
  }
}
