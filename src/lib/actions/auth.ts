"use server";

import { redirect } from "next/navigation";
import { endSession, startSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  changePassword,
  finishPasswordReset,
  finishSignup,
  signIn,
  startPasswordReset,
  startSignup,
} from "@/lib/services/accounts";
import { issueOtp } from "@/lib/services/otp";
import { clientIp } from "@/lib/request-ip";
import { field, guard, type FormResult } from "./shared";

/**
 * Sign-up, sign-in and password recovery.
 *
 * Only Amrita student addresses can register, and every address is confirmed
 * with an emailed one-time code before it can be used.
 */

/** In development, SMTP is usually unconfigured — surface the code so that
 *  sign-up is still completable without a mail server. */
function devCodeParam(devCode?: string): string {
  if (!devCode || process.env.NODE_ENV === "production") return "";
  return `&dev=${devCode}`;
}

export async function signupAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const email = (field(formData, "email") ?? "").toLowerCase();
  const name = field(formData, "name") ?? "";
  const password = field(formData, "password") ?? "";
  const confirm = field(formData, "confirmPassword") ?? "";

  if (password !== confirm) {
    return {
      error: "The two passwords do not match",
      fieldErrors: { confirmPassword: "This does not match the password above" },
    };
  }

  let devCode: string | undefined;
  const result = await guard(
    async () => startSignup({ email, name, password, ip: await clientIp() }),
    (issued) => {
      devCode = issued.devCode;
      return { ok: true };
    },
  );

  if (result.ok) {
    redirect(
      `/verify?email=${encodeURIComponent(email)}${devCodeParam(devCode)}`,
    );
  }
  return result;
}

export async function verifyEmailAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const email = (field(formData, "email") ?? "").toLowerCase();
  const code = field(formData, "code") ?? "";

  let destination: string | undefined;
  const result = await guard(
    () => finishSignup(email, code),
    ({ userId, onboarded }) => {
      destination = onboarded ? "/dashboard" : "/onboarding";
      return { ok: true, message: userId };
    },
  );

  if (result.ok && destination) {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (user) await startSession(user.id);
    redirect(destination);
  }

  return result;
}

export async function resendCodeAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const email = (field(formData, "email") ?? "").toLowerCase();
  const purpose = field(formData, "purpose") === "RESET" ? "RESET" : "SIGNUP";

  let devCode: string | undefined;
  const result = await guard(
    async () => issueOtp(email, purpose, await clientIp()),
    (issued) => {
      devCode = issued.devCode;
      return {
        ok: true,
        message: issued.emailed
          ? "A new code is on its way."
          : `SMTP is not configured — your code is ${issued.devCode}`,
      };
    },
  );

  if (result.ok && devCode && process.env.NODE_ENV !== "production") {
    return { ...result, message: `SMTP is not configured — your code is ${devCode}` };
  }
  return result;
}

export async function loginAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const email = (field(formData, "email") ?? "").toLowerCase();
  const password = field(formData, "password") ?? "";
  const next = field(formData, "next");

  if (!email || !password) {
    return { error: "Enter your Amrita email address and password" };
  }

  let destination: string | undefined;
  let userId: string | undefined;

  const result = await guard(
    async () => signIn(email, password, await clientIp()),
    (session) => {
      userId = session.userId;
      destination = session.onboarded ? (next ?? "/dashboard") : "/onboarding";
      return { ok: true };
    },
  );

  if (result.ok && userId && destination) {
    await startSession(userId);
    redirect(destination);
  }

  // An unconfirmed address gets sent to the code screen rather than a dead end.
  if (result.error?.includes("not confirmed")) {
    redirect(`/verify?email=${encodeURIComponent(email)}&unverified=1`);
  }

  return result;
}

export async function forgotPasswordAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const email = (field(formData, "email") ?? "").toLowerCase();

  let devCode: string | undefined;
  const result = await guard(
    async () => startPasswordReset(email, await clientIp()),
    (issued) => {
      devCode = issued.devCode;
      return { ok: true };
    },
  );

  if (result.ok) {
    redirect(
      `/reset-password?email=${encodeURIComponent(email)}${devCodeParam(devCode)}`,
    );
  }
  return result;
}

export async function resetPasswordAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const email = (field(formData, "email") ?? "").toLowerCase();
  const code = field(formData, "code") ?? "";
  const password = field(formData, "password") ?? "";
  const confirm = field(formData, "confirmPassword") ?? "";

  if (password !== confirm) {
    return {
      error: "The two passwords do not match",
      fieldErrors: { confirmPassword: "This does not match the password above" },
    };
  }

  let session: { userId: string; onboarded: boolean } | undefined;
  const result = await guard(
    () => finishPasswordReset(email, code, password),
    (value) => {
      session = value;
      return { ok: true };
    },
  );

  if (result.ok && session) {
    await startSession(session.userId);
    redirect(session.onboarded ? "/dashboard" : "/onboarding");
  }
  return result;
}

export async function changePasswordAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const { requireUser } = await import("@/lib/auth");
  const user = await requireUser("/settings/security");

  const current = field(formData, "currentPassword") ?? "";
  const next = field(formData, "newPassword") ?? "";
  const confirm = field(formData, "confirmPassword") ?? "";

  if (next !== confirm) {
    return {
      error: "The two passwords do not match",
      fieldErrors: { confirmPassword: "This does not match the new password" },
    };
  }

  return guard(
    () => changePassword(user.id, current, next),
    () => ({ ok: true, message: "Password changed." }),
  );
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}
