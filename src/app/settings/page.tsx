import type { Metadata } from "next";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DeleteAccountForm,
  NotificationPrefsForm,
} from "@/components/settings/forms";
import { UnblockButton } from "@/components/settings/unblock";
import { exportDataAction } from "@/lib/actions/account";
import { requireOnboardedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Privacy and email",
  robots: { index: false },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ reported?: string }>;
}) {
  const { reported } = await searchParams;
  const session = await requireOnboardedUser("/settings");

  const [user, blocks] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: session.id },
      select: {
        email: true,
        emailOnRequests: true,
        emailOnVerification: true,
        emailWeeklyDigest: true,
      },
    }),
    db.block.findMany({
      where: { blockerId: session.id },
      include: {
        blocked: { select: { id: true, name: true, username: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      {reported ? (
        <p className="rounded-card border border-ok/30 bg-ok-soft px-4 py-3 text-[0.87rem] text-ink-2">
          Thanks — an admin will review your report.
        </p>
      ) : null}

      <Card>
        <CardHead
          title="Email notifications"
          description="In-app notifications are always on; these control email."
        />
        <CardBody>
          <NotificationPrefsForm defaults={user} />
        </CardBody>
      </Card>

      <Card>
        <CardHead
          title="Contact privacy"
          description="This is fixed, not a setting — it is how the platform works."
        />
        <CardBody className="space-y-2 text-[0.85rem] text-ink-2">
          <p>
            Your address{" "}
            <span className="break-all font-mono text-[0.8rem]">{user.email}</span>{" "}
            is never shown on your public profile.
          </p>
          <p className="text-ink-muted">
            It becomes visible to one other person only after a team request
            between you two has been accepted.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHead
          title="Blocked people"
          description={
            blocks.length
              ? `${blocks.length} blocked`
              : "Blocking hides you from each other and stops requests both ways."
          }
        />
        <CardBody>
          {blocks.length === 0 ? (
            <p className="text-[0.85rem] text-ink-muted">
              You have not blocked anyone.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {blocks.map((block) => (
                <li
                  key={block.blockedId}
                  className="flex items-center gap-3 py-2.5"
                >
                  <Avatar
                    name={block.blocked.name}
                    image={block.blocked.image}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.87rem] font-semibold">
                      {block.blocked.name}
                    </p>
                    <p className="truncate text-[0.75rem] text-ink-muted">
                      @{block.blocked.username}
                    </p>
                  </div>
                  <UnblockButton userId={block.blockedId} />
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHead
          title="Your data"
          description="Export everything held about you, as JSON."
        />
        <CardBody>
          <form action={exportDataAction}>
            <Button type="submit" variant="outline" size="sm">
              Download my data
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card className="border-danger/30">
        <CardHead
          title="Delete account"
          description="Permanent. Your profile, skills, achievements, teams and requests are all removed."
        />
        <CardBody>
          <DeleteAccountForm />
        </CardBody>
      </Card>
    </div>
  );
}
