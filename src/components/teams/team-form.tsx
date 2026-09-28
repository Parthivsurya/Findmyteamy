"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, XIcon } from "@/components/icons";
import { SkillPicker, type PickerSkill } from "@/components/search/skill-picker";
import { createTeamAction } from "@/lib/actions/teams";

type SlotRow = { roleId: string; skillIds: string[] };

/**
 * Create a team and list its open roles.
 *
 * Each row is submitted as one "slots" value shaped "roleId:skillA,skillB",
 * which the server action decodes back into TeamSlot rows.
 */
export function TeamForm({
  roles,
  skills,
  events,
  defaultEventId,
}: {
  roles: Array<{ id: string; name: string }>;
  skills: PickerSkill[];
  events: Array<{ id: string; name: string; slug: string; maxTeamSize: number }>;
  defaultEventId?: string;
}) {
  const [state, formAction, pending] = useActionState(createTeamAction, undefined);
  const [eventId, setEventId] = useState(defaultEventId ?? events[0]?.id ?? "");
  const [slots, setSlots] = useState<SlotRow[]>([{ roleId: "", skillIds: [] }]);

  const activeEvent = events.find((event) => event.id === eventId);
  // The leader takes one place, so open roles are capped one below the maximum.
  const maxSlots = activeEvent ? Math.max(1, activeEvent.maxTeamSize - 1) : 5;
  const error = (key: string) => state?.fieldErrors?.[key];

  function updateSlot(index: number, patch: Partial<SlotRow>) {
    setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  }

  return (
    <form action={formAction} className="space-y-5">
      {state?.error ? (
        <p
          role="alert"
          className="rounded-box border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.83rem] text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <input type="hidden" name="eventId" value={eventId} />
      {slots
        .filter((slot) => slot.roleId)
        .map((slot, index) => (
          <input
            key={`${slot.roleId}-${index}`}
            type="hidden"
            name="slots"
            value={`${slot.roleId}:${slot.skillIds.join(",")}`}
          />
        ))}

      <div>
        <label htmlFor="team-event" className="field-label">
          Event
        </label>
        <select
          id="team-event"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="field"
          required
        >
          <option value="">Choose an event…</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name} (teams of up to {event.maxTeamSize})
            </option>
          ))}
        </select>
        {error("eventId") ? <p className="field-error">{error("eventId")}</p> : null}
      </div>

      <div>
        <label htmlFor="team-name" className="field-label">
          Team name
        </label>
        <input
          id="team-name"
          name="name"
          required
          className="field"
          placeholder="NeuralNav"
        />
        {error("name") ? <p className="field-error">{error("name")}</p> : null}
      </div>

      <div>
        <label htmlFor="team-idea" className="field-label">
          Your idea
        </label>
        <textarea
          id="team-idea"
          name="idea"
          rows={4}
          maxLength={600}
          className="field resize-y"
          placeholder="What you are building and why. Candidates decide mostly on this."
        />
        <p className="field-hint">
          Up to 600 characters. A concrete idea attracts far better candidates
          than “we will decide at the event”.
        </p>
      </div>

      <fieldset>
        <legend className="field-label">
          Open roles {activeEvent ? `(at most ${maxSlots} for this event)` : ""}
        </legend>
        <p className="mb-3 text-[0.8rem] text-ink-muted">
          One row per person you need. Required skills are optional but they
          sharpen the ranking considerably.
        </p>

        <div className="space-y-3">
          {slots.map((slot, index) => (
            <div key={index} className="rounded-box border border-line bg-surface-2 p-3">
              <div className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-box bg-brand text-[0.7rem] font-bold text-white">
                  {index + 1}
                </span>

                <label className="sr-only" htmlFor={`slot-role-${index}`}>
                  Role {index + 1}
                </label>
                <select
                  id={`slot-role-${index}`}
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
                  name={`team-slot-skills-${index}`}
                  skills={skills}
                  defaultSelected={slot.skillIds}
                  max={6}
                  placeholder="Required skills for this role (optional)…"
                  onSelectionChange={(skillIds) => updateSlot(index, { skillIds })}
                />
              </div>
            </div>
          ))}
        </div>

        {slots.length < maxSlots ? (
          <button
            type="button"
            onClick={() => setSlots((prev) => [...prev, { roleId: "", skillIds: [] }])}
            className="mt-3 inline-flex items-center gap-1.5 rounded-box border border-dashed border-line-strong px-3 py-2 text-[0.83rem] font-medium text-ink-2 hover:border-brand hover:text-brand"
          >
            <PlusIcon className="size-3.5" />
            Add another role
          </button>
        ) : (
          <p className="mt-3 text-[0.8rem] text-ink-muted">
            That is the maximum for this event&rsquo;s team size.
          </p>
        )}

        {error("slots") ? <p className="field-error">{error("slots")}</p> : null}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <Button
          type="submit"
          size="lg"
          disabled={pending || !eventId || !slots.some((s) => s.roleId)}
        >
          {pending ? "Creating…" : "Create team and find candidates"}
        </Button>
        <p className="text-[0.8rem] text-ink-muted">
          You will land in Team Builder with these roles pre-filled.
        </p>
      </div>
    </form>
  );
}
