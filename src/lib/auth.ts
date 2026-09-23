import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";

/**
 * Sessions are stateless, signed HTTP-only cookies.
 *
 * The documented design is "OAuth only, no passwords, secure HTTP-only session
 * cookies". GitHub and Google OAuth live in ./oauth.ts; this module owns the
 * cookie itself, so it stays identical whichever provider signed the user in.
 */

const COOKIE_NAME = "fmt_session";
const SESSION_DAYS = 30;

type SessionPayload = { uid: string; iat: number; exp: number };

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set to a strong value in production");
    }
    return "findmyteammate-insecure-development-secret";
  }
  return secret;
}

function sign(body: string): string {
  return createHmac("sha256", getSecret()).update(body).digest("base64url");
}

export function createSessionToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    uid: userId,
    iat: now,
    exp: now + SESSION_DAYS * 86_400,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (!payload.uid || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Call from a route handler or server action after a successful sign-in. */
export async function startSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

async function readSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return readSessionToken(raw)?.uid ?? null;
}

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  image: string | null;
  role: string;
  availability: string;
  profileCompleteness: number;
  onboarded: boolean;
  unreadNotifications: number;
  pendingRequests: number;
};

/**
 * The signed-in user, or null. Memoised per request so that the header, page
 * and any nested component share one query.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const userId = await readSessionUserId();
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      image: true,
      role: true,
      availability: true,
      profileCompleteness: true,
      onboarded: true,
      lastActiveAt: true,
      _count: {
        select: {
          notifications: { where: { read: false } },
          inboxRequests: { where: { status: "PENDING" } },
        },
      },
    },
  });
  if (!user) return null;

  // Keep "recently active" meaningful for search ranking without writing on
  // every single request.
  if (Date.now() - user.lastActiveAt.getTime() > 30 * 60_000) {
    await db.user
      .update({ where: { id: user.id }, data: { lastActiveAt: new Date() } })
      .catch(() => undefined);
  }

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    image: user.image,
    role: user.role,
    availability: user.availability,
    profileCompleteness: user.profileCompleteness,
    onboarded: user.onboarded,
    unreadNotifications: user._count.notifications,
    pendingRequests: user._count.inboxRequests,
  };
});

/** For pages: sends visitors to the login screen, keeping where they came from. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login");
  }
  return user;
}

/** Like requireUser, but also insists the onboarding wizard is finished. */
export async function requireOnboardedUser(returnTo?: string): Promise<SessionUser> {
  const user = await requireUser(returnTo);
  if (!user.onboarded) redirect("/onboarding");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === "ADMIN";
}
