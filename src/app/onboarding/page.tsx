import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRoles, getSkills } from "@/lib/services/catalog";

export const metadata: Metadata = {
  title: "Set up your profile",
  description: "Add your skills, roles and availability so teams can find you.",
};

export default async function OnboardingPage() {
  const session = await requireUser("/onboarding");
  if (session.onboarded) redirect("/dashboard");

  const [user, skills, roles] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: session.id },
      select: {
        name: true,
        username: true,
        college: true,
        location: true,
        bio: true,
        githubUrl: true,
        linkedinUrl: true,
        portfolioUrl: true,
      },
    }),
    getSkills(),
    getRoles(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-7">
        <h1 className="text-2xl font-bold sm:text-3xl">Set up your profile</h1>
        <p className="mt-2 text-[0.92rem] text-ink-muted">
          Five short steps, about five minutes. Structured skills and roles are
          what make the matching work, so this is worth doing properly once.
        </p>
      </header>

      <OnboardingWizard skills={skills} roles={roles} defaults={user} />
    </div>
  );
}
