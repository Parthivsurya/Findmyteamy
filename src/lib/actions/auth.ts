"use server";

import { redirect } from "next/navigation";
import { endSession, startSession } from "@/lib/auth";
import { db } from "@/lib/db";

/** Sign out and return to the landing page. */
export async function logoutAction() {
  await endSession();
  redirect("/");
}

/**
 * Development sign-in for the seeded demo accounts.
 *
 * OAuth needs client credentials that a fresh clone will not have, so this
 * path exists to make the app explorable immediately. It is refused unless
 * ALLOW_DEMO_LOGIN is set, and it never accepts a password because there is
 * no password to accept — it only matches a seeded demo account.
 */
export async function demoLoginAction(formData: FormData) {
  if (process.env.ALLOW_DEMO_LOGIN !== "true") {
    redirect("/login?error=demo-disabled");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = String(formData.get("next") ?? "") || "/dashboard";

  if (!email) redirect("/login?error=missing-email");

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, onboarded: true, accounts: { select: { provider: true } } },
  });

  // Only seeded demo identities can use this door.
  const isDemoAccount = user?.accounts.some((a) => a.provider === "demo");
  if (!user || !isDemoAccount) {
    redirect("/login?error=unknown-demo-account");
  }

  await startSession(user.id);
  await db.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });

  redirect(user.onboarded ? next : "/onboarding");
}
