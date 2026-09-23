"use client";

import { useMemo, useRef, useState } from "react";
import { XIcon } from "@/components/icons";
import { SKILL_CATEGORY_LABEL, type SkillCategory } from "@/lib/enums";
import { cn } from "@/lib/utils";

export type PickerSkill = { id: string; name: string; category: string };

/**
 * Autocomplete multi-select over the master skill list.
 *
 * Selections are submitted as repeated hidden inputs, so the surrounding form
 * can be a plain GET form (search) or a server action (onboarding, teams) with
 * no extra wiring.
 */
export function SkillPicker({
  name,
  skills,
  defaultSelected = [],
  max = 20,
  placeholder = "Search skills…",
  label,
  hint,
  onSelectionChange,
}: {
  name: string;
  skills: PickerSkill[];
  defaultSelected?: string[];
  max?: number;
  placeholder?: string;
  label?: string;
  hint?: string;
  /** Lets a parent form (Team Builder) mirror the selection into its own state. */
  onSelectionChange?: (skillIds: string[]) => void;
}) {
  const byId = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);
  const [selected, setSelected] = useState<string[]>(() =>
    defaultSelected.filter((id) => byId.has(id)),
  );
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const query = term.trim().toLowerCase();
    const pool = skills.filter((s) => !selected.includes(s.id));
    if (!query) return pool.slice(0, 40);
    return pool
      .filter((s) => s.name.toLowerCase().includes(query))
      .slice(0, 40)
      .sort((a, b) => {
        // Prefix matches are almost always what the person meant.
        const aStarts = a.name.toLowerCase().startsWith(query) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(query) ? 0 : 1;
        return aStarts - bStarts || a.name.localeCompare(b.name);
      });
  }, [term, skills, selected]);

  const grouped = useMemo(() => {
    const groups = new Map<string, PickerSkill[]>();
    for (const skill of matches) {
      const list = groups.get(skill.category) ?? [];
      list.push(skill);
      groups.set(skill.category, list);
    }
    return [...groups.entries()];
  }, [matches]);

  const full = selected.length >= max;

  function commit(next: string[]) {
    setSelected(next);
    onSelectionChange?.(next);
  }

  function add(id: string) {
    if (full || selected.includes(id)) return;
    commit([...selected, id]);
    setTerm("");
    inputRef.current?.focus();
  }

  function remove(id: string) {
    commit(selected.filter((s) => s !== id));
  }

  return (
    <div>
      {label ? <span className="field-label">{label}</span> : null}

      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      <div
        className={cn(
          "rounded-[10px] border border-line-strong bg-surface p-1.5",
          "focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--brand-ring)]",
        )}
      >
        {selected.length ? (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {selected.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-lg bg-brand-soft px-2 py-1 text-[0.78rem] font-medium text-brand"
              >
                {byId.get(id)?.name ?? id}
                <button
                  type="button"
                  onClick={() => remove(id)}
                  aria-label={`Remove ${byId.get(id)?.name ?? "skill"}`}
                  className="rounded-full p-0.5 hover:bg-brand hover:text-white"
                >
                  <XIcon className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={term}
            disabled={full}
            placeholder={full ? `Maximum ${max} selected` : placeholder}
            onChange={(e) => {
              setTerm(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (matches[0]) add(matches[0].id);
              }
              if (e.key === "Escape") setOpen(false);
              if (e.key === "Backspace" && !term && selected.length) {
                remove(selected[selected.length - 1]!);
              }
            }}
            className="w-full bg-transparent px-1.5 py-1 text-[0.875rem] outline-none disabled:cursor-not-allowed"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${name}-options`}
            autoComplete="off"
          />

          {open && matches.length ? (
            <div
              id={`${name}-options`}
              className="scrollbar-slim absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-pop"
            >
              {grouped.map(([category, items]) => (
                <div key={category}>
                  <p className="px-2 pb-1 pt-2 text-[0.68rem] font-bold uppercase tracking-wider text-ink-muted">
                    {SKILL_CATEGORY_LABEL[category as SkillCategory] ?? category}
                  </p>
                  {items.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => add(skill.id)}
                      className="block w-full rounded-lg px-2 py-1.5 text-left text-[0.83rem] text-ink-2 hover:bg-brand-soft hover:text-brand"
                    >
                      {skill.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

/**
 * Skills with a proficiency level, used in onboarding and profile settings.
 * Submits one `skills` value per row as "skillId:LEVEL".
 */
export function LeveledSkillPicker({
  name,
  skills,
  defaultValue = [],
  max = 40,
}: {
  name: string;
  skills: PickerSkill[];
  defaultValue?: Array<{ skillId: string; level: string }>;
  max?: number;
}) {
  const byId = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);
  const [rows, setRows] = useState(() =>
    defaultValue.filter((row) => byId.has(row.skillId)),
  );
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const query = term.trim().toLowerCase();
    const chosen = new Set(rows.map((r) => r.skillId));
    const pool = skills.filter((s) => !chosen.has(s.id));
    if (!query) return pool.slice(0, 30);
    return pool.filter((s) => s.name.toLowerCase().includes(query)).slice(0, 30);
  }, [term, rows, skills]);

  function add(skillId: string) {
    if (rows.length >= max) return;
    setRows((prev) => [...prev, { skillId, level: "INTERMEDIATE" }]);
    setTerm("");
  }

  function setLevel(skillId: string, level: string) {
    setRows((prev) => prev.map((r) => (r.skillId === skillId ? { ...r, level } : r)));
  }

  function remove(skillId: string) {
    setRows((prev) => prev.filter((r) => r.skillId !== skillId));
  }

  return (
    <div>
      {rows.map((row) => (
        <input
          key={row.skillId}
          type="hidden"
          name={name}
          value={`${row.skillId}:${row.level}`}
        />
      ))}

      <div className="relative">
        <input
          type="text"
          value={term}
          placeholder="Add a skill — try “React” or “PyTorch”…"
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (matches[0]) add(matches[0].id);
            }
          }}
          className="field"
          autoComplete="off"
        />

        {open && matches.length ? (
          <div className="scrollbar-slim absolute z-30 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-pop">
            {matches.map((skill) => (
              <button
                key={skill.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(skill.id)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[0.83rem] text-ink-2 hover:bg-brand-soft hover:text-brand"
              >
                {skill.name}
                <span className="text-[0.7rem] text-ink-muted">
                  {SKILL_CATEGORY_LABEL[skill.category as SkillCategory]}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {rows.length ? (
        <ul className="mt-3 divide-y divide-[var(--line)] rounded-xl border border-line">
          {rows.map((row) => (
            <li
              key={row.skillId}
              className="flex flex-wrap items-center gap-2 px-3 py-2"
            >
              <span className="flex-1 truncate text-[0.87rem] font-medium">
                {byId.get(row.skillId)?.name}
              </span>

              <div className="flex overflow-hidden rounded-lg border border-line">
                {(["BEGINNER", "INTERMEDIATE", "EXPERT"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setLevel(row.skillId, level)}
                    aria-pressed={row.level === level}
                    className={cn(
                      "px-2.5 py-1 text-[0.72rem] font-semibold transition-colors",
                      row.level === level
                        ? "bg-brand text-white"
                        : "bg-surface text-ink-muted hover:bg-surface-2",
                    )}
                  >
                    {level === "BEGINNER"
                      ? "Beginner"
                      : level === "INTERMEDIATE"
                        ? "Intermediate"
                        : "Expert"}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => remove(row.skillId)}
                aria-label={`Remove ${byId.get(row.skillId)?.name ?? "skill"}`}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-danger-soft hover:text-danger"
              >
                <XIcon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="field-hint">
          Add at least three skills — they are what search matches on.
        </p>
      )}
    </div>
  );
}
