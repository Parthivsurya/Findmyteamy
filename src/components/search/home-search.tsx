"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SkillPicker, type PickerSkill } from "./skill-picker";

/**
 * Skills first, with the two filters that matter on a single campus: my own
 * year and my own branch. Both are resolved server-side from the signed-in
 * student's Amrita address.
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
    <form action="/search" method="get" className="space-y-3">
      <SkillPicker
        name="skills"
        skills={skills}
        max={6}
        label="Skills"
        placeholder="Type a skill — React, PyTorch, Figma…"
      />

      <div>
        <label htmlFor="home-q" className="field-label">
          Keyword (optional)
        </label>
        <input
          id="home-q"
          name="q"
          placeholder="Name, role or keyword"
          className="field"
        />
      </div>

      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-[0.85rem]">
          <input
            type="checkbox"
            name="sameYear"
            value="true"
            checked={sameYear}
            disabled={!signedIn}
            onChange={(e) => setSameYear(e.target.checked)}
            className="size-4 accent-[var(--brand)]"
          />
          Same year as me
          {myYearLabel ? (
            <span className="text-[0.78rem] text-ink-muted">({myYearLabel})</span>
          ) : null}
        </label>

        <label className="flex items-center gap-2 text-[0.85rem]">
          <input
            type="checkbox"
            name="sameBranch"
            value="true"
            checked={sameBranch}
            disabled={!signedIn}
            onChange={(e) => setSameBranch(e.target.checked)}
            className="size-4 accent-[var(--brand)]"
          />
          Same branch as me
          {myBranch ? (
            <span className="text-[0.78rem] text-ink-muted">({myBranch})</span>
          ) : null}
        </label>

        {!signedIn ? (
          <p className="text-[0.78rem] text-ink-muted">
            Sign in to use these two filters.
          </p>
        ) : null}
      </div>

      <Button type="submit">Search</Button>
    </form>
  );
}
