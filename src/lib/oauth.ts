import { randomBytes } from "node:crypto";
import { db } from "./db";
import { RESERVED_USERNAMES } from "./validators";
import { slugify } from "./utils";

/**
 * GitHub and Google OAuth, implemented directly against the providers.
 *
 * GitHub is the recommended provider because the profile URL and avatar come
 * back with the identity, which fills in part of the profile automatically.
 */

export type ProviderId = "github" | "google";

type ProviderConfig = {
  id: ProviderId;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  clientId?: string;
  clientSecret?: string;
};

export function getProvider(id: string): ProviderConfig | null {
  if (id === "github") {
    return {
      id: "github",
      label: "GitHub",
      authorizeUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      scope: "read:user user:email",
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    };
  }
  if (id === "google") {
    return {
      id: "google",
      label: "Google",
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scope: "openid email profile",
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }
  return null;
}

export function isProviderConfigured(id: ProviderId): boolean {
  const provider = getProvider(id);
  return Boolean(provider?.clientId && provider?.clientSecret);
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export function callbackUrl(id: ProviderId): string {
  return `${appUrl()}/api/auth/callback/${id}`;
}

export function newState(): string {
  return randomBytes(16).toString("hex");
}

export function authorizeRedirect(provider: ProviderConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: provider.clientId!,
    redirect_uri: callbackUrl(provider.id),
    scope: provider.scope,
    state,
    response_type: "code",
  });
  if (provider.id === "google") {
    params.set("access_type", "online");
    params.set("prompt", "select_account");
  }
  return `${provider.authorizeUrl}?${params.toString()}`;
}

export type OAuthProfile = {
  providerAccountId: string;
  email: string;
  name: string;
  image?: string | null;
  githubUrl?: string | null;
  usernameHint?: string | null;
};

export async function exchangeCode(
  provider: ProviderConfig,
  code: string,
): Promise<string> {
  const response = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      code,
      redirect_uri: callbackUrl(provider.id),
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`${provider.label} rejected the token exchange`);
  }

  const data = (await response.json()) as { access_token?: string; error?: string };
  if (!data.access_token) {
    throw new Error(data.error ?? `${provider.label} returned no access token`);
  }
  return data.access_token;
}

export async function fetchProfile(
  provider: ProviderConfig,
  accessToken: string,
): Promise<OAuthProfile> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    "User-Agent": "FindMyTeammate",
  };

  if (provider.id === "github") {
    const user = (await (
      await fetch("https://api.github.com/user", { headers })
    ).json()) as {
      id: number;
      login: string;
      name: string | null;
      email: string | null;
      avatar_url: string | null;
      html_url: string | null;
    };

    let email = user.email;
    if (!email) {
      // Users with a private primary email need the dedicated endpoint.
      const emails = (await (
        await fetch("https://api.github.com/user/emails", { headers })
      ).json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
      email =
        emails.find((e) => e.primary && e.verified)?.email ??
        emails.find((e) => e.verified)?.email ??
        null;
    }
    if (!email) throw new Error("GitHub did not return a verified email address");

    return {
      providerAccountId: String(user.id),
      email,
      name: user.name ?? user.login,
      image: user.avatar_url,
      githubUrl: user.html_url,
      usernameHint: user.login,
    };
  }

  const user = (await (
    await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers })
  ).json()) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };

  if (!user.email) throw new Error("Google did not return an email address");

  return {
    providerAccountId: user.sub,
    email: user.email,
    name: user.name ?? user.email.split("@")[0]!,
    image: user.picture ?? null,
    usernameHint: user.email.split("@")[0],
  };
}

/** Finds a free username close to what the provider suggested. */
export async function uniqueUsername(hint: string | null | undefined): Promise<string> {
  const base = slugify(hint ?? "member").replace(/-/g, "") || "member";
  let candidate = base.slice(0, 20);

  if (RESERVED_USERNAMES.has(candidate) || candidate.length < 3) {
    candidate = `${candidate}user`.slice(0, 20);
  }

  for (let attempt = 0; attempt < 50; attempt++) {
    const taken = await db.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
    candidate = `${base.slice(0, 16)}${Math.floor(Math.random() * 9000) + 100}`;
  }
  return `member${Date.now().toString().slice(-8)}`;
}

/**
 * Links the OAuth identity to an account, creating the user on first sign-in.
 * Matching on a verified email lets someone sign in with either provider.
 */
export async function upsertOAuthUser(
  providerId: ProviderId,
  profile: OAuthProfile,
): Promise<{ userId: string; onboarded: boolean }> {
  const existingAccount = await db.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: providerId,
        providerAccountId: profile.providerAccountId,
      },
    },
    select: { user: { select: { id: true, onboarded: true } } },
  });

  if (existingAccount) {
    return {
      userId: existingAccount.user.id,
      onboarded: existingAccount.user.onboarded,
    };
  }

  const byEmail = await db.user.findUnique({
    where: { email: profile.email.toLowerCase() },
    select: { id: true, onboarded: true, image: true, githubUrl: true },
  });

  if (byEmail) {
    await db.account.create({
      data: {
        userId: byEmail.id,
        provider: providerId,
        providerAccountId: profile.providerAccountId,
      },
    });
    await db.user.update({
      where: { id: byEmail.id },
      data: {
        image: byEmail.image ?? profile.image ?? undefined,
        githubUrl: byEmail.githubUrl ?? profile.githubUrl ?? undefined,
        lastActiveAt: new Date(),
      },
    });
    return { userId: byEmail.id, onboarded: byEmail.onboarded };
  }

  const created = await db.user.create({
    data: {
      name: profile.name,
      username: await uniqueUsername(profile.usernameHint),
      email: profile.email.toLowerCase(),
      image: profile.image ?? undefined,
      githubUrl: profile.githubUrl ?? undefined,
      onboarded: false,
      accounts: {
        create: {
          provider: providerId,
          providerAccountId: profile.providerAccountId,
        },
      },
    },
    select: { id: true },
  });

  return { userId: created.id, onboarded: false };
}
