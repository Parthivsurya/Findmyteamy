import type { Metadata } from "next";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { AchievementCard } from "@/components/profile/achievement";
import {
  AchievementForm,
  DeleteAchievementButton,
} from "@/components/settings/forms";
import { requireOnboardedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Achievements",
  robots: { index: false },
};

export default async function AchievementsSettingsPage() {
  const session = await requireOnboardedUser("/settings/achievements");

  const achievements = await db.achievement.findMany({
    where: { userId: session.id },
    orderBy: [{ status: "asc" }, { date: "desc" }],
  });

  const verified = achievements.filter((a) => a.status === "VERIFIED").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHead
          title="Add an achievement"
          description="Attach proof and an admin will verify it. Only verified wins count in search filters."
        />
        <CardBody>
          <AchievementForm />
        </CardBody>
      </Card>

      <Card>
        <CardHead
          title="Your achievements"
          description={`${achievements.length} total · ${verified} verified`}
        />
        <CardBody className="space-y-3">
          {achievements.length === 0 ? (
            <p className="text-[0.85rem] text-ink-muted">
              Nothing added yet. Even a participation entry is worth adding — it
              shows you turn up.
            </p>
          ) : (
            achievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                action={<DeleteAchievementButton id={achievement.id} />}
              />
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
