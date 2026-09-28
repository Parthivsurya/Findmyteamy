import type { Metadata } from "next";
import Link from "next/link";
import { btn } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { TeamForm } from "@/components/teams/team-form";
import { requireOnboardedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRoles, getSkills } from "@/lib/services/catalog";

export const metadata: Metadata = {
  title: "Create a team",
  description: "Start a team for an event and list the roles you need.",
};

export default async function NewTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { event: eventSlug } = await searchParams;
  await requireOnboardedUser("/teams/new");

  const [events, roles, skills] = await Promise.all([
    db.event.findMany({
      where: { status: "APPROVED", endDate: { gte: new Date() } },
      orderBy: { startDate: "asc" },
      select: { id: true, name: true, slug: true, maxTeamSize: true },
    }),
    getRoles(),
    getSkills(),
  ]);

  if (events.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          title="There are no upcoming events yet"
          description="Teams belong to an event, so add the hackathon first. It takes a minute and an admin reviews it."
          action={
            <Link href="/events/new" className={btn("primary", "md")}>
              List an event
            </Link>
          }
        />
      </div>
    );
  }

  const defaultEventId = eventSlug
    ? events.find((event) => event.slug === eventSlug)?.id
    : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Create a team</h1>
        <p className="mt-1.5 text-[0.9rem] text-ink-muted">
          You become the team leader. List the roles you are missing and people
          can be invited into them, or request to join one themselves.
        </p>
      </header>

      <Card>
        <CardBody className="p-5 sm:p-6">
          <TeamForm
            roles={roles}
            skills={skills}
            events={events}
            defaultEventId={defaultEventId}
          />
        </CardBody>
      </Card>
    </div>
  );
}
