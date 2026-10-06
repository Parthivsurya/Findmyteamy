"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  decideAccessRequestAction,
  seedMemberAction,
} from "@/lib/actions/vouch";
import type { FormResult } from "@/lib/actions/shared";

function Notice({ state }: { state: FormResult | undefined }) {
  if (state?.error) {
    return (
      <p role="alert" className="mt-2 text-[0.8rem] text-danger">
        {state.error}
      </p>
    );
  }
  if (state?.message) {
    return <p className="mt-2 text-[0.8rem] text-ok">{state.message}</p>;
  }
  return null;
}

/**
 * Planting a founding member.
 *
 * The resulting account is a root of the forest, not this admin's child, so
 * the tree does not claim the first cohort was all brought in by whoever
 * happened to press the button.
 */
export function SeedMemberForm() {
  const [state, formAction, pending] = useActionState(seedMemberAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="min-w-44 flex-1">
        <label htmlFor="seedRoll" className="field-label">
          Roll number
        </label>
        <input
          id="seedRoll"
          name="shortRoll"
          placeholder="cse24535"
          autoComplete="off"
          spellCheck={false}
          className="field font-mono"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create founding link"}
      </Button>
      <div className="w-full">
        <Notice state={state} />
      </div>
    </form>
  );
}

/** Approving or declining someone who asked to join without a link. */
export function AccessDecision({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(
    decideAccessRequestAction,
    undefined,
  );
  const [declining, setDeclining] = useState(false);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="requestId" value={requestId} />

      {declining ? (
        <input
          name="decisionNote"
          placeholder="Why, so the refusal is not silent"
          maxLength={200}
          className="field"
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="decision"
          value="APPROVE"
          size="sm"
          disabled={pending}
        >
          Approve
        </Button>
        {declining ? (
          <Button
            type="submit"
            name="decision"
            value="DECLINE"
            variant="danger"
            size="sm"
            disabled={pending}
          >
            Confirm decline
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDeclining(true)}
          >
            Decline
          </Button>
        )}
      </div>

      <Notice state={state} />
    </form>
  );
}
