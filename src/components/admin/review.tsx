"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, XIcon } from "@/components/icons";
import {
  resolveReportAction,
  reviewAchievementAction,
  reviewEventAction,
  reviewSkillAction,
} from "@/lib/actions/admin";
import type { FormResult } from "@/lib/actions/shared";

function Done({ state }: { state: FormResult | undefined }) {
  if (!state?.ok) return null;
  return (
    <p className="flex items-center gap-1.5 text-[0.8rem] font-medium text-ok">
      <CheckIcon className="size-3.5" />
      {state.message ?? "Done."}
    </p>
  );
}

function Failed({ state }: { state: FormResult | undefined }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="text-[0.78rem] text-danger">
      {state.error}
    </p>
  );
}

/**
 * Verify or reject an achievement. Rejection requires a reason, which is what
 * the student is shown so they can fix and resubmit.
 */
export function ReviewAchievement({ achievementId }: { achievementId: string }) {
  const [state, formAction, pending] = useActionState(
    reviewAchievementAction,
    undefined,
  );
  const [rejecting, setRejecting] = useState(false);

  if (state?.ok) return <Done state={state} />;

  return (
    <div className="space-y-2">
      <Failed state={state} />

      {rejecting ? (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="achievementId" value={achievementId} />
          <input type="hidden" name="status" value="REJECTED" />
          <label htmlFor={`note-${achievementId}`} className="sr-only">
            Reason for rejection
          </label>
          <textarea
            id={`note-${achievementId}`}
            name="reviewNote"
            rows={2}
            required
            placeholder="Why it was not approved. The student sees this."
            className="field resize-y text-[0.82rem]"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="danger" disabled={pending}>
              Confirm rejection
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setRejecting(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <form action={formAction}>
            <input type="hidden" name="achievementId" value={achievementId} />
            <input type="hidden" name="status" value="VERIFIED" />
            <Button type="submit" size="sm" disabled={pending}>
              <CheckIcon className="size-3.5" />
              Verify
            </Button>
          </form>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setRejecting(true)}
          >
            <XIcon className="size-3.5" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}

export function ReviewEvent({ eventId }: { eventId: string }) {
  const [state, formAction, pending] = useActionState(reviewEventAction, undefined);

  if (state?.ok) return <Done state={state} />;

  return (
    <div className="space-y-1.5">
      <Failed state={state} />
      <div className="flex gap-2">
        <form action={formAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="status" value="APPROVED" />
          <Button type="submit" size="sm" disabled={pending}>
            <CheckIcon className="size-3.5" />
            Publish
          </Button>
        </form>
        <form action={formAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="status" value="REJECTED" />
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            Reject
          </Button>
        </form>
      </div>
    </div>
  );
}

export function ReviewSkill({ skillId }: { skillId: string }) {
  const [state, formAction, pending] = useActionState(reviewSkillAction, undefined);

  if (state?.ok) return <Done state={state} />;

  return (
    <div className="space-y-1.5">
      <Failed state={state} />
      <div className="flex gap-2">
        <form action={formAction}>
          <input type="hidden" name="skillId" value={skillId} />
          <input type="hidden" name="decision" value="approve" />
          <Button type="submit" size="sm" disabled={pending}>
            Approve
          </Button>
        </form>
        <form action={formAction}>
          <input type="hidden" name="skillId" value={skillId} />
          <input type="hidden" name="decision" value="discard" />
          <Button type="submit" size="sm" variant="ghost" disabled={pending}>
            Discard
          </Button>
        </form>
      </div>
    </div>
  );
}

export function ResolveReport({ reportId }: { reportId: string }) {
  const [state, formAction, pending] = useActionState(resolveReportAction, undefined);

  if (state?.ok) return <Done state={state} />;

  return (
    <form action={formAction}>
      <Failed state={state} />
      <input type="hidden" name="reportId" value={reportId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Mark resolved
      </Button>
    </form>
  );
}
