import type { Metadata } from "next";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { SkillsRolesForm } from "@/components/settings/forms";
import { AssessedBadge, StartSkillCheckButton } from "@/components/settings/skill-check";
import { requireOnboardedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SKILL_LEVEL_LABEL, type SkillLevel } from "@/lib/enums";
import { isOpenRouterConfigured } from "@/lib/openrouter";
import { getRoles, getSkills } from "@/lib/services/catalog";
import { relativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Skills and roles",
  robots: { index: false },
};

export default async function SkillsSettingsPage() {
  const session = await requireOnboardedUser("/settings/skills");

  const [user, skills, roles] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: session.id },
      select: {
        skills: {
          select: {
            skillId: true,
            level: true,
            assessedLevel: true,
            assessedAt: true,
            skill: { select: { id: true, name: true } },
          },
          orderBy: { skill: { name: "asc" } },
        },
        roles: { select: { roleId: true } },
      },
    }),
    getSkills(),
    getRoles(),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHead
          title="Skills and roles"
          description="This is what search matches on, so it is worth keeping accurate."
        />
        <CardBody>
          <SkillsRolesForm
            skills={skills}
            roles={roles}
            defaultSkills={user.skills.map((s) => ({ skillId: s.skillId, level: s.level }))}
            defaultRoleIds={user.roles.map((r) => r.roleId)}
          />
        </CardBody>
      </Card>

      {/* A claimed level is self-reported; a check makes it evidenced. */}
      {isOpenRouterConfigured() && user.skills.length > 0 ? (
        <Card>
          <CardHead
            title="Skill checks"
            description="Answer one question per skill to back up the level you claimed."
          />
          <CardBody>
            <ul className="divide-y divide-[var(--line)]">
              {user.skills.map((entry) => (
                <li
                  key={entry.skillId}
                  className="flex flex-wrap items-center gap-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.88rem] font-medium">
                      {entry.skill.name}
                      <span className="ml-1.5 text-[0.78rem] font-normal text-ink-muted">
                        claimed {SKILL_LEVEL_LABEL[entry.level as SkillLevel] ?? entry.level}
                      </span>
                    </p>
                    {entry.assessedAt ? (
                      <p className="text-[0.75rem] text-ink-muted">
                        checked {relativeTime(entry.assessedAt)}
                      </p>
                    ) : null}
                  </div>

                  <AssessedBadge
                    assessedLevel={entry.assessedLevel}
                    claimedLevel={entry.level}
                  />

                  <StartSkillCheckButton
                    skillId={entry.skillId}
                    label={entry.assessedLevel ? "Check again" : "Take the check"}
                  />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
