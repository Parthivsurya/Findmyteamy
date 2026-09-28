import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, btn } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import {
  BellIcon,
  CheckIcon,
  InboxIcon,
  TrophyIcon,
  UsersIcon,
  VerifiedIcon,
} from "@/components/icons";
import { markAllNotificationsReadAction } from "@/lib/actions/moderation";
import { requireOnboardedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cn, relativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false },
};

function iconFor(type: string) {
  if (type === "ACHIEVEMENT_VERIFIED") return <VerifiedIcon className="size-4" />;
  if (type === "ACHIEVEMENT_REJECTED") return <TrophyIcon className="size-4" />;
  if (type === "INVITE" || type === "JOIN_REQUEST") return <InboxIcon className="size-4" />;
  if (type === "TEAM_COMPLETE") return <CheckIcon className="size-4" />;
  return <UsersIcon className="size-4" />;
}

export default async function NotificationsPage() {
  const user = await requireOnboardedUser("/notifications");

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Notifications
            {unread > 0 ? (
              <Badge tone="brand" className="ml-2 align-middle">
                {unread} new
              </Badge>
            ) : null}
          </h1>
          <p className="mt-1.5 text-[0.9rem] text-ink-muted">
            Team requests, verification results and event reminders.
          </p>
        </div>

        {unread > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="outline" size="sm">
              Mark all as read
            </Button>
          </form>
        ) : null}
      </header>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<BellIcon className="size-5" />}
          title="Nothing here yet"
          description="You will be notified when someone invites you to a team, asks to join yours, or an admin reviews one of your achievements."
          action={
            <Link href="/search" className={btn("primary", "md")}>
              Find teammates
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => {
            const body = (
              <Card
                className={cn(
                  "p-4 transition-colors",
                  !notification.read && "border-brand/40 bg-brand-soft/40",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-box",
                      notification.read
                        ? "bg-surface-2 text-ink-muted"
                        : "bg-brand text-white",
                    )}
                  >
                    {iconFor(notification.type)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-[0.88rem] font-semibold">
                      {notification.title}
                    </p>
                    {notification.body ? (
                      <p className="mt-0.5 text-[0.83rem] leading-relaxed text-ink-muted">
                        {notification.body}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[0.75rem] text-ink-muted">
                      {relativeTime(notification.createdAt)}
                    </p>
                  </div>

                  {!notification.read ? (
                    <span
                      aria-label="Unread"
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-brand"
                    />
                  ) : null}
                </div>
              </Card>
            );

            return (
              <li key={notification.id}>
                {notification.href ? (
                  <Link href={notification.href} className="block">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
