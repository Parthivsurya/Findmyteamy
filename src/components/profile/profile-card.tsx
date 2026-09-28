import Link from "next/link";
import type { ReactNode } from "react";
import { academicSummary } from "@/lib/amrita";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScoreBadge } from "@/components/ui/meter";
import { VerifiedIcon } from "@/components/icons";
import { AvailabilityBadge } from "./availability";
import { RoleChip, SkillChip } from "./skills";

export type ProfileCardUser = {
  id: string;
  name: string;
  username: string;
  image: string | null;
  college: string | null;
  location: string | null;
  availability: string;
  verifiedWins: number;
  topSkills: Array<{ id: string; name: string; level: string }>;
  roles: string[];
  /** Read from the student's Amrita address, when known. */
  branchCode?: string | null;
  joiningYear?: number | null;
  programYears?: number | null;
};

/**
 * The result card used by search, Team Builder and event pages. Kept short on
 * purpose — the documentation calls for cards people can scan quickly.
 */
export function ProfileCard({
  user,
  score,
  reasons,
  action,
  highlightSkillIds,
}: {
  user: ProfileCardUser;
  score?: number;
  reasons?: string[];
  action?: ReactNode;
  highlightSkillIds?: Set<string>;
}) {
  return (
    <Card interactive className="flex h-full flex-col p-4">
      <div className="flex items-start gap-3">
        <Link href={`/u/${user.username}`} className="shrink-0">
          <Avatar name={user.name} image={user.image} size="md" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/u/${user.username}`}
                className="block truncate text-[0.95rem] font-semibold hover:text-brand"
              >
                {user.name}
              </Link>
              <p className="truncate text-[0.78rem] text-ink-muted">
                {academicSummary(user) ??
                  user.college ??
                  `@${user.username}`}
                {user.location ? ` · ${user.location}` : ""}
              </p>
            </div>
            {score !== undefined ? <ScoreBadge score={score} /> : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <AvailabilityBadge availability={user.availability} short />
            {user.verifiedWins > 0 ? (
              <Badge tone="ok" title={`${user.verifiedWins} verified achievements`}>
                <VerifiedIcon className="size-3" />
                {user.verifiedWins} verified{" "}
                {user.verifiedWins === 1 ? "win" : "wins"}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {user.roles.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {user.roles.slice(0, 3).map((role) => (
            <RoleChip key={role} name={role} />
          ))}
        </div>
      ) : null}

      {user.topSkills.length ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {user.topSkills.slice(0, 4).map((skill) => (
            <SkillChip
              key={skill.id}
              name={skill.name}
              level={skill.level}
              highlight={highlightSkillIds?.has(skill.id)}
            />
          ))}
        </div>
      ) : null}

      {reasons?.length ? (
        <ul className="mt-3 space-y-1 border-t border-line pt-3">
          {reasons.map((reason) => (
            <li
              key={reason}
              className="flex items-start gap-1.5 text-[0.78rem] text-ink-muted"
            >
              <span aria-hidden className="mt-[0.45rem] h-px w-2 shrink-0 bg-line-strong" />
              {reason}
            </li>
          ))}
        </ul>
      ) : null}

      {action ? <div className="mt-4 flex gap-2 pt-0">{action}</div> : null}
    </Card>
  );
}
