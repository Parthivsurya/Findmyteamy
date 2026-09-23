import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { btn } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { TabLinks } from "@/components/ui/nav";
import { CancelButton, RespondButtons } from "@/components/teams/respond-buttons";
import { InboxIcon, ShieldIcon } from "@/components/icons";
import { requireOnboardedUser } from "@/lib/auth";
import { listRequests } from "@/lib/services/requests";
import { relativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Requests",
  description: "Invites and join requests you have sent and received.",
  robots: { index: false },
};

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: "warn",
  ACCEPTED: "ok",
  DECLINED: "neutral",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Waiting",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "received" } = await searchParams;
  const user = await requireOnboardedUser("/requests");
  const { received, sent } = await listRequests(user.id);

  const pendingReceived = received.filter((r) => r.status === "PENDING");
  const pendingSent = sent.filter((r) => r.status === "PENDING");
  const showingSent = tab === "sent";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Requests</h1>
        <p className="mt-1.5 text-[0.9rem] text-ink-muted">
          Invites into a role slot, and requests to join a team. Accepting one
          shares contact details between both sides.
        </p>
      </header>

      <TabLinks
        className="mb-5"
        tabs={[
          {
            href: "/requests?tab=received",
            label: "Received",
            active: !showingSent,
            count: pendingReceived.length,
          },
          {
            href: "/requests?tab=sent",
            label: "Sent",
            active: showingSent,
            count: pendingSent.length,
          },
        ]}
      />

      {showingSent ? (
        sent.length === 0 ? (
          <EmptyState
            icon={<InboxIcon className="size-5" />}
            title="You have not sent any requests yet"
            description="Find someone whose skills fit a role you need, and invite them straight into that slot."
            action={
              <Link href="/search" className={btn("primary", "md")}>
                Find teammates
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {sent.map((request) => (
              <li key={request.id}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <Avatar
                      name={request.toUser.name}
                      image={request.toUser.image}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.88rem]">
                        {request.type === "INVITE" ? "You invited " : "You asked to join "}
                        <Link
                          href={`/u/${request.toUser.username}`}
                          className="font-semibold hover:text-brand"
                        >
                          {request.toUser.name}
                        </Link>
                        {request.type === "INVITE" ? " to " : "’s team "}
                        <Link
                          href={`/teams/${request.team.id}`}
                          className="font-semibold hover:text-brand"
                        >
                          {request.team.name}
                        </Link>
                      </p>
                      <p className="mt-0.5 text-[0.78rem] text-ink-muted">
                        {request.slot?.role.name ?? "Team member"}
                        {request.team.event ? ` · ${request.team.event.name}` : ""}
                        {" · "}
                        {relativeTime(request.createdAt)}
                      </p>

                      {request.message ? (
                        <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-[0.82rem] leading-relaxed text-ink-2">
                          “{request.message}”
                        </p>
                      ) : null}

                      {request.status === "ACCEPTED" ? (
                        <p className="mt-2 break-all font-mono text-[0.78rem] text-ink-2">
                          {request.toUser.email}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge tone={STATUS_TONE[request.status] ?? "neutral"}>
                        {STATUS_LABEL[request.status] ?? request.status}
                      </Badge>
                      {request.status === "PENDING" ? (
                        <CancelButton requestId={request.id} />
                      ) : null}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )
      ) : received.length === 0 ? (
        <EmptyState
          icon={<InboxIcon className="size-5" />}
          title="Nothing waiting on you"
          description="Invites and join requests will appear here. Marking yourself available and completing your profile makes them far more likely."
          action={
            <Link href="/dashboard" className={btn("primary", "md")}>
              Back to dashboard
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {received.map((request) => (
            <li key={request.id}>
              <Card className="p-4">
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
                        {request.type === "INVITE"
                          ? "invited you to"
                          : "asked to join"}
                      </span>{" "}
                      <Link
                        href={`/teams/${request.team.id}`}
                        className="font-semibold hover:text-brand"
                      >
                        {request.team.name}
                      </Link>
                    </p>
                    <p className="mt-0.5 text-[0.78rem] text-ink-muted">
                      {request.slot?.role.name ?? "Team member"}
                      {request.team.event ? ` · ${request.team.event.name}` : ""}
                      {" · "}
                      {relativeTime(request.createdAt)}
                    </p>

                    {request.team.idea ? (
                      <p className="mt-1.5 line-clamp-2 text-[0.8rem] text-ink-muted">
                        {request.team.idea}
                      </p>
                    ) : null}

                    {request.message ? (
                      <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-[0.82rem] leading-relaxed text-ink-2">
                        “{request.message}”
                      </p>
                    ) : null}

                    {request.status === "ACCEPTED" ? (
                      <p className="mt-2 flex items-center gap-1.5 break-all font-mono text-[0.78rem] text-ink-2">
                        <ShieldIcon className="size-3.5 shrink-0 text-ok" />
                        {request.fromUser.email}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {request.status === "PENDING" ? (
                      <RespondButtons requestId={request.id} />
                    ) : (
                      <Badge tone={STATUS_TONE[request.status] ?? "neutral"}>
                        {STATUS_LABEL[request.status] ?? request.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
