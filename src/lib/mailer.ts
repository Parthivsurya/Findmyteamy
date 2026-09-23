import nodemailer, { type Transporter } from "nodemailer";

/**
 * SMTP mail.
 *
 * Configure SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS to send real mail.
 * With nothing configured, messages are logged to the server console instead —
 * so a fresh clone can complete sign-up locally by reading the one-time code
 * out of the terminal, and nothing fails silently.
 */

let cached: Transporter | null = null;

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transport(): Transporter | null {
  if (!isSmtpConfigured()) return null;
  if (cached) return cached;

  const port = Number(process.env.SMTP_PORT ?? 587);

  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 is implicit TLS; 587 upgrades with STARTTLS.
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return cached;
}

export function mailFrom(): string {
  return (
    process.env.SMTP_FROM ??
    process.env.SMTP_USER ??
    "FindMyTeammate <no-reply@localhost>"
  );
}

export type Mail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendMail(mail: Mail): Promise<{ sent: boolean; error?: string }> {
  const mailer = transport();

  if (!mailer) {
    console.info(
      [
        "",
        "──────────── email (SMTP not configured) ────────────",
        `To:      ${mail.to}`,
        `Subject: ${mail.subject}`,
        "",
        mail.text,
        "─────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { sent: false };
  }

  try {
    await mailer.sendMail({
      from: mailFrom(),
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    return { sent: true };
  } catch (error) {
    console.error("[mailer] send failed", error);
    return { sent: false, error: "Could not send the email. Please try again." };
  }
}

/** The one-time code email. Plain and short, because it is read on a phone. */
export function otpEmail(code: string, minutes: number): Pick<Mail, "subject" | "text" | "html"> {
  const subject = `${code} is your FindMyTeammate code`;

  const text = [
    `Your FindMyTeammate verification code is ${code}.`,
    "",
    `It expires in ${minutes} minutes. If you did not request it, you can ignore this email.`,
    "",
    "— FindMyTeammate, Amrita Vishwa Vidyapeetham",
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0c1526">
      <h1 style="margin:0 0 4px;font-size:18px">FindMyTeammate</h1>
      <p style="margin:0 0 20px;color:#66798f;font-size:13px">Amrita Vishwa Vidyapeetham</p>
      <p style="font-size:14px;margin:0 0 12px">Your verification code is</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:0 0 16px;color:#2373F4">${code}</p>
      <p style="font-size:13px;color:#66798f;margin:0">
        It expires in ${minutes} minutes. If you did not request this, you can ignore the email.
      </p>
    </div>
  `;

  return { subject, text, html };
}
