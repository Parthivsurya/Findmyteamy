import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { HttpError } from "@/lib/api";
import { db } from "@/lib/db";
import { envText } from "@/lib/env";
import { otpEmail, sendMail } from "@/lib/mailer";

/**
 * Emailed one-time codes.
 *
 * The code itself is never stored — only an HMAC of it — so a leaked database
 * does not hand out working codes. Codes are short-lived, single-use, rate
 * limited on the way out and attempt-limited on the way in.
 */

export const OTP_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

export type OtpPurpose = "SIGNUP" | "LOGIN" | "RESET";

function hashCode(email: string, purpose: string, code: string): string {
  const secret = envText("AUTH_SECRET") ?? "findmyteammate-insecure-development-secret";
  return createHmac("sha256", secret).update(`${email}:${purpose}:${code}`).digest("hex");
}

function generateCode(): string {
  // randomInt is cryptographically secure, unlike Math.random.
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export type IssueResult = {
  expiresAt: Date;
  emailed: boolean;
  /** Present only when SMTP is not configured, so local sign-up still works. */
  devCode?: string;
};

export async function issueOtp(
  rawEmail: string,
  purpose: OtpPurpose,
): Promise<IssueResult> {
  const email = rawEmail.trim().toLowerCase();

  const latest = await db.emailOtp.findFirst({
    where: { email, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (latest) {
    const elapsed = (Date.now() - latest.createdAt.getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      throw new HttpError(
        429,
        `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed)} seconds before asking for another code`,
      );
    }
  }

  // Any earlier code for this purpose stops working the moment a new one is sent.
  await db.emailOtp.updateMany({
    where: { email, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

  await db.emailOtp.create({
    data: {
      email,
      purpose,
      codeHash: hashCode(email, purpose, code),
      expiresAt,
    },
  });

  const { sent } = await sendMail({ to: email, ...otpEmail(code, OTP_TTL_MINUTES) });

  return {
    expiresAt,
    emailed: sent,
    devCode: sent ? undefined : code,
  };
}

export async function verifyOtp(
  rawEmail: string,
  purpose: OtpPurpose,
  rawCode: string,
): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  const code = rawCode.replace(/\s+/g, "");

  if (!/^\d{6}$/.test(code)) {
    throw new HttpError(400, "Enter the six-digit code from the email");
  }

  const record = await db.emailOtp.findFirst({
    where: { email, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new HttpError(400, "That code has expired. Ask for a new one.");
  }
  if (record.expiresAt < new Date()) {
    await db.emailOtp.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    throw new HttpError(400, "That code has expired. Ask for a new one.");
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await db.emailOtp.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    throw new HttpError(429, "Too many wrong attempts. Ask for a new code.");
  }

  const expected = Buffer.from(record.codeHash, "hex");
  const given = Buffer.from(hashCode(email, purpose, code), "hex");
  const matches = expected.length === given.length && timingSafeEqual(expected, given);

  if (!matches) {
    const attempts = record.attempts + 1;
    await db.emailOtp.update({ where: { id: record.id }, data: { attempts } });
    const left = MAX_ATTEMPTS - attempts;
    throw new HttpError(
      400,
      left > 0
        ? `That code is not right. ${left} ${left === 1 ? "attempt" : "attempts"} left.`
        : "Too many wrong attempts. Ask for a new code.",
    );
  }

  await db.emailOtp.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
}

/** Housekeeping for the scheduled job. */
export async function purgeExpiredOtps(): Promise<number> {
  const result = await db.emailOtp.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 86_400_000) } },
  });
  return result.count;
}
