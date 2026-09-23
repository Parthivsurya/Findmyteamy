import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SlotProgress } from "@/components/ui/meter";
import { CheckIcon } from "@/components/icons";
import { RoleChip, SkillChip } from "@/components/profile/skills";

export type TeamCardTeam = {
  id: string;
  name: string;
  idea: string | null;
  isComplete: boolean;
  leader: { name: string; username: string; image: string | null };
  event?: { name: string; slug: string } | null;
  slots: Array<{
    id: string;
    note: string | null;
    role: { name: string };
    filledBy: { name: string; username: string; image: string | null } | null;
    requiredSkills: Array<{ id: string; name: string }>;
  }>;
};

export function TeamCard({
  team,
  action,
  compact = false,
}: {
  team: TeamCardTeam;
  action?: ReactNode;
  compact?: boolean;
}) {
  const filled = team.slots.filter((s) => s.filledBy).length;
  const openSlots = team.slots.filter((s) => !s.filledBy);

  return (
    <Card interactive className="flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/teams/${team.id}`}
            className="block text-[0.95rem] font-semibold hover:text-brand"
          >
            {team.name}
          </Link>
          <p className="mt-0.5 flex items-center gap-1.5 text-[0.78rem] text-ink-muted">
            <Avatar name={team.leader.name} image={team.leader.image} size="xs" />
            Led by {team.leader.name}
          </p>
        </div>

        {team.isComplete ? (
          <Badge tone="ok">
            <CheckIcon className="size-3" />
            Team complete
          </Badge>
        ) : (
          <SlotProgress filled={filled} total={team.slots.length} />
        )}
      </div>

      {team.event && !compact ? (
        <Link
          href={`/events/${team.event.slug}`}
          className="mt-2 text-[0.78rem] font-medium text-brand hover:underline"
        >
          {team.event.name}
        </Link>
      ) : null}

      {team.idea ? (
        <p className="mt-2 line-clamp-3 text-[0.83rem] leading-relaxed text-ink-2">
          {team.idea}
        </p>
      ) : null}

      {openSlots.length ? (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <p className="text-[0.72rem] font-bold uppercase tracking-wider text-ink-muted">
            Open roles
          </p>
          {openSlots.slice(0, compact ? 2 : 4).map((slot) => (
            <div key={slot.id} className="flex flex-wrap items-center gap-1.5">
              <RoleChip name={slot.role.name} />
              {slot.requiredSkills.slice(0, 3).map((skill) => (
                <SkillChip key={skill.id} name={skill.name} />
              ))}
            </div>
          ))}
          {openSlots.length > (compact ? 2 : 4) ? (
            <p className="text-[0.75rem] text-ink-muted">
              +{openSlots.length - (compact ? 2 : 4)} more
            </p>
          ) : null}
        </div>
      ) : null}

      {action ? <div className="mt-auto flex gap-2 pt-4">{action}</div> : null}
    </Card>
  );
}
