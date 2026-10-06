"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { requestAccessAction } from "@/lib/actions/vouch";

/**
 * Asking to join without a vouch link.
 *
 * The reply never changes with the outcome. Submitting for an address that is
 * already a member, or submitting twice, says exactly what a fresh request
 * says, so this form cannot be used to discover which roll addresses are
 * registered.
 */
export function RequestAccessForm() {
  const [state, formAction, pending] = useActionState(requestAccessAction, undefined);

  if (state?.ok) {
    return (
      <p className="rounded-box border border-ok/30 bg-ok-soft px-3.5 py-2.5 text-[0.85rem] text-ok">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      {state?.error ? (
        <p
          role="alert"
          className="rounded-box border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.83rem] text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <div>
        <label htmlFor="requestEmail" className="field-label">
          Your Amrita email
        </label>
        <input
          id="requestEmail"
          name="email"
          type="email"
          placeholder="cb.xx.xxxxxxx@cb.students.amrita.edu"
          autoComplete="email"
          className="field"
          required
        />
      </div>

      <div>
        <label htmlFor="requestNote" className="field-label">
          Anything you want to add
        </label>
        <textarea
          id="requestNote"
          name="note"
          rows={2}
          maxLength={300}
          placeholder="Second year CSE, looking for a team for the next hackathon."
          className="field"
        />
        <p className="field-hint">Optional.</p>
      </div>

      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Sending…" : "Ask to join"}
      </Button>
    </form>
  );
}
