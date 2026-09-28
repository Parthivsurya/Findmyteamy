import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { btn } from "@/components/ui/button";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { SkillCheckForm } from "@/components/settings/skill-check";
import { requireOnboardedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSkillCheckEnabled } from "@/lib/services/skill-assessment";

export const metadata: Metadata = { title: "Skill check", robots: { index: false } };

export default async function SkillCheckPage({
  params,
}: {
  params: Promise<{ skillId: string }>;
}) {
  const { skillId } = await params;
  const user = await requireOnboardedUser("/settings/skills");

  const claim = await db.userSkill.findUnique({
    where: { userId_skillId: { userId: user.id, skillId } },
    include: { skill: { select: { id: true, name: true } } },
  });
  if (!claim) notFound();

  if (!isSkillCheckEnabled()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <EmptyState
          title="Skill checks are not switched on"
          description="This deployment has neither TYPESAFE_API_KEY nor OPENROUTER_API_KEY configured, so answers cannot be judged."
          action={
            <Link href="/settings/skills" className={btn("outline", "md")}>
              Back to skills
            </Link>
          }
        />
      </div>
    );
  }

  // The open attempt is created by the action before redirecting here, so a
  // direct visit with nothing pending goes back rather than silently spending
  // a model call.
  const attempt = await db.skillAssessment.findFirst({
    where: { userId: user.id, skillId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (!attempt) redirect("/settings/skills");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">{claim.skill.name} skill check</h1>
        <p className="mt-1.5 text-[0.88rem] text-ink-muted">
          One question, answered from your own experience. It takes a minute and
          shows other students that your level is more than self-reported.
        </p>
      </header>

      <Card>
        <CardHead
          title="Question"
          description="Answer in your own words — specifics beat length."
        />
        <CardBody>
          <SkillCheckForm
            assessmentId={attempt.id}
            question={attempt.question}
            skillName={claim.skill.name}
            claimedLevel={attempt.claimedLevel}
          />
        </CardBody>
      </Card>
    </div>
  );
}
