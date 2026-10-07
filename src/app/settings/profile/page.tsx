import type { Metadata } from "next";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { ProfileForm } from "@/components/settings/forms";
import {
  BRANCHES,
  CAMPUSES,
  SCHOOLS,
  batchLabel,
  studyYearLabel,
} from "@/lib/amrita";
import { requireOnboardedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Edit profile",
  robots: { index: false },
};

export default async function ProfileSettingsPage() {
  const session = await requireOnboardedUser("/settings/profile");

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.id },
    select: {
      name: true,
      username: true,
      bio: true,
      image: true,
      githubUrl: true,
      linkedinUrl: true,
      portfolioUrl: true,
      resumeUrl: true,
      whatsapp: true,
      showWhatsapp: true,
      showGithub: true,
      showLinkedin: true,
      showPortfolio: true,
      campusCode: true,
      schoolCode: true,
      branchCode: true,
      joiningYear: true,
      programYears: true,
      rollNumber: true,
    },
  });

  return (
    <div className="space-y-6">
      {/* Read-only: it comes from the address, so it cannot be edited here. */}
      <Card>
        <CardHead
          title="From your Amrita address"
          description="Read from your roll address, so it cannot be edited."
        />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Fact label="Campus">
            {user.campusCode ? (CAMPUSES[user.campusCode] ?? user.campusCode.toUpperCase()) : "Not set"}
          </Fact>
          <Fact label="School">
            {user.schoolCode ? (SCHOOLS[user.schoolCode] ?? user.schoolCode.toUpperCase()) : "Not set"}
          </Fact>
          <Fact label="Branch">
            {user.branchCode
              ? `${user.branchCode.toUpperCase()}${BRANCHES[user.branchCode] ? `, ${BRANCHES[user.branchCode]}` : ""}`
              : "Not set"}
          </Fact>
          <Fact label="Year">
            {studyYearLabel(user.joiningYear, user.programYears) ?? "Not set"}
            {batchLabel(user.joiningYear, user.programYears)
              ? ` · ${batchLabel(user.joiningYear, user.programYears)}`
              : ""}
          </Fact>
        </CardBody>
      </Card>

      <Card>
        <CardHead title="Profile" description="What other students see." />
        <CardBody>
          <ProfileForm defaults={user} />
        </CardBody>
      </Card>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[0.76rem] font-medium text-ink-muted">
        {label}
      </dt>
      <dd className="text-[0.87rem] font-medium">{children}</dd>
    </div>
  );
}
