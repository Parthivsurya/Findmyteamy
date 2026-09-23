import Link from "next/link";
import { Button, btn } from "@/components/ui/button";
import { FilterIcon } from "@/components/icons";
import {
  AVAILABILITY,
  AVAILABILITY_LABEL,
  SKILL_LEVELS,
  SKILL_LEVEL_LABEL,
  type Availability,
  type SkillLevel,
} from "@/lib/enums";
import type { SearchQuery } from "@/lib/validators";
import { SkillPicker, type PickerSkill } from "./skill-picker";

/**
 * The search sidebar. It is a plain GET form, so every search is a shareable,
 * bookmarkable URL and the whole thing works without client-side state.
 */
export function FilterPanel({
  skills,
  roles,
  events,
  query,
  skillIds,
}: {
  skills: PickerSkill[];
  roles: Array<{ id: string; name: string }>;
  events: Array<{ id: string; name: string; slug: string }>;
  query: SearchQuery;
  skillIds: string[];
}) {
  return (
    <form
      action="/search"
      method="get"
      className="space-y-4 rounded-card border border-line bg-surface p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[0.9rem] font-semibold">
          <FilterIcon className="size-4 text-brand" />
          Filters
        </h2>
        <Link
          href="/search"
          className="text-[0.78rem] font-medium text-ink-muted hover:text-brand"
        >
          Clear all
        </Link>
      </div>

      <div>
        <label htmlFor="q" className="field-label">
          Keyword
        </label>
        <input
          id="q"
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="Name, skill or college"
          className="field"
        />
      </div>

      <SkillPicker
        name="skills"
        label="Skills"
        skills={skills}
        defaultSelected={skillIds}
        max={10}
        hint="Pick the skills the person must have."
      />

      <fieldset>
        <legend className="field-label">Skill match</legend>
        <div className="flex overflow-hidden rounded-lg border border-line-strong">
          {(["any", "all"] as const).map((mode) => (
            <label
              key={mode}
              className="flex-1 cursor-pointer text-center has-[:checked]:bg-brand has-[:checked]:text-white"
            >
              <input
                type="radio"
                name="skillMatch"
                value={mode}
                defaultChecked={(query.skillMatch ?? "any") === mode}
                className="peer sr-only"
              />
              <span className="block px-3 py-1.5 text-[0.78rem] font-semibold">
                {mode === "any" ? "Match any" : "Match all"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="minLevel" className="field-label">
          Minimum skill level
        </label>
        <select
          id="minLevel"
          name="minLevel"
          defaultValue={query.minLevel ?? ""}
          className="field"
        >
          <option value="">Any level</option>
          {SKILL_LEVELS.map((level) => (
            <option key={level} value={level}>
              {SKILL_LEVEL_LABEL[level as SkillLevel]} and above
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="role" className="field-label">
          Role
        </label>
        <select id="role" name="role" defaultValue={query.role ?? ""} className="field">
          <option value="">Any role</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="availability" className="field-label">
          Availability
        </label>
        <select
          id="availability"
          name="availability"
          defaultValue={query.availability ?? ""}
          className="field"
        >
          <option value="">Anyone available</option>
          {AVAILABILITY.filter((a) => a !== "NOT_AVAILABLE").map((option) => (
            <option key={option} value={option}>
              {AVAILABILITY_LABEL[option as Availability]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="event" className="field-label">
          Attending event
        </label>
        <select
          id="event"
          name="event"
          defaultValue={query.event ?? ""}
          className="field"
        >
          <option value="">Any event</option>
          {events.map((event) => (
            <option key={event.id} value={event.slug}>
              {event.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-2">
        <legend className="field-label">Achievements</legend>
        <label className="flex items-center gap-2 text-[0.83rem]">
          <input
            type="checkbox"
            name="verifiedOnly"
            value="true"
            defaultChecked={query.verifiedOnly}
            className="size-4 accent-[var(--brand)]"
          />
          Has verified wins
        </label>
        <select
          name="minWins"
          defaultValue={query.minWins ? String(query.minWins) : ""}
          aria-label="Minimum number of verified wins"
          className="field"
        >
          <option value="">Any number of wins</option>
          {[1, 2, 3, 5].map((n) => (
            <option key={n} value={n}>
              {n}+ verified {n === 1 ? "win" : "wins"}
            </option>
          ))}
        </select>
      </fieldset>

      <div>
        <label htmlFor="college" className="field-label">
          College or company
        </label>
        <input
          id="college"
          name="college"
          defaultValue={query.college ?? ""}
          placeholder="e.g. Anna University"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="location" className="field-label">
          City
        </label>
        <input
          id="location"
          name="location"
          defaultValue={query.location ?? ""}
          placeholder="e.g. Chennai"
          className="field"
        />
      </div>

      <input type="hidden" name="sort" value={query.sort ?? "match"} />

      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1">
          Apply filters
        </Button>
        <Link href="/team-builder" className={btn("outline", "md")}>
          Team Builder
        </Link>
      </div>
    </form>
  );
}
