"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/icons";
import { sendRequestAction } from "@/lib/actions/requests";

export type RequestFormTeam = {
  id: string;
  name: string;
  eventName: string;
  slots: Array<{ id: string; roleName: string; requiredSkills: string[] }>;
};

/**
 * One form for both directions of team formation: a leader inviting a
 * candidate into a slot, and a candidate asking to join one.
 */
export function RequestForm({
  type,
  teams,
  toUserId,
  defaultTeamId,
  defaultSlotId,
  returnTo,
  submitLabel,
  placeholder,
}: {
  type: "INVITE" | "JOIN_REQUEST";
  teams: RequestFormTeam[];
  toUserId?: string;
  defaultTeamId?: string;
  defaultSlotId?: string;
  returnTo?: string;
  submitLabel: string;
  placeholder: string;
}) {
  const [state, formAction, pending] = useActionState(sendRequestAction, undefined);

  const [teamId, setTeamId] = useState(
    defaultTeamId ?? teams[0]?.id ?? "",
  );
  const activeTeam = teams.find((team) => team.id === teamId) ?? teams[0];
  const [slotId, setSlotId] = useState(
    defaultSlotId ?? activeTeam?.slots[0]?.id ?? "",
  );

  // Changing team invalidates the previously chosen slot.
  function chooseTeam(nextTeamId: string) {
    setTeamId(nextTeamId);
    const next = teams.find((team) => team.id === nextTeamId);
    setSlotId(next?.slots[0]?.id ?? "");
  }

  if (state?.ok) {
    return (
      <div className="flex items-start gap-2.5 rounded-box border border-ok/30 bg-ok-soft px-4 py-3">
        <CheckIcon className="mt-0.5 size-4 shrink-0 text-ok" />
        <p className="text-[0.87rem] text-ink-2">
          {state.message ?? "Request sent."}
        </p>
      </div>
    );
  }

  const slots = activeTeam?.slots ?? [];

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="type" value={type} />
      {toUserId ? <input type="hidden" name="toUserId" value={toUserId} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="slotId" value={slotId} />

      {state?.error ? (
        <p
          role="alert"
          className="rounded-box border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.83rem] text-danger"
        >
          {state.error}
        </p>
      ) : null}

      {type === "INVITE" && teams.length > 1 ? (
        <div>
          <label htmlFor="team-select" className="field-label">
            Invite to which team?
          </label>
          <select
            id="team-select"
            value={teamId}
            onChange={(e) => chooseTeam(e.target.value)}
            className="field"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}, {team.eventName}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label htmlFor="slot-select" className="field-label">
          {type === "INVITE" ? "Which open role?" : "Which role are you applying for?"}
        </label>

        {slots.length === 0 ? (
          <p className="rounded-box bg-surface-2 px-3.5 py-2.5 text-[0.83rem] text-ink-muted">
            This team has no open roles left.
          </p>
        ) : slots.length === 1 ? (
          <p className="rounded-box border border-line bg-surface-2 px-3.5 py-2.5 text-[0.87rem] font-medium">
            {slots[0]!.roleName}
            {slots[0]!.requiredSkills.length ? (
              <span className="ml-1.5 text-[0.78rem] font-normal text-ink-muted">
                · {slots[0]!.requiredSkills.join(", ")}
              </span>
            ) : null}
          </p>
        ) : (
          <select
            id="slot-select"
            value={slotId}
            onChange={(e) => setSlotId(e.target.value)}
            className="field"
          >
            {slots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.roleName}
                {slot.requiredSkills.length
                  ? `: ${slot.requiredSkills.join(", ")}`
                  : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label htmlFor="message" className="field-label">
          Message (optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          maxLength={300}
          placeholder={placeholder}
          className="field resize-y"
        />
        <p className="field-hint">
          A specific message about the project gets a far better response rate.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={pending || slots.length === 0}>
        {pending ? "Sending…" : submitLabel}
      </Button>
    </form>
  );
}
