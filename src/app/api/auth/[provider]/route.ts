import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  appUrl,
  authorizeRedirect,
  getProvider,
  isProviderConfigured,
  newState,
} from "@/lib/oauth";

/** Starts the OAuth dance: GET /api/auth/github or /api/auth/google. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params;
  const provider = getProvider(providerId);

  if (!provider) {
    return NextResponse.redirect(`${appUrl()}/login?error=unknown-provider`);
  }
  if (!isProviderConfigured(provider.id)) {
    return NextResponse.redirect(
      `${appUrl()}/login?error=provider-not-configured&provider=${provider.id}`,
    );
  }

  const state = newState();
  const next = new URL(request.url).searchParams.get("next") ?? "/dashboard";

  const store = await cookies();
  // The state cookie is short-lived and only guards this one round trip.
  store.set("fmt_oauth_state", `${state}:${next}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(authorizeRedirect(provider, state));
}
