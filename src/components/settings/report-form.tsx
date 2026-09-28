"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { reportUserAction } from "@/lib/actions/moderation";

export function ReportForm({
  reportedUserId,
  name,
}: {
  reportedUserId: string;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(reportUserAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="reportedUserId" value={reportedUserId} />

      {state?.error ? (
        <p
          role="alert"
          className="rounded-box border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.83rem] text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <div>
        <label htmlFor="reason" className="field-label">
          What happened?
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={5}
          required
          minLength={10}
          maxLength={500}
          className="field resize-y"
          placeholder={`Describe what ${name} did. An admin reads this, so specifics help.`}
        />
        {state?.fieldErrors?.reason ? (
          <p className="field-error">{state.fieldErrors.reason}</p>
        ) : null}
      </div>

      <label className="flex items-start gap-2.5 text-[0.87rem]">
        <input
          type="checkbox"
          name="block"
          defaultChecked
          className="mt-0.5 size-4 accent-[var(--brand)]"
        />
        <span>
          Also block {name}
          <span className="block text-[0.78rem] text-ink-muted">
            You will not appear in each other&rsquo;s search results, and neither
            of you can send the other a request.
          </span>
        </span>
      </label>

      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Submitting…" : "Submit report"}
      </Button>
    </form>
  );
}
