import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { startSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  appUrl,
  exchangeCode,
  fetchProfile,
  getProvider,
  isProviderConfigured,
  upsertOAuthUser,
  type ProviderId,
} from "@/lib/oauth";

/** OAuth callback: verifies state, exchanges the code, then signs the user in. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params;
  const provider = getProvider(providerId);
  const url = new URL(request.url);
  const base = appUrl();

  if (!provider || !isProviderConfigured(provider.id)) {
    return NextResponse.redirect(`${base}/login?error=unknown-provider`);
  }

  const denied = url.searchParams.get("error");
  if (denied) {
    return NextResponse.redirect(`${base}/login?error=access-denied`);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const stored = store.get("fmt_oauth_state")?.value;
  store.delete("fmt_oauth_state");

  if (!code || !state || !stored) {
    return NextResponse.redirect(`${base}/login?error=missing-code`);
  }

  const [expectedState, next = "/dashboard"] = stored.split(":");
  if (state !== expectedState) {
    return NextResponse.redirect(`${base}/login?error=state-mismatch`);
  }

  try {
    const accessToken = await exchangeCode(provider, code);
    const profile = await fetchProfile(provider, accessToken);
    const { userId, onboarded } = await upsertOAuthUser(
      provider.id as ProviderId,
      profile,
    );

    await startSession(userId);
    await db.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    });

    const destination = onboarded ? next : "/onboarding";
    return NextResponse.redirect(`${base}${destination}`);
  } catch (error) {
    console.error("[oauth callback]", error);
    return NextResponse.redirect(`${base}/login?error=sign-in-failed`);
  }
}
