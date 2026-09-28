"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { createEventAction } from "@/lib/actions/events";
import { EVENT_MODES, EVENT_MODE_LABEL, type EventMode } from "@/lib/enums";
import { cn } from "@/lib/utils";

/** Event submission. Location becomes required as soon as the mode is not online. */
export function EventForm({ isAdmin }: { isAdmin: boolean }) {
  const [state, formAction, pending] = useActionState(createEventAction, undefined);
  const [mode, setMode] = useState<EventMode>("OFFLINE");

  const error = (key: string) => state?.fieldErrors?.[key];

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="field-label">
            Event name
          </label>
          <input
            id="name"
            name="name"
            required
            className="field"
            placeholder="Smart India Hackathon 2026"
          />
          {error("name") ? <p className="field-error">{error("name")}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="organizer" className="field-label">
            Organiser
          </label>
          <input
            id="organizer"
            name="organizer"
            required
            className="field"
            placeholder="Coding Club, Anna University"
          />
          {error("organizer") ? (
            <p className="field-error">{error("organizer")}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="description" className="field-label">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            maxLength={2000}
            className="field resize-y"
            placeholder="What the event is, who can take part, how judging works."
          />
        </div>

        <div>
          <label htmlFor="startDate" className="field-label">
            Starts
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            className="field"
          />
          {error("startDate") ? (
            <p className="field-error">{error("startDate")}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="endDate" className="field-label">
            Ends
          </label>
          <input id="endDate" name="endDate" type="date" required className="field" />
          {error("endDate") ? <p className="field-error">{error("endDate")}</p> : null}
        </div>

        <div>
          <label htmlFor="registrationDeadline" className="field-label">
            Registration deadline
          </label>
          <input
            id="registrationDeadline"
            name="registrationDeadline"
            type="date"
            className="field"
          />
          <p className="field-hint">Optional, but it drives the countdown.</p>
        </div>

        <div>
          <label htmlFor="prize" className="field-label">
            Prize
          </label>
          <input
            id="prize"
            name="prize"
            className="field"
            placeholder="₹50,000 prize pool"
          />
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="field-label">Mode</legend>
          <div className="flex flex-wrap gap-2">
            {EVENT_MODES.map((option) => (
              <label
                key={option}
                className={cn(
                  "cursor-pointer rounded-box border px-3.5 py-1.5 text-[0.83rem] font-medium transition-colors",
                  mode === option
                    ? "border-brand bg-brand text-white"
                    : "border-line-strong bg-surface text-ink-2 hover:border-brand",
                )}
              >
                <input
                  type="radio"
                  name="mode"
                  value={option}
                  checked={mode === option}
                  onChange={() => setMode(option)}
                  className="sr-only"
                />
                {EVENT_MODE_LABEL[option as EventMode]}
              </label>
            ))}
          </div>
        </fieldset>

        {mode !== "ONLINE" ? (
          <div className="sm:col-span-2">
            <label htmlFor="location" className="field-label">
              Location
            </label>
            <input
              id="location"
              name="location"
              required
              className="field"
              placeholder="CEG Campus, Guindy, Chennai"
            />
            {error("location") ? (
              <p className="field-error">{error("location")}</p>
            ) : null}
          </div>
        ) : null}

        <div>
          <label htmlFor="minTeamSize" className="field-label">
            Minimum team size
          </label>
          <input
            id="minTeamSize"
            name="minTeamSize"
            type="number"
            min={1}
            max={20}
            defaultValue={2}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="maxTeamSize" className="field-label">
            Maximum team size
          </label>
          <input
            id="maxTeamSize"
            name="maxTeamSize"
            type="number"
            min={1}
            max={20}
            defaultValue={4}
            className="field"
          />
          {error("maxTeamSize") ? (
            <p className="field-error">{error("maxTeamSize")}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="themes" className="field-label">
            Themes
          </label>
          <input
            id="themes"
            name="themes"
            className="field"
            placeholder="Healthcare, Agriculture, Clean Energy"
          />
          <p className="field-hint">Comma separated.</p>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="registrationLink" className="field-label">
            Official registration link
          </label>
          <input
            id="registrationLink"
            name="registrationLink"
            type="url"
            className="field"
            placeholder="https://example.com/register"
          />
          {error("registrationLink") ? (
            <p className="field-error">{error("registrationLink")}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Submitting…" : isAdmin ? "Publish event" : "Submit for review"}
        </Button>
        <p className="text-[0.8rem] text-ink-muted">
          {isAdmin
            ? "As an admin, your event goes live immediately."
            : "An admin reviews new events before they appear publicly."}
        </p>
      </div>
    </form>
  );
}
