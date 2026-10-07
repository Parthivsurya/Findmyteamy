import { randomBytes } from "node:crypto";
import { HttpError } from "@/lib/api";
import {
  addressMatchesRoll,
  formatShortRoll,
  parseShortRoll,
  parseStudentEmail,
} from "@/lib/amrita";
import { db } from "@/lib/db";
import { envNumber } from "@/lib/env";

/**
 * Vouching: how people get in.
 *
 * A member names another student by their short roll ("cse24535"), says why,
 * and gets a link. Only that student can redeem it, because redemption parses
 * the signing-up address and every identity part must match. That binding is
 * the entire security model, which is why a link being forwarded,
 * screenshotted or pasted into a group chat does not matter.
 *
 * There is deliberately no trust score. An earlier design inherited one down
 * the tree, which measured friendship rather than skill and compounded its own
 * error at every hop. A sentence a reader can weigh beats a number they cannot
 * inspect, so the statement is the feature and the graph is only provenance.
 */

/** Live vouches one member may have outstanding per day. */
const dailyLimit = () => envNumber("VOUCH_DAILY_LIMIT", 3);
/** How long an unredeemed link stays usable. Tidiness, not safety. */
const linkDays = () => envNumber("VOUCH_LINK_DAYS", 21);

const MIN_STATEMENT = 20;
const MAX_STATEMENT = 400;

function newToken(): string {
  return randomBytes(16).toString("base64url");
}

export type BoundIdentity = {
  campusCode: string;
  schoolCode: string;
  branchCode: string;
  joiningYear: number;
  rollNumber: string;
};

/**
 * Turns what the voucher typed into the identity actually stored.
 *
 * The short roll carries branch, year and roll but not campus or school, and
 * it is not unique without them: cse24535 exists at Coimbatore and at
 * Amritapuri alike. Those two default to the voucher's own, because people
 * vouch for classmates, and are overridable for the rare cross-campus case.
 */
export function bindRoll(
  shortRoll: string,
  voucher: { campusCode: string | null; schoolCode: string | null },
  override?: { campusCode?: string; schoolCode?: string },
): BoundIdentity {
  const parsed = parseShortRoll(shortRoll);
  if (!parsed) {
    throw new HttpError(
      400,
      "That does not look like a roll number. Use the form cse24535.",
    );
  }

  const campusCode = override?.campusCode ?? voucher.campusCode;
  const schoolCode = override?.schoolCode ?? voucher.schoolCode;
  if (!campusCode || !schoolCode) {
    throw new HttpError(
      400,
      "Your own campus could not be read, so a roll cannot be matched against it.",
    );
  }

  return { campusCode, schoolCode, ...parsed };
}

// ---------------------------------------------------------------------------
// Writing a vouch
// ---------------------------------------------------------------------------

export async function createVouch(input: {
  voucherId: string;
  shortRoll: string;
  statement: string;
  campusCode?: string;
  schoolCode?: string;
  /** Admins planting a founding member: no statement, and the account is a root. */
  kind?: "MEMBER" | "ADMIN_SEED";
}) {
  const kind = input.kind ?? "MEMBER";

  const voucher = await db.user.findUnique({
    where: { id: input.voucherId },
    select: { id: true, campusCode: true, schoolCode: true, role: true },
  });
  if (!voucher) throw new HttpError(404, "That account does not exist");
  if (kind === "ADMIN_SEED" && voucher.role !== "ADMIN") {
    throw new HttpError(403, "Only an admin can add a founding member");
  }

  const bound = bindRoll(input.shortRoll, voucher, {
    campusCode: input.campusCode,
    schoolCode: input.schoolCode,
  });

  const statement = input.statement?.trim() ?? "";
  if (kind === "MEMBER") {
    if (statement.length < MIN_STATEMENT) {
      throw new HttpError(
        400,
        `Say why you are vouching for them, in at least ${MIN_STATEMENT} characters. "Good developer" is not useful to anyone reading it.`,
      );
    }
    if (statement.length > MAX_STATEMENT) {
      throw new HttpError(400, "That statement is too long.");
    }
    // A statement is read as the voucher's own words, so it stays plain text.
    if (/https?:\/\//i.test(statement)) {
      throw new HttpError(400, "Statements cannot contain links.");
    }
  }

  // Vouching yourself is the obvious hole.
  const self = await db.user.findFirst({
    where: {
      id: voucher.id,
      campusCode: bound.campusCode,
      schoolCode: bound.schoolCode,
      branchCode: bound.branchCode,
      joiningYear: bound.joiningYear,
      rollNumber: bound.rollNumber,
    },
    select: { id: true },
  });
  if (self) throw new HttpError(400, "You cannot vouch for yourself");

  // Already a member: this is not an invitation, and saying so is clearer than
  // creating a link that can never be redeemed.
  const existing = await db.user.findFirst({
    where: {
      campusCode: bound.campusCode,
      schoolCode: bound.schoolCode,
      branchCode: bound.branchCode,
      joiningYear: bound.joiningYear,
      rollNumber: bound.rollNumber,
    },
    select: { id: true, name: true, username: true },
  });
  if (existing) {
    throw new HttpError(
      409,
      `${existing.name} is already on FindMyTeammate.`,
    );
  }

  if (kind === "MEMBER") {
    const since = new Date(Date.now() - 86_400_000);
    const today = await db.vouch.count({
      where: { voucherId: voucher.id, kind: "MEMBER", createdAt: { gte: since } },
    });
    if (today >= dailyLimit()) {
      throw new HttpError(
        429,
        "You have written enough vouches today. Try again tomorrow.",
      );
    }

    const duplicate = await db.vouch.findFirst({
      where: {
        voucherId: voucher.id,
        status: "PENDING",
        campusCode: bound.campusCode,
        schoolCode: bound.schoolCode,
        branchCode: bound.branchCode,
        joiningYear: bound.joiningYear,
        rollNumber: bound.rollNumber,
      },
      select: { id: true, token: true },
    });
    if (duplicate) {
      throw new HttpError(
        409,
        "You already have a link waiting for that roll number.",
      );
    }
  }

  return db.vouch.create({
    data: {
      token: newToken(),
      kind,
      voucherId: voucher.id,
      ...bound,
      statement: kind === "MEMBER" ? statement : null,
      expiresAt: new Date(Date.now() + linkDays() * 86_400_000),
    },
    select: { id: true, token: true, kind: true, rollNumber: true },
  });
}

// ---------------------------------------------------------------------------
// Redeeming
// ---------------------------------------------------------------------------

/** Reads a link for the sign-up screen, so the person sees what is said about them. */
export async function getVouchByToken(token: string) {
  const vouch = await db.vouch.findUnique({
    where: { token },
    select: {
      id: true,
      kind: true,
      status: true,
      statement: true,
      expiresAt: true,
      campusCode: true,
      schoolCode: true,
      branchCode: true,
      joiningYear: true,
      rollNumber: true,
      voucher: { select: { name: true, username: true, image: true } },
    },
  });
  if (!vouch) return null;
  if (vouch.status !== "PENDING") return { ...vouch, usable: false as const };
  if (vouch.expiresAt && vouch.expiresAt.getTime() < Date.now()) {
    return { ...vouch, usable: false as const };
  }
  return { ...vouch, usable: true as const };
}

/**
 * Whether this address may use this link.
 *
 * Called before an account is created, so a mismatch costs the real recipient
 * nothing: the link is not consumed and they can still use it.
 */
export async function vouchAcceptsEmail(token: string, email: string) {
  const vouch = await getVouchByToken(token);
  if (!vouch || !vouch.usable) {
    return { ok: false as const, reason: "That link is no longer usable." };
  }

  const identity = parseStudentEmail(email);
  if (!identity) {
    return { ok: false as const, reason: "That is not an Amrita student address." };
  }
  if (!addressMatchesRoll(identity, vouch)) {
    return {
      ok: false as const,
      reason: `That link was created for ${formatShortRoll(vouch)}, which is not your roll number.`,
    };
  }
  return { ok: true as const, vouch };
}

/**
 * Attaches the vouch once the address is verified, not when the form is
 * submitted. An abandoned sign-up therefore leaves the link usable.
 */
export async function redeemVouch(token: string, userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true },
  });

  const check = await vouchAcceptsEmail(token, user.email);
  if (!check.ok) throw new HttpError(409, check.reason);

  const isSeed = check.vouch.kind === "ADMIN_SEED";

  await db.$transaction([
    db.vouch.update({
      where: { id: check.vouch.id },
      data: { status: "REDEEMED", subjectId: userId, redeemedAt: new Date() },
    }),
    db.user.update({
      where: { id: userId },
      // ADMIN rather than SEED: both are roots of the forest, but they mean
      // different things. SEED is an account that predates vouching; ADMIN is
      // someone a named administrator let in deliberately, and that should be
      // visible on their profile rather than blurred into the founding batch.
      data: { joinedVia: isSeed ? "ADMIN" : "VOUCH" },
    }),
  ]);

  return { kind: check.vouch.kind };
}

// ---------------------------------------------------------------------------
// After the fact
// ---------------------------------------------------------------------------

/**
 * Withdrawing a statement never removes the account.
 *
 * If it did, a vouch would be a hostage: anyone who brought you in could throw
 * you out. The statement goes, the membership stays.
 */
export async function revokeVouch(vouchId: string, voucherId: string) {
  const vouch = await db.vouch.findUnique({
    where: { id: vouchId },
    select: { id: true, voucherId: true, status: true },
  });
  if (!vouch) throw new HttpError(404, "That vouch no longer exists");
  if (vouch.voucherId !== voucherId) {
    throw new HttpError(403, "Only the person who wrote it can withdraw it");
  }
  if (vouch.status === "REVOKED") return vouch;

  // The account stays, but it is no longer anyone's child, so the recorded
  // route has to stop saying it was vouched for. Without this the forest shows
  // them as a root while their profile claims a voucher.
  const updated = await db.vouch.update({
    where: { id: vouchId },
    data: { status: "REVOKED", statement: null },
    select: { id: true, voucherId: true, status: true, subjectId: true },
  });

  if (updated.subjectId) {
    const stillVouched = await db.vouch.count({
      where: { subjectId: updated.subjectId, kind: "MEMBER", status: "REDEEMED" },
    });
    if (stillVouched === 0) {
      await db.user.update({
        where: { id: updated.subjectId },
        data: { joinedVia: "WITHDRAWN" },
      });
    }
  }

  return updated;
}

/** The subject hides a statement written about them. Admins still see it. */
export async function setVouchHidden(
  vouchId: string,
  subjectId: string,
  hidden: boolean,
) {
  const vouch = await db.vouch.findUnique({
    where: { id: vouchId },
    select: { id: true, subjectId: true },
  });
  if (!vouch) throw new HttpError(404, "That vouch no longer exists");
  if (vouch.subjectId !== subjectId) {
    throw new HttpError(403, "That vouch is not about you");
  }

  return db.vouch.update({
    where: { id: vouchId },
    data: { hiddenBySubject: hidden },
    select: { id: true, hiddenBySubject: true },
  });
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** Statements about one student, for their profile. */
export async function listVouchesFor(
  subjectId: string,
  options: { includeHidden?: boolean } = {},
) {
  const rows = await db.vouch.findMany({
    where: {
      subjectId,
      kind: "MEMBER",
      status: "REDEEMED",
      statement: { not: null },
      ...(options.includeHidden ? {} : { hiddenBySubject: false }),
    },
    // Ordering happens below, in application code, NOT in the query.
    //
    // Verified endorsements carry a teamId and unverified vouches do not, so
    // sorting on `teamId: "desc"` looks like the obvious way to float the
    // verified ones. It is wrong, and wrong differently in each database:
    // SQLite puts NULLs last on a descending sort, PostgreSQL puts them
    // first. That would have passed every local test and silently inverted
    // the order in production.
    orderBy: { redeemedAt: "desc" },
    select: {
      id: true,
      statement: true,
      hiddenBySubject: true,
      redeemedAt: true,
      team: { select: { id: true, event: { select: { name: true, slug: true } } } },
      voucher: { select: { name: true, username: true, image: true } },
    },
  });

  // Verified first, then newest, with no reliance on how NULLs sort.
  return rows.sort((a, b) => {
    const verified = Number(Boolean(b.team)) - Number(Boolean(a.team));
    if (verified !== 0) return verified;
    return (b.redeemedAt?.getTime() ?? 0) - (a.redeemedAt?.getTime() ?? 0);
  });
}

/** Links this member has written, for their own settings screen. */
export async function listVouchesBy(voucherId: string) {
  return db.vouch.findMany({
    where: { voucherId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      token: true,
      kind: true,
      status: true,
      statement: true,
      branchCode: true,
      joiningYear: true,
      rollNumber: true,
      createdAt: true,
      expiresAt: true,
      subject: { select: { name: true, username: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// The forest, for the admin panel
// ---------------------------------------------------------------------------

export type VouchNode = {
  id: string;
  name: string;
  username: string;
  image: string | null;
  joinedVia: string;
  /** The statement that brought them in, if a member vouched for them. */
  statement: string | null;
  depth: number;
  /** How many accounts descend from this one, at any depth. */
  descendants: number;
  children: VouchNode[];
};

/**
 * The whole vouch graph, as a forest.
 *
 * Deliberately one flat query and an in-memory build rather than a recursive
 * query or a graph database. Each account has at most one voucher, so this is
 * a forest of parent pointers, not a many-to-many graph, and a single campus
 * tops out in the low thousands. At that size a second database would cost a
 * network round trip, another thing to host and back up, and a copy of this
 * data to keep in sync, in exchange for nothing.
 *
 * Roots are accounts nobody vouched for: the original members, anyone an admin
 * planted as a founding member, and anyone approved from the request queue.
 */
export async function buildVouchForest(): Promise<{
  roots: VouchNode[];
  totals: { accounts: number; vouched: number; roots: number; deepest: number };
}> {
  const [users, edges] = await Promise.all([
    db.user.findMany({
      select: { id: true, name: true, username: true, image: true, joinedVia: true },
      orderBy: { createdAt: "asc" },
    }),
    db.vouch.findMany({
      where: { kind: "MEMBER", status: "REDEEMED", subjectId: { not: null } },
      select: { voucherId: true, subjectId: true, statement: true },
    }),
  ]);

  const nodes = new Map<string, VouchNode>(
    users.map((u) => [
      u.id,
      { ...u, statement: null, depth: 0, descendants: 0, children: [] },
    ]),
  );

  // One pass to attach children. A subject with no surviving voucher simply
  // stays a root, which is what should happen when a voucher deletes their
  // account.
  const hasParent = new Set<string>();
  for (const edge of edges) {
    const child = edge.subjectId ? nodes.get(edge.subjectId) : undefined;
    const parent = nodes.get(edge.voucherId);
    if (!child || !parent || child.id === parent.id) continue;
    child.statement = edge.statement;
    parent.children.push(child);
    hasParent.add(child.id);
  }

  const roots = users
    .filter((u) => !hasParent.has(u.id))
    .map((u) => nodes.get(u.id)!)
    .filter(Boolean);

  // Depth and subtree size, iteratively. A cycle cannot occur through the
  // normal flow, but a guard costs nothing and a stack overflow in the admin
  // panel would be a poor way to find out otherwise.
  let deepest = 0;
  const seen = new Set<string>();
  const walk = (node: VouchNode, depth: number): number => {
    if (seen.has(node.id)) return 0;
    seen.add(node.id);
    node.depth = depth;
    deepest = Math.max(deepest, depth);
    let count = 0;
    for (const child of node.children) count += 1 + walk(child, depth + 1);
    node.descendants = count;
    return count;
  };
  for (const root of roots) walk(root, 0);

  return {
    roots,
    totals: {
      accounts: users.length,
      vouched: hasParent.size,
      roots: roots.length,
      deepest,
    },
  };
}

/**
 * Links that have been created but not yet used.
 *
 * Shown in the admin panel so a link is never lost by navigating away from
 * the screen that made it. Without this the only copy of a fresh token lived
 * in one render of one form.
 */
export async function listPendingVouchLinks() {
  return db.vouch.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      token: true,
      kind: true,
      branchCode: true,
      joiningYear: true,
      rollNumber: true,
      createdAt: true,
      expiresAt: true,
      voucher: { select: { name: true, username: true } },
    },
  });
}
