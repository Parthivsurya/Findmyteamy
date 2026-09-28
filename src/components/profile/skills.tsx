import { cn } from "@/lib/utils";
import {
  SKILL_CATEGORY_LABEL,
  SKILL_LEVEL_LABEL,
  type SkillCategory,
  type SkillLevel,
} from "@/lib/enums";

const LEVEL_FILL: Record<SkillLevel, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  EXPERT: 3,
};

/** Three dots showing proficiency, readable at a glance in a dense card. */
export function LevelDots({ level }: { level: string }) {
  const filled = LEVEL_FILL[level as SkillLevel] ?? 1;
  return (
    <span
      className="ml-0.5 inline-flex gap-[2px]"
      title={SKILL_LEVEL_LABEL[level as SkillLevel] ?? level}
      aria-label={SKILL_LEVEL_LABEL[level as SkillLevel] ?? level}
    >
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "size-1.5 rounded-full",
            i <= filled ? "bg-brand" : "bg-line-strong",
          )}
        />
      ))}
    </span>
  );
}

export function SkillChip({
  name,
  level,
  highlight = false,
  className,
}: {
  name: string;
  level?: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-box border px-2 py-1 text-[0.78rem] font-medium",
        highlight
          ? "border-brand/40 bg-brand-soft text-brand"
          : "border-line bg-surface-2 text-ink-2",
        className,
      )}
    >
      {name}
      {level ? <LevelDots level={level} /> : null}
    </span>
  );
}

export function RoleChip({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-box border border-line bg-surface-2",
        "px-2 py-0.5 text-[0.78rem] font-medium text-ink-2",
        className,
      )}
    >
      {name}
    </span>
  );
}

/** Skills grouped by category, as used on the public profile page. */
export function SkillsByCategory({
  skills,
  highlightIds,
}: {
  skills: Array<{ level: string; skill: { id: string; name: string; category: string } }>;
  highlightIds?: Set<string>;
}) {
  const groups = new Map<string, typeof skills>();
  for (const entry of skills) {
    const list = groups.get(entry.skill.category) ?? [];
    list.push(entry);
    groups.set(entry.skill.category, list);
  }

  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="space-y-4">
      {ordered.map(([category, entries]) => (
        <div key={category}>
          <h3 className="mb-2 text-[0.76rem] font-medium text-ink-muted">
            {SKILL_CATEGORY_LABEL[category as SkillCategory] ?? category}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {entries
              .sort((a, b) => (LEVEL_FILL[b.level as SkillLevel] ?? 0) - (LEVEL_FILL[a.level as SkillLevel] ?? 0))
              .map((entry) => (
                <SkillChip
                  key={entry.skill.id}
                  name={entry.skill.name}
                  level={entry.level}
                  highlight={highlightIds?.has(entry.skill.id)}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
