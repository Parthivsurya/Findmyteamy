import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { btn } from "@/components/ui/button";
import { Card, CardBody, CardHead, SectionTitle } from "@/components/ui/card";
import { SlotProgress } from "@/components/ui/meter";
import { RoleChip, SkillChip } from "@/components/profile/skills";
import { RequestForm } from "@/components/teams/request-form";
import {
  CancelButton,
  ReleaseSlotButton,
  RespondButtons,
} from "@/components/teams/respond-buttons";
import {
  CalendarIcon,
  CheckIcon,
  ShieldIcon,
  SparklesIcon,
  UsersIcon,
} from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import { getTeam } from "@/lib/services/teams";
import { formatDateRange, relativeTime } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) return { title: "Team not found" };
  return {
    title: `${team.name} · ${team.event.name}`,
    description: team.idea ?? `${team.name}, a team for ${team.event.name}.`,
  };
}

export default async function TeamPage({ params }: Props) {
  const { id } = await params;
  const [team, viewer] = await Promise.all([getTeam(id), getCurrentUser()]);

  if (!team) notFound();

  const isLeader = viewer?.id === team.leaderId;
  const filledSlots = team.slots.filter((slot) => slot.filledBy);
  const openSlots = team.slots.filter((slot) => !slot.filledBy);
  const isMember =
    isLeader || filledSlots.some((slot) => slot.filledById === viewer?.id);

  const pendingRequests = team.requests.filter((r) => r.status === "PENDING");
  // Requests addressed to the viewer (invites), and ones they sent.
  const myIncoming = pendingRequests.filter((r) => r.toUserId === viewer?.id);
  const mySent = pendingRequests.filter((r) => r.fromUserId === viewer?.id);
  const leaderInbox = isLeader
    ? pendingRequests.filter((r) => r.toUserId === team.leaderId)
    : [];

  const members = [
    {
      slotId: null as string | null,
      role: "Team lead",
      user: team.leader,
    },
    ...filledSlots.map((slot) => ({
      slotId: slot.id,
      role: slot.role.name,
      user: slot.filledBy!,
    })),
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* --------------------------------------------------------- header */}
      <Card className="overflow-hidden">
        <div className="brand-gradient h-1.5" aria-hidden />
        <CardBody className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{team.name}</h1>
                {team.isComplete ? (
                  <Badge tone="ok">
                    <CheckIcon className="size-3" />
                    Complete
                  </Badge>
                ) : (
                  <Badge tone="warn">Recruiting</Badge>
                )}
              </div>

              <Link
                href={`/events/${team.event.slug}`}
                className="mt-1.5 inline-flex items-center gap-1.5 text-[0.85rem] font-medium text-brand hover:underline"
              >
                <CalendarIcon className="size-3.5" />
                {team.event.name}
              </Link>
              <p className="mt-0.5 text-[0.78rem] text-ink-muted">
                {formatDateRange(team.event.startDate, team.event.endDate)} ·
                teams of {team.event.minTeamSize}–{team.event.maxTeamSize}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <SlotProgress filled={filledSlots.length} total={team.slots.length} />
              {isLeader && openSlots.length ? (
                <Link
                  href={`/team-builder?team=${team.id}`}
                  className={btn("primary", "md")}
                >
                  <SparklesIcon className="size-4" />
                  Find candidates
                </Link>
              ) : null}
            </div>
          </div>

          {team.idea ? (
            <p className="mt-4 max-w-3xl whitespace-pre-line text-[0.92rem] leading-relaxed text-ink-2">
              {team.idea}
            </p>
          ) : null}
        </CardBody>
      </Card>

      {/* an invite waiting for this viewer */}
      {myIncoming.length ? (
        <Card className="mt-6 border-brand/40">
          <CardHead
            title="You have been invited to this team"
            description="Accepting shares contact details between you and the team."
          />
          <CardBody className="space-y-3">
            {myIncoming.map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-[0.87rem]">
                    <strong>{request.slot?.role.name ?? "Team member"}</strong> ·
                    invited by {request.fromUser.name}
                  </p>
                  {request.message ? (
                    <p className="mt-1.5 rounded-lg bg-surface-2 px-3 py-2 text-[0.83rem] text-ink-2">
                      “{request.message}”
                    </p>
                  ) : null}
                </div>
                <RespondButtons requestId={request.id} />
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* ------------------------------------------------------ members */}
          <section>
            <SectionTitle>
              Members
              <Badge tone="neutral" className="ml-2">
                {members.length} of {team.slots.length + 1}
              </Badge>
            </SectionTitle>

            <Card>
              <CardBody className="divide-y divide-[var(--line)] p-0">
                {members.map((member) => (
                  <div
                    key={member.user.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3"
                  >
                    <Avatar name={member.user.name} image={member.user.image} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/u/${member.user.username}`}
                        className="block truncate text-[0.88rem] font-semibold hover:text-brand"
                      >
                        {member.user.name}
                        {member.user.id === viewer?.id ? (
                          <span className="ml-1.5 text-[0.75rem] font-normal text-ink-muted">
                            (you)
                          </span>
                        ) : null}
                      </Link>
                      <p className="truncate text-[0.75rem] text-ink-muted">
                        {member.role}
                        {member.user.college ? ` · ${member.user.college}` : ""}
                      </p>
                      {/* Teammates can see each other's contact details. */}
                      {isMember ? (
                        <p className="truncate text-[0.75rem] text-ink-2">
                          {member.user.email}
                        </p>
                      ) : null}
                    </div>

                    {isLeader && member.slotId ? (
                      <ReleaseSlotButton
                        slotId={member.slotId}
                        teamId={team.id}
                        label="Remove"
                      />
                    ) : null}
                    {!isLeader && member.slotId && member.user.id === viewer?.id ? (
                      <ReleaseSlotButton
                        slotId={member.slotId}
                        teamId={team.id}
                        label="Leave team"
                      />
                    ) : null}
                  </div>
                ))}
              </CardBody>
            </Card>

            {!isMember ? (
              <p className="mt-2 flex items-start gap-2 text-[0.78rem] text-ink-muted">
                <ShieldIcon className="mt-0.5 size-3.5 shrink-0" />
                Contact details are visible to teammates only.
              </p>
            ) : null}
          </section>

          {/* --------------------------------------------------- open roles */}
          <section>
            <SectionTitle>Open roles</SectionTitle>

            {openSlots.length === 0 ? (
              <Card>
                <CardBody className="flex items-center gap-2 text-[0.85rem] text-ok">
                  <CheckIcon className="size-4" />
                  Every role is filled — this team is complete.
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-3">
                {openSlots.map((slot) => (
                  <Card key={slot.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <RoleChip name={slot.role.name} />
                          {slot.requiredSkills.map((skill) => (
                            <SkillChip key={skill.id} name={skill.name} />
                          ))}
                        </div>
                        {slot.note ? (
                          <p className="mt-2 text-[0.83rem] text-ink-muted">
                            {slot.note}
                          </p>
                        ) : null}
                      </div>

                      {isLeader ? (
                        <Link
                          href={`/team-builder?team=${team.id}`}
                          className={btn("secondary", "sm")}
                        >
                          Find candidates
                        </Link>
                      ) : null}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* --------------------------------- leader inbox: join requests */}
          {leaderInbox.length ? (
            <section>
              <SectionTitle>
                Join requests
                <Badge tone="brand" className="ml-2">
                  {leaderInbox.length}
                </Badge>
              </SectionTitle>

              <div className="space-y-3">
                {leaderInbox.map((request) => (
                  <Card key={request.id} className="p-4">
                    <div className="flex flex-wrap items-start gap-3">
                      <Avatar
                        name={request.fromUser.name}
                        image={request.fromUser.image}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.88rem]">
                          <Link
                            href={`/u/${request.fromUser.username}`}
                            className="font-semibold hover:text-brand"
                          >
                            {request.fromUser.name}
                          </Link>{" "}
                          <span className="text-ink-muted">
                            wants {request.slot?.role.name ?? "a place"}
                          </span>
                        </p>
                        <p className="text-[0.75rem] text-ink-muted">
                          {relativeTime(request.createdAt)}
                        </p>
                        {request.message ? (
                          <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-[0.83rem] leading-relaxed text-ink-2">
                            “{request.message}”
                          </p>
                        ) : null}
                      </div>
                      <RespondButtons requestId={request.id} />
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* ------------------------------------------------------ side rail */}
        <aside className="space-y-5">
          {!isMember && viewer && openSlots.length && !team.isComplete ? (
            <Card>
              <CardHead
                title="Request to join"
                description="The team leader decides."
              />
              <CardBody>
                {mySent.length ? (
                  <div className="space-y-2">
                    <p className="text-[0.85rem] text-ink-2">
                      Your request for{" "}
                      <strong>{mySent[0]!.slot?.role.name ?? "a place"}</strong> is
                      waiting for a reply.
                    </p>
                    <CancelButton requestId={mySent[0]!.id} />
                  </div>
                ) : (
                  <RequestForm
                    type="JOIN_REQUEST"
                    teams={[
                      {
                        id: team.id,
                        name: team.name,
                        eventName: team.event.name,
                        slots: openSlots.map((slot) => ({
                          id: slot.id,
                          roleName: slot.role.name,
                          requiredSkills: slot.requiredSkills.map((s) => s.name),
                        })),
                      },
                    ]}
                    defaultTeamId={team.id}
                    submitLabel="Send join request"
                    placeholder="Why you fit this role, and what you would build first."
                  />
                )}
              </CardBody>
            </Card>
          ) : null}

          {!viewer ? (
            <Card>
              <CardBody className="space-y-2.5">
                <p className="text-[0.85rem] text-ink-muted">
                  Sign in to request a place on this team.
                </p>
                <Link
                  href={`/login?next=/teams/${team.id}`}
                  className={btn("primary", "md", "w-full")}
                >
                  Sign in
                </Link>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHead title="Team lead" />
            <CardBody>
              <div className="flex items-center gap-3">
                <Avatar name={team.leader.name} image={team.leader.image} size="md" />
                <div className="min-w-0">
                  <Link
                    href={`/u/${team.leader.username}`}
                    className="block truncate font-semibold hover:text-brand"
                  >
                    {team.leader.name}
                  </Link>
                  <p className="truncate text-[0.78rem] text-ink-muted">
                    {team.leader.college ?? `@${team.leader.username}`}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Event" />
            <CardBody className="space-y-2 text-[0.85rem]">
              <Link
                href={`/events/${team.event.slug}`}
                className="block font-semibold text-brand hover:underline"
              >
                {team.event.name}
              </Link>
              <p className="text-ink-muted">{team.event.organizer}</p>
              <p className="flex items-center gap-1.5 text-ink-2">
                <UsersIcon className="size-3.5" />
                Teams of {team.event.minTeamSize}–{team.event.maxTeamSize}
              </p>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
