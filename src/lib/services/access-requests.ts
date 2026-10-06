import { HttpError } from "@/lib/api";
import { studentEmailProblem } from "@/lib/amrita";
import { db } from "@/lib/db";

/**
 * The way in for a student with no vouch link.
 *
 * Invite-only on its own filters hardest against the people with the most to
 * gain: a final year who knows forty classmates already has a team, while a
 * first year who knows nobody is exactly who needs a teammate finder. This is
 * the escape hatch that stops the gate inverting the product's purpose.
 *
 * It is about accountability rather than identity. An Amrita address already
 * proves the person is a student, so approving is a human saying "yes, let
 * them in", not a check on who they are.
 */

/**
 * Nothing here ever reveals whether an address already has an account.
 *
 * Submitting twice, or submitting for someone who is already a member, gives
 * the same answer as a fresh request. Otherwise this form becomes a way to
 * test whether any given roll address is registered, which is exactly the
 * enumeration the privacy work closed off elsewhere.
 */
export async function submitAccessRequest(input: {
  email: string;
  note?: string;
}) {
  const email = input.email.trim().toLowerCase();

  const problem = studentEmailProblem(email);
  if (problem) throw new HttpError(400, problem);

  const [member, pending] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { id: true } }),
    db.accessRequest.findFirst({
      where: { email, status: "PENDING" },
      select: { id: true },
    }),
  ]);

  // Already a member, or already asked: record nothing new, say the same thing.
  if (member || pending) return { recorded: false as const };

  await db.accessRequest.create({
    data: { email, note: input.note?.trim() || null },
  });
  return { recorded: true as const };
}

export async function listAccessRequests(status = "PENDING") {
  return db.accessRequest.findMany({
    where: { status },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      email: true,
      note: true,
      status: true,
      createdAt: true,
      decidedAt: true,
      decisionNote: true,
      decidedBy: { select: { name: true, username: true } },
    },
  });
}

export async function countPendingAccessRequests() {
  return db.accessRequest.count({ where: { status: "PENDING" } });
}

/**
 * Approving records the decision. It does not create an account: the person
 * still signs up and verifies their own address, so approval is permission
 * rather than impersonation.
 */
export async function decideAccessRequest(input: {
  requestId: string;
  deciderId: string;
  decision: "APPROVE" | "DECLINE";
  decisionNote?: string;
}) {
  const request = await db.accessRequest.findUnique({
    where: { id: input.requestId },
    select: { id: true, email: true, status: true },
  });
  if (!request) throw new HttpError(404, "That request no longer exists");
  if (request.status !== "PENDING") {
    throw new HttpError(409, "That request has already been decided");
  }

  return db.accessRequest.update({
    where: { id: request.id },
    data: {
      status: input.decision === "APPROVE" ? "APPROVED" : "DECLINED",
      decidedById: input.deciderId,
      decidedAt: new Date(),
      decisionNote: input.decisionNote?.trim() || null,
    },
    select: { id: true, email: true, status: true },
  });
}

/**
 * Whether this address may sign up without a vouch link.
 *
 * Checked at sign-up rather than trusted from the admin screen, so an approval
 * cannot be transferred: the approval names one address and only that address
 * passes.
 */
export async function hasApprovedAccess(email: string): Promise<boolean> {
  const approved = await db.accessRequest.findFirst({
    where: { email: email.trim().toLowerCase(), status: "APPROVED" },
    select: { id: true },
  });
  return Boolean(approved);
}
