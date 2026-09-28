import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { btn } from "@/components/ui/button";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { AvailabilityBadge } from "@/components/profile/availability";
import { RoleChip, SkillChip } from "@/components/profile/skills";
import { RequestForm, type RequestFormTeam } from "@/components/teams/request-form";
import { UsersIcon, VerifiedIcon } from "@/components/icons";
import { requireOnboardedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Invite to a team",
  robots: { index: false },
};

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ team?: string; slot?: string; event?: string }>;
}) {
  const { username } = await params;
  const { team: teamParam, slot: slotParam, event: eventSlug } = await searchParams;

  const viewer = await requireOnboardedUser(`/invite/${username}`);

  const candidate = await db.user.findUnique({
    where: { username: username.toLowerCase() },
    include: {
      skills: { include: { skill: { select: { id: true, name: true } } } },
      roles: { include: { role: { select: { name: true } } } },
      _count: { select: { achievements: { where: { status: "VERIFIED" } } } },
    },
  });

  if (!candidate) notFound();
  if (candidate.id === viewer.id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          title="That is your own profile"
          description="Invite someone else to one of your teams."
          action={
            <Link href="/search" className={btn("primary", "md")}>
              Find people
            </Link>
          }
        />
      </div>
    );
  }

  // Teams this person leads that still have an open slot.
  const myTeams = await db.team.findMany({
    where: {
      leaderId: viewer.id,
      isComplete: false,
      slots: { some: { filledById: null } },
    },
    include: {
      event: { select: { id: true, name: true, slug: true } },
      slots: {
        where: { filledById: null },
        include: {
          role: { select: { name: true } },
          requiredSkills: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formTeams: RequestFormTeam[] = myTeams.map((team) => ({
    id: team.id,
    name: team.name,
    eventName: team.event.name,
    slots: team.slots.map((slot) => ({
      id: slot.id,
      roleName: slot.role.name,
      requiredSkills: slot.requiredSkills.map((s) => s.name),
    })),
  }));

  const alreadyPending = await db.teamRequest.findFirst({
    where: {
      status: "PENDING",
      OR: [
        { fromUserId: viewer.id, toUserId: candidate.id },
        { fromUserId: candidate.id, toUserId: viewer.id },
      ],
    },
    include: { team: { select: { id: true, name: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Invite {candidate.name.split(" ")[0]}</h1>
        <p className="mt-1.5 text-[0.9rem] text-ink-muted">
          Pick the open role you want them for and say a little about the
          project. They will get a notification and an email.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <Card>
          <CardHead
            title={
              formTeams.length
                ? "Send the invite"
                : "You need a team with an open role first"
            }
            description={
              formTeams.length
                ? `${candidate.name} will be able to accept or decline.`
                : undefined
            }
          />
          <CardBody>
            {alreadyPending ? (
              <div className="mb-4 rounded-box border border-warn/30 bg-warn-soft px-3.5 py-2.5 text-[0.83rem] text-warn">
                There is already a pending request between you two for{" "}
                <Link
                  href={`/teams/${alreadyPending.team.id}`}
                  className="font-semibold underline"
                >
                  {alreadyPending.team.name}
                </Link>
                . Wait for a reply before sending another.
              </div>
            ) : null}

            {formTeams.length === 0 ? (
              <div className="space-y-4">
                <p className="text-[0.87rem] leading-relaxed text-ink-2">
                  Invites go into a specific role slot on a team, so create a
                  team for the event first and list the roles you are missing.
                  It takes a minute.
                </p>
                <Link
                  href={
                    eventSlug ? `/teams/new?event=${eventSlug}` : "/teams/new"
                  }
                  className={btn("primary", "md")}
                >
                  Create a team
                </Link>
              </div>
            ) : (
              <RequestForm
                type="INVITE"
                teams={formTeams}
                toUserId={candidate.id}
                defaultTeamId={teamParam}
                defaultSlotId={slotParam}
                submitLabel={`Send invite to ${candidate.name.split(" ")[0]}`}
                placeholder={`Hi ${candidate.name.split(" ")[0]}, we are building… and your work on… is exactly what we need.`}
              />
            )}
          </CardBody>
        </Card>

        {/* who you are inviting */}
        <Card className="h-fit">
          <CardBody>
            <div className="flex items-center gap-3">
              <Avatar name={candidate.name} image={candidate.image} size="md" />
              <div className="min-w-0">
                <Link
                  href={`/u/${candidate.username}`}
                  className="block truncate font-semibold hover:text-brand"
                >
                  {candidate.name}
                </Link>
                <p className="truncate text-[0.78rem] text-ink-muted">
                  {candidate.college ?? `@${candidate.username}`}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <AvailabilityBadge availability={candidate.availability} short />
              {candidate._count.achievements > 0 ? (
                <Badge tone="ok">
                  <VerifiedIcon className="size-3" />
                  {candidate._count.achievements} verified
                </Badge>
              ) : null}
            </div>

            {candidate.roles.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {candidate.roles.map((entry) => (
                  <RoleChip key={entry.role.name} name={entry.role.name} />
                ))}
              </div>
            ) : null}

            {candidate.skills.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {candidate.skills.slice(0, 8).map((entry) => (
                  <SkillChip
                    key={entry.skill.id}
                    name={entry.skill.name}
                    level={entry.level}
                  />
                ))}
              </div>
            ) : null}

            {candidate.bio ? (
              <p className="mt-3 border-t border-line pt-3 text-[0.83rem] leading-relaxed text-ink-muted">
                {candidate.bio}
              </p>
            ) : null}

            <Link
              href={`/u/${candidate.username}`}
              className={btn("outline", "sm", "mt-4 w-full")}
            >
              <UsersIcon className="size-4" />
              Full profile
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
