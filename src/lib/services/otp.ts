import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { HttpError } from "@/lib/api";
import { db } from "@/lib/db";
import { envNumber, envText } from "@/lib/env";
import { otpEmail } from "@/lib/email-templates";
import { sendMail } from "@/lib/mailer";

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

/**
 * Per-network send limits, on top of the per-address cooldown.
 *
 * These are deliberately generous. On campus wifi every student shares one
 * public IP, so a tight limit would lock out a whole classroom during a
 * sign-up drive — a failure that looks exactly like the site being broken.
 * The per-address cooldown is what stops someone hammering one mailbox; these
 * stop a script walking through thousands of addresses and burning the mail
 * quota. Tune with OTP_IP_LIMIT_HOUR / OTP_IP_LIMIT_DAY.
 */
const ipLimitHour = () => envNumber("OTP_IP_LIMIT_HOUR", 20);
const ipLimitDay = () => envNumber("OTP_IP_LIMIT_DAY", 60);

/** Distinct addresses one network may request codes for in a day. */
const ipDistinctEmailsDay = () => envNumber("OTP_IP_EMAILS_DAY", 40);

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

/** Rounds a count of minutes up to something worth telling a person. */
function waitMessage(minutes: number): string {
  if (minutes <= 1) return "a minute";
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/**
 * Counts recent sends from one network and refuses when either window is full.
 * Skipped entirely for "unknown", which is only local development.
 */
async function assertNetworkUnderLimit(ip: string): Promise<void> {
  if (ip === "unknown") return;

  const hourAgo = new Date(Date.now() - 3_600_000);
  const dayAgo = new Date(Date.now() - 86_400_000);

  const [lastHour, lastDay] = await Promise.all([
    db.otpRequestLog.count({ where: { ip, createdAt: { gte: hourAgo } } }),
    db.otpRequestLog.count({ where: { ip, createdAt: { gte: dayAgo } } }),
  ]);

  if (lastHour >= ipLimitHour()) {
    // Tell them roughly when the window frees up rather than just "later".
    const oldest = await db.otpRequestLog.findFirst({
      where: { ip, createdAt: { gte: hourAgo } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const freesAt = oldest ? oldest.createdAt.getTime() + 3_600_000 : Date.now() + 3_600_000;
    const minutes = Math.max(1, Math.ceil((freesAt - Date.now()) / 60_000));
    throw new HttpError(
      429,
      `Too many codes have been requested from this network. Try again in ${waitMessage(minutes)}.`,
    );
  }

  if (lastDay >= ipLimitDay()) {
    throw new HttpError(
      429,
      "This network has requested too many codes today. Try again tomorrow, or use mobile data.",
    );
  }

  // A script walking through addresses looks different from a busy classroom:
  // many students share an IP but each asks for their own address once.
  const distinct = await db.otpRequestLog.findMany({
    where: { ip, createdAt: { gte: dayAgo } },
    distinct: ["email"],
    select: { email: true },
  });
  if (distinct.length >= ipDistinctEmailsDay()) {
    throw new HttpError(
      429,
      "This network has requested codes for too many different addresses today.",
    );
  }
}

export async function issueOtp(
  rawEmail: string,
  purpose: OtpPurpose,
  ip = "unknown",
): Promise<IssueResult> {
  const email = rawEmail.trim().toLowerCase();

  await assertNetworkUnderLimit(ip);

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

  await db.otpRequestLog.create({ data: { ip, email, purpose } });

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
  const [codes, logs] = await Promise.all([
    db.emailOtp.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 86_400_000) } },
    }),
    // Nothing older than the widest rate-limit window is ever consulted.
    db.otpRequestLog.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 2 * 86_400_000) } },
    }),
  ]);
  return codes.count + logs.count;
}
