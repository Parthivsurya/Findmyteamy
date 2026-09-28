"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, XIcon } from "@/components/icons";
import { SkillPicker, type PickerSkill } from "./skill-picker";

export type BuilderSlot = { roleId: string; skillIds: string[] };

/**
 * Describes the team you need: one row per open role, each with the skills that
 * role should bring.
 *
 * The rows are encoded into a single `slots` query parameter
 * ("roleId:skillA,skillB|roleId:…"), which keeps every Team Builder search
 * shareable as a plain URL.
 */
export function TeamBuilderForm({
  roles,
  skills,
  events,
  defaultSlots,
  defaultEvent,
  teamId,
}: {
  roles: Array<{ id: string; name: string }>;
  skills: PickerSkill[];
  events: Array<{ id: string; name: string; slug: string }>;
  defaultSlots: BuilderSlot[];
  defaultEvent?: string;
  teamId?: string;
}) {
  const [slots, setSlots] = useState<BuilderSlot[]>(
    defaultSlots.length ? defaultSlots : [{ roleId: roles[0]?.id ?? "", skillIds: [] }],
  );

  const encoded = slots
    .filter((slot) => slot.roleId)
    .map((slot) => `${slot.roleId}:${slot.skillIds.join(",")}`)
    .join("|");

  function updateSlot(index: number, patch: Partial<BuilderSlot>) {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)),
    );
  }

  return (
    <form
      action="/team-builder"
      method="get"
      className="rounded-box border border-line bg-surface p-4"
    >
      <input type="hidden" name="slots" value={encoded} />
      {teamId ? <input type="hidden" name="team" value={teamId} /> : null}

      <div className="mb-4">
        <label htmlFor="tb-event" className="field-label">
          Event (optional)
        </label>
        <select
          id="tb-event"
          name="event"
          defaultValue={defaultEvent ?? ""}
          className="field"
        >
          <option value="">Any event</option>
          {events.map((event) => (
            <option key={event.id} value={event.slug}>
              {event.name}
            </option>
          ))}
        </select>
        <p className="field-hint">
          Picking an event ranks people who are looking for a team there highest.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="field-label">Roles you need</legend>

        {slots.map((slot, index) => (
          <div
            key={index}
            className="rounded-box border border-line bg-surface-2 p-3"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-box bg-brand text-[0.7rem] font-bold text-white">
                {index + 1}
              </span>

              <label className="sr-only" htmlFor={`tb-role-${index}`}>
                Role {index + 1}
              </label>
              <select
                id={`tb-role-${index}`}
                value={slot.roleId}
                onChange={(e) => updateSlot(index, { roleId: e.target.value })}
                className="field flex-1"
              >
                <option value="">Choose a role…</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>

              {slots.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setSlots((prev) => prev.filter((_, i) => i !== index))}
                  aria-label={`Remove role ${index + 1}`}
                  className="rounded-box p-2 text-ink-muted hover:bg-danger-soft hover:text-danger"
                >
                  <XIcon className="size-4" />
                </button>
              ) : null}
            </div>

            <div className="mt-2.5">
              <SkillPicker
                name={`slot-skills-${index}`}
                skills={skills}
                defaultSelected={slot.skillIds}
                max={6}
                placeholder="Required skills for this role (optional)…"
                onSelectionChange={(skillIds) => updateSlot(index, { skillIds })}
              />
            </div>
          </div>
        ))}
      </fieldset>

      {slots.length < 6 ? (
        <button
          type="button"
          onClick={() => setSlots((prev) => [...prev, { roleId: "", skillIds: [] }])}
          className="mt-3 inline-flex items-center gap-1.5 rounded-box border border-dashed border-line-strong px-3 py-2 text-[0.83rem] font-medium text-ink-2 hover:border-brand hover:text-brand"
        >
          <PlusIcon className="size-3.5" />
          Add another role
        </button>
      ) : null}

      <Button type="submit" className="mt-4 w-full" disabled={!encoded}>
        Find candidates for each role
      </Button>
    </form>
  );
}
