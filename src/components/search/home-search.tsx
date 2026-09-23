"use client";

import { useState } from "react";
import { btn } from "@/components/ui/button";
import { SearchIcon } from "@/components/icons";
import { SkillPicker, type PickerSkill } from "./skill-picker";
import { cn } from "@/lib/utils";

/**
 * The home page search: skills first, with the two filters that matter most on
 * a single campus — my own year, and my own branch.
 *
 * Both are resolved server-side from the signed-in student's Amrita address,
 * so there is nothing to select and nothing to get wrong.
 */
export function HomeSearch({
  skills,
  signedIn,
  myBranch,
  myYearLabel,
}: {
  skills: PickerSkill[];
  signedIn: boolean;
  myBranch?: string | null;
  myYearLabel?: string | null;
}) {
  const [sameYear, setSameYear] = useState(false);
  const [sameBranch, setSameBranch] = useState(false);

  return (
    <form action="/search" method="get" className="w-full">
      <div className="rounded-2xl bg-surface p-3 shadow-pop sm:p-4">
        <SkillPicker
          name="skills"
          skills={skills}
          max={6}
          placeholder="Type a skill — React, PyTorch, Figma, Solidity…"
          label="Search for a teammate by skills"
        />

        <div className="mt-3">
          <label htmlFor="home-q" className="sr-only">
            Or search by name, role or keyword
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <input
              id="home-q"
              name="q"
              placeholder="Or search by name, role or keyword"
              className="field pl-9"
            />
          </div>
        </div>

        {/* the two campus filters */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Toggle
            name="sameYear"
            checked={sameYear}
            onChange={setSameYear}
            disabled={!signedIn}
            label="Same year as me"
            detail={myYearLabel ?? undefined}
          />
          <Toggle
            name="sameBranch"
            checked={sameBranch}
            onChange={setSameBranch}
            disabled={!signedIn}
            label="Same branch as me"
            detail={myBranch ?? undefined}
          />
        </div>

        {!signedIn ? (
          <p className="mt-2.5 text-[0.78rem] text-ink-muted">
            Sign in with your Amrita address to filter by your own year and
            branch.
          </p>
        ) : null}

        <button type="submit" className={btn("primary", "lg", "mt-3 w-full")}>
          <SearchIcon className="size-4" />
          Find teammates
        </button>
      </div>
    </form>
  );
}

function Toggle({
  name,
  checked,
  onChange,
  disabled,
  label,
  detail,
}: {
  name: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
  detail?: string;
}) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[0.83rem] font-medium transition-colors",
        checked
          ? "border-brand bg-brand-soft text-brand"
          : "border-line-strong bg-surface text-ink-2 hover:border-brand",
        disabled && "cursor-not-allowed opacity-55 hover:border-line-strong",
      )}
    >
      <input
        type="checkbox"
        name={name}
        value="true"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--brand)]"
      />
      {label}
      {detail ? (
        <span className="text-[0.72rem] font-semibold text-ink-muted">
          {detail}
        </span>
      ) : null}
    </label>
  );
}
