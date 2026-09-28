"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SkillPicker, type PickerSkill } from "./skill-picker";

/**
 * Skills first, with the two filters that matter on a single campus: my own
 * year and my own branch. Both are resolved server-side from the signed-in
 * student's Amrita address.
 *
 * The two filters sit on one row under the inputs rather than in a panel of
 * their own. On one campus there are only ever these two, so a collapsible
 * filter section would be chrome around two checkboxes.
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
    <form action="/search" method="get" className="space-y-4">
      <SkillPicker
        name="skills"
        skills={skills}
        max={6}
        label="Skills"
        placeholder="Try React, PyTorch or Figma"
      />

      <div>
        <label htmlFor="home-q" className="field-label">
          Keyword
        </label>
        <input
          id="home-q"
          name="q"
          placeholder="Name, role or keyword"
          className="field"
        />
        <p className="field-hint">Optional.</p>
      </div>

      <fieldset className="rule pt-3.5">
        <legend className="sr-only">Narrow to my own year or branch</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Filter
            name="sameYear"
            checked={sameYear}
            onChange={setSameYear}
            disabled={!signedIn}
            label="Same year as me"
            detail={myYearLabel}
          />
          <Filter
            name="sameBranch"
            checked={sameBranch}
            onChange={setSameBranch}
            disabled={!signedIn}
            label="Same branch as me"
            detail={myBranch}
          />
        </div>

        {!signedIn ? (
          <p className="field-hint">Sign in to use these two filters.</p>
        ) : null}
      </fieldset>

      <Button type="submit" className="w-full sm:w-auto">
        Search
      </Button>
    </form>
  );
}

function Filter({
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
  disabled: boolean;
  label: string;
  detail?: string | null;
}) {
  return (
    <label
      className={
        disabled
          ? "flex cursor-not-allowed items-center gap-2 text-[0.86rem] text-ink-muted"
          : "flex cursor-pointer items-center gap-2 text-[0.86rem]"
      }
    >
      <input
        type="checkbox"
        name={name}
        value="true"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-3.5 accent-[var(--brand-fill)]"
      />
      {label}
      {detail ? (
        <span className="text-[0.78rem] text-ink-muted">({detail})</span>
      ) : null}
    </label>
  );
}
