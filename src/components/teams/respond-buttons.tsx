"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, XIcon } from "@/components/icons";
import { respondToRequestAction } from "@/lib/actions/requests";
import { releaseSlotAction } from "@/lib/actions/teams";

/** Accept / decline on a received request. */
export function RespondButtons({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(respondToRequestAction, undefined);

  if (state?.ok) {
    return (
      <p className="text-[0.8rem] font-medium text-ok">{state.message ?? "Done."}</p>
    );
  }

  return (
    <div>
      {state?.error ? (
        <p role="alert" className="mb-1.5 text-[0.78rem] text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <form action={formAction}>
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="action" value="accept" />
          <Button type="submit" size="sm" disabled={pending}>
            <CheckIcon className="size-3.5" />
            Accept
          </Button>
        </form>

        <form action={formAction}>
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="action" value="decline" />
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            Decline
          </Button>
        </form>
      </div>
    </div>
  );
}

/** Cancel a request you sent. */
export function CancelButton({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(respondToRequestAction, undefined);

  if (state?.ok) {
    return <p className="text-[0.8rem] text-ink-muted">Cancelled.</p>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="action" value="cancel" />
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        <XIcon className="size-3.5" />
        Cancel
      </Button>
      {state?.error ? (
        <p role="alert" className="mt-1 text-[0.78rem] text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

/** Leader removes a member, or a member leaves. */
export function ReleaseSlotButton({
  slotId,
  teamId,
  label,
}: {
  slotId: string;
  teamId: string;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(releaseSlotAction, undefined);

  if (state?.ok) {
    return <p className="text-[0.8rem] text-ink-muted">{state.message}</p>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="slotId" value={slotId} />
      <input type="hidden" name="teamId" value={teamId} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        {pending ? "Working…" : label}
      </Button>
      {state?.error ? (
        <p role="alert" className="mt-1 text-[0.78rem] text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
