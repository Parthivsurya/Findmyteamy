import { Button, btn } from "@/components/ui/button";
import { CheckIcon } from "@/components/icons";
import { setParticipationAction } from "@/lib/actions/events";
import {
  PARTICIPATION_STATUSES,
  PARTICIPATION_STATUS_LABEL,
  type ParticipationStatus,
} from "@/lib/enums";

/**
 * "I'm attending" — and, because the whole point is to say what you need, it
 * asks for your status for this event in the same step.
 */
export function AttendForm({
  eventId,
  slug,
  currentStatus,
}: {
  eventId: string;
  slug: string;
  currentStatus: string | null;
}) {
  if (!currentStatus) {
    return (
      <form action={setParticipationAction} className="space-y-2">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="slug" value={slug} />

        <label htmlFor="attend-status" className="field-label">
          Mark yourself as attending
        </label>
        <select
          id="attend-status"
          name="status"
          defaultValue="LOOKING_FOR_TEAM"
          className="field"
        >
          {PARTICIPATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {PARTICIPATION_STATUS_LABEL[status as ParticipationStatus]}
            </option>
          ))}
        </select>
        <Button type="submit" className="w-full">
          I&rsquo;m attending
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="flex items-center gap-2 text-[0.85rem] font-medium text-ok">
        <CheckIcon className="size-4" />
        You are attending this event
      </p>

      <form action={setParticipationAction} className="space-y-2">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="slug" value={slug} />

        <label htmlFor="attend-status" className="field-label">
          Your status
        </label>
        <select
          id="attend-status"
          name="status"
          defaultValue={currentStatus}
          className="field"
        >
          {PARTICIPATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {PARTICIPATION_STATUS_LABEL[status as ParticipationStatus]}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm" className="w-full">
          Update status
        </Button>
      </form>

      <form action={setParticipationAction}>
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="status" value="LEAVE" />
        <button type="submit" className={btn("ghost", "sm", "w-full")}>
          No longer attending
        </button>
      </form>
    </div>
  );
}
