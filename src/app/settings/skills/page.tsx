import type { Metadata } from "next";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { SkillsRolesForm } from "@/components/settings/forms";
import { requireOnboardedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRoles, getSkills } from "@/lib/services/catalog";

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
        skills: { select: { skillId: true, level: true } },
        roles: { select: { roleId: true } },
      },
    }),
    getSkills(),
    getRoles(),
  ]);

  return (
    <Card>
      <CardHead
        title="Skills and roles"
        description="This is what search matches on, so it is worth keeping accurate."
      />
      <CardBody>
        <SkillsRolesForm
          skills={skills}
          roles={roles}
          defaultSkills={user.skills}
          defaultRoleIds={user.roles.map((r) => r.roleId)}
        />
      </CardBody>
    </Card>
  );
}
