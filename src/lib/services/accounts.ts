import { HttpError } from "@/lib/api";
import { db } from "@/lib/db";
import { parseStudentEmail, studentEmailProblem } from "@/lib/amrita";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { RESERVED_USERNAMES } from "@/lib/validators";
import { issueOtp, verifyOtp } from "./otp";
import { vouchAcceptsEmail } from "./vouch";
import { hasApprovedAccess } from "./access-requests";

/**
 * Registration and sign-in for Amrita students.
 *
 * Access is limited to Amrita student addresses, and the address itself
 * supplies the campus, school, programme, branch and joining year — so there
 * is nothing to type and nothing to fake about which batch someone is in.
 */

/** Builds a readable username from the roll address, e.g. cse24535. */
async function usernameFromEmail(email: string): Promise<string> {
  const identity = parseStudentEmail(email);
  const base = identity
    ? `${identity.branchCode}${String(identity.joiningYear).slice(-2)}${identity.rollNumber}`
    : (email.split("@")[0] ?? "student").replace(/[^a-z0-9]/g, "");

  let candidate = base.slice(0, 24);
  if (RESERVED_USERNAMES.has(candidate) || candidate.length < 3) {
    candidate = `student${candidate}`.slice(0, 24);
  }

  for (let attempt = 0; attempt < 30; attempt++) {
    const taken = await db.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
    candidate = `${base.slice(0, 20)}${attempt + 2}`;
  }
  return `student${Date.now().toString().slice(-8)}`;
}

/** Academic fields derived from the address, ready to store on the user row. */
function academicFields(email: string) {
  const identity = parseStudentEmail(email);
  if (!identity) return {};

  return {
    campusCode: identity.campusCode,
    schoolCode: identity.schoolCode,
    programCode: identity.programCode,
    programYears: identity.programYears,
    branchCode: identity.branchCode,
    joiningYear: identity.joiningYear,
    rollNumber: identity.rollNumber,
    // Campus is effectively the college for an Amrita student.
    college: `Amrita Vishwa Vidyapeetham, ${identity.campus}`,
    location: identity.campus,
  };
}

export type SignupInput = {
  email: string;
  name: string;
  password: string;
  /** Client IP, for the per-network send limit. */
  ip?: string;
  /** A vouch link, if they arrived with one. Checked against this address. */
  vouchToken?: string;
};

/**
 * Step one of sign-up: validate, store the account as unverified, and email a
 * one-time code. Re-running it for an unverified address simply re-sends.
 */
/**
 * Whether this address may create an account at all.
 *
 * A usable vouch link bound to this exact roll, or an approved request naming
 * this exact address. Nothing else gets in.
 */
async function mayRegister(email: string, vouchToken?: string): Promise<boolean> {
  if (vouchToken) {
    const check = await vouchAcceptsEmail(vouchToken, email);
    if (check.ok) return true;
  }
  return hasApprovedAccess(email);
}

export async function startSignup(input: SignupInput) {
  const email = input.email.trim().toLowerCase();

  const emailProblem = studentEmailProblem(email);
  if (emailProblem) throw new HttpError(400, emailProblem);

  const pwProblem = passwordProblem(input.password);
  if (pwProblem) throw new HttpError(400, pwProblem);

  const name = input.name.trim();
  if (name.length < 2) throw new HttpError(400, "Enter your full name");

  // The gate. Enforced here rather than in the form, because the form is the
  // client and the client is never the authority: a hand-made POST must hit
  // the same wall as the sign-up page does.
  //
  // Two ways through, and an address needs exactly one of them. Both are
  // checked against this address specifically, so neither a link nor an
  // approval can be handed to someone else.
  if (!(await mayRegister(email, input.vouchToken))) {
    throw new HttpError(
      403,
      "FindMyTeammate is invite only. Ask someone already here to vouch for you, or request access and an admin will review it.",
    );
  }

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true, emailVerifiedAt: true, passwordHash: true },
  });

  if (existing?.emailVerifiedAt) {
    throw new HttpError(
      409,
      "That address is already registered. Sign in instead, or reset your password.",
    );
  }

  const passwordHash = await hashPassword(input.password);

  if (existing) {
    // An abandoned, unverified sign-up: update it and send a fresh code.
    await db.user.update({
      where: { id: existing.id },
      data: { name, passwordHash, ...academicFields(email) },
    });
  } else {
    await db.user.create({
      data: {
        email,
        name,
        username: await usernameFromEmail(email),
        passwordHash,
        onboarded: false,
        ...academicFields(email),
      },
    });
  }

  return issueOtp(email, "SIGNUP", input.ip);
}

/** Step two of sign-up: confirm the code and mark the address verified. */
export async function finishSignup(rawEmail: string, code: string) {
  const email = rawEmail.trim().toLowerCase();

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, emailVerifiedAt: true, onboarded: true },
  });
  if (!user) throw new HttpError(404, "Start by creating your account");

  if (user.emailVerifiedAt) {
    return { userId: user.id, onboarded: user.onboarded };
  }

  await verifyOtp(email, "SIGNUP", code);

  await db.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date(), lastActiveAt: new Date() },
  });

  return { userId: user.id, onboarded: user.onboarded };
}

/** Failures allowed before the account is locked, and for how long. */
const MAX_FAILED_LOGINS = 8;
const LOCKOUT_MINUTES = 15;

export async function signIn(rawEmail: string, password: string, ip?: string) {
  const email = rawEmail.trim().toLowerCase();

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      emailVerifiedAt: true,
      onboarded: true,
      failedLoginCount: true,
      lockedUntil: true,
    },
  });

  // Same message either way, so the form cannot be used to discover who has
  // an account here.
  const invalid = new HttpError(401, "That email address or password is not right");
  if (!user?.passwordHash) throw invalid;

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.max(
      1,
      Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000),
    );
    throw new HttpError(
      429,
      `Too many failed attempts. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}, or reset your password.`,
    );
  }

  const ok = await verifyPassword(password, user.passwordHash);

  if (!ok) {
    const failures = user.failedLoginCount + 1;
    const lock = failures >= MAX_FAILED_LOGINS;

    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: lock ? 0 : failures,
        lockedUntil: lock
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
          : null,
      },
    });

    if (lock) {
      throw new HttpError(
        429,
        `Too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes, or reset your password.`,
      );
    }
    throw invalid;
  }

  if (!user.emailVerifiedAt) {
    // Send a fresh code so the unverified route is actually completable.
    await issueOtp(email, "SIGNUP", ip).catch(() => undefined);
    throw new HttpError(
      403,
      "Your address is not confirmed yet. We have emailed you a new code.",
    );
  }

  await db.user.update({
    where: { id: user.id },
    // A successful sign-in clears the failure counter.
    data: { lastActiveAt: new Date(), failedLoginCount: 0, lockedUntil: null },
  });

  return { userId: user.id, onboarded: user.onboarded };
}

/** Password reset, step one. Never reveals whether the address exists. */
export async function startPasswordReset(rawEmail: string, ip?: string) {
  const email = rawEmail.trim().toLowerCase();

  const emailProblem = studentEmailProblem(email);
  if (emailProblem) throw new HttpError(400, emailProblem);

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    // Pretend to have sent one; the response is identical either way.
    return { expiresAt: new Date(Date.now() + 600_000), emailed: true };
  }

  return issueOtp(email, "RESET", ip);
}

/** Password reset, step two. */
export async function finishPasswordReset(
  rawEmail: string,
  code: string,
  newPassword: string,
) {
  const email = rawEmail.trim().toLowerCase();

  const pwProblem = passwordProblem(newPassword);
  if (pwProblem) throw new HttpError(400, pwProblem);

  await verifyOtp(email, "RESET", code);

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, onboarded: true },
  });
  if (!user) throw new HttpError(404, "No account for that address");

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      // Completing a reset proves control of the mailbox, and clears any lock.
      emailVerifiedAt: new Date(),
      lastActiveAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  return { userId: user.id, onboarded: user.onboarded };
}

/** Changing a password while signed in still requires the current one. */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const pwProblem = passwordProblem(newPassword);
  if (pwProblem) throw new HttpError(400, pwProblem);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) throw new HttpError(400, "No password is set on this account");

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw new HttpError(401, "Your current password is not right");

  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
}

// ---------------------------------------------------------------------------
// Admin: people
// ---------------------------------------------------------------------------

/** Everyone on the platform, for the admin people list. */
export async function listAllUsers() {
  return db.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      joinedVia: true,
      onboarded: true,
      emailVerifiedAt: true,
      createdAt: true,
      lastActiveAt: true,
      branchCode: true,
      joiningYear: true,
      profileCompleteness: true,
      _count: { select: { skills: true, vouchesWritten: true } },
    },
  });
}

/**
 * Removes an account and everything that belongs to it.
 *
 * Deliberately a hard delete rather than a flag. Twenty-three relations
 * cascade, so skills, roles, achievements, teams they led, requests,
 * notifications, reports, blocks, vouches and skill assessments all go with
 * them. There is no undo, which is why the caller shows a confirmation step.
 *
 * An admin cannot delete themselves. Nothing else in the app would stop the
 * last administrator removing their own access and locking the platform.
 */
export async function deleteUserAsAdmin(targetId: string, adminId: string) {
  if (targetId === adminId) {
    throw new HttpError(
      400,
      "You cannot delete your own account from here. Use settings if you really mean to.",
    );
  }

  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!target) throw new HttpError(404, "That account no longer exists");

  await db.user.delete({ where: { id: targetId } });
  return target;
}
