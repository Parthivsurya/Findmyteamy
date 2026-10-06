import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import {
  CopyLink,
  HideVouchButton,
  RevokeVouchButton,
  VouchForm,
} from "@/components/settings/vouch-forms";
import { requireOnboardedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { listVouchesBy, listVouchesFor } from "@/lib/services/vouch";
import { relativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Vouches",
  robots: { index: false },
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Waiting to be used",
  REDEEMED: "Joined",
  REVOKED: "Withdrawn",
  EXPIRED: "Expired",
};

export default async function VouchesSettingsPage() {
  const session = await requireOnboardedUser("/settings/vouches");

  const [me, written, received] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: session.id },
      select: { campusCode: true, joinedVia: true },
    }),
    listVouchesBy(session.id),
    // Hidden ones included: this is the screen where you decide about them.
    listVouchesFor(session.id, { includeHidden: true }),
  ]);

  const base = appUrl();

  return (
    <div className="space-y-6">
      <Card>
        <CardHead
          title="Vouch for someone"
          description="Name them by roll number and say why. The link you get back only works for that person, so it is safe to send in a group."
        />
        <CardBody>
          <VouchForm ownCampus={me.campusCode} />
        </CardBody>
      </Card>

      <Card>
        <CardHead
          title="Links you have created"
          description="A link stays usable until the person signs up with the matching address."
        />
        <CardBody className="px-0 py-0">
          {written.length === 0 ? (
            <div className="px-4 py-3">
              <p className="text-[0.85rem] text-ink-muted">
                You have not vouched for anyone yet.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {written.map((vouch) => {
                const url = `${base}/signup?vouch=${vouch.token}`;
                const roll = `${vouch.branchCode}${String(vouch.joiningYear).slice(2)}${vouch.rollNumber}`;
                return (
                  <li key={vouch.id} className="space-y-2 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[0.85rem] font-medium">
                        {roll}
                      </span>
                      <Badge
                        tone={
                          vouch.status === "REDEEMED"
                            ? "ok"
                            : vouch.status === "PENDING"
                              ? "brand"
                              : "neutral"
                        }
                      >
                        {STATUS_LABEL[vouch.status] ?? vouch.status}
                      </Badge>
                      {vouch.kind === "ADMIN_SEED" ? (
                        <Badge tone="neutral">Founding member</Badge>
                      ) : null}
                      {vouch.subject ? (
                        <Link
                          href={`/u/${vouch.subject.username}`}
                          className="text-[0.82rem] font-medium text-brand hover:underline"
                        >
                          {vouch.subject.name}
                        </Link>
                      ) : null}
                      <span className="ml-auto text-[0.75rem] text-ink-muted">
                        {relativeTime(vouch.createdAt)}
                      </span>
                    </div>

                    {vouch.statement ? (
                      <p className="text-[0.85rem] leading-relaxed text-ink-2">
                        “{vouch.statement}”
                      </p>
                    ) : null}

                    {vouch.status === "PENDING" ? (
                      <div className="flex items-center gap-2">
                        <code className="min-w-0 flex-1 truncate rounded-box border border-line bg-surface-2 px-2 py-1 font-mono text-[0.75rem] text-ink-muted">
                          {url}
                        </code>
                        <CopyLink url={url} />
                      </div>
                    ) : null}

                    {vouch.status === "REDEEMED" && vouch.statement ? (
                      <RevokeVouchButton vouchId={vouch.id} />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHead
          title="What others say about you"
          description="These appear on your public profile. You can hide any of them; an admin can still see what was written."
        />
        <CardBody className="px-0 py-0">
          {received.length === 0 ? (
            <EmptyState
              className="border-0"
              title="Nothing yet"
              description={
                me.joinedVia === "SEED"
                  ? "You were here before vouching existed, so nobody vouched you in."
                  : "Nobody has vouched for you yet."
              }
            />
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {received.map((vouch) => (
                <li key={vouch.id} className="flex gap-3 px-4 py-3">
                  <Avatar
                    name={vouch.voucher.name}
                    image={vouch.voucher.image}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/u/${vouch.voucher.username}`}
                        className="text-[0.85rem] font-medium hover:text-brand"
                      >
                        {vouch.voucher.name}
                      </Link>
                      {vouch.team ? (
                        <Badge tone="ok">
                          Shared a team at {vouch.team.event.name}
                        </Badge>
                      ) : null}
                      {vouch.hiddenBySubject ? (
                        <Badge tone="neutral">Hidden</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-2">
                      “{vouch.statement}”
                    </p>
                    <div className="mt-1.5">
                      <HideVouchButton
                        vouchId={vouch.id}
                        hidden={vouch.hiddenBySubject}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
