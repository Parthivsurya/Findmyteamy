"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, btn } from "@/components/ui/button";
import { submitAssessmentAction, startAssessmentAction } from "@/lib/actions/assessment";
import { SKILL_LEVEL_LABEL, type SkillLevel } from "@/lib/enums";

/** The answer form for one open skill check. */
export function SkillCheckForm({
  assessmentId,
  question,
  skillName,
  claimedLevel,
}: {
  assessmentId: string;
  question: string;
  skillName: string;
  claimedLevel: string;
}) {
  const [state, formAction, pending] = useActionState(submitAssessmentAction, undefined);

  if (state?.ok) {
    return (
      <div className="space-y-4">
        <div className="rounded border border-ok/40 bg-ok-soft px-4 py-3 text-[0.88rem] text-ink-2">
          {state.message}
        </div>
        <Link href="/settings/skills" className={btn("outline", "md")}>
          Back to skills
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="assessmentId" value={assessmentId} />

      {state?.error ? (
        <p
          role="alert"
          className="rounded border border-danger/40 bg-danger-soft px-3.5 py-2.5 text-[0.85rem] text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <div className="rounded border border-line bg-surface-2 p-4">
        <p className="mb-1 text-[0.72rem] font-bold uppercase tracking-wider text-ink-muted">
          {skillName} · you claimed {SKILL_LEVEL_LABEL[claimedLevel as SkillLevel] ?? claimedLevel}
        </p>
        <p className="text-[0.95rem] leading-relaxed">{question}</p>
      </div>

      <div>
        <label htmlFor="answer" className="field-label">
          Your answer
        </label>
        <textarea
          id="answer"
          name="answer"
          rows={8}
          required
          minLength={60}
          maxLength={4000}
          className="field resize-y"
          placeholder="Answer from your own experience. Three or four sentences is plenty — specifics matter more than length."
        />
        {state?.fieldErrors?.answer ? (
          <p className="field-error">{state.fieldErrors.answer}</p>
        ) : (
          <p className="field-hint">
            Write it yourself. Answers are checked for machine-written text, and a
            flagged answer goes to an admin instead of updating your profile.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Checking your answer…" : "Submit answer"}
        </Button>
        <Link href="/settings/skills" className={btn("ghost", "md")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

/** "Take the check" button shown next to each saved skill. */
export function StartSkillCheckButton({
  skillId,
  label,
}: {
  skillId: string;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(startAssessmentAction, undefined);

  return (
    <form action={formAction} className="shrink-0">
      <input type="hidden" name="skillId" value={skillId} />
      {state?.error ? (
        <p role="alert" className="mb-1 text-[0.75rem] text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Preparing…" : label}
      </Button>
    </form>
  );
}

/** Shows what a previous check concluded. */
export function AssessedBadge({
  assessedLevel,
  claimedLevel,
}: {
  assessedLevel: string | null;
  claimedLevel: string;
}) {
  if (!assessedLevel) return <Badge tone="neutral">Not checked</Badge>;

  const order = ["BEGINNER", "INTERMEDIATE", "EXPERT"];
  const diff = order.indexOf(assessedLevel) - order.indexOf(claimedLevel);
  const tone = diff === 0 ? "ok" : diff > 0 ? "sky" : "warn";
  const label = SKILL_LEVEL_LABEL[assessedLevel as SkillLevel] ?? assessedLevel;

  return (
    <Badge tone={tone}>
      {diff === 0 ? "Confirmed" : diff > 0 ? "Above claim" : "Below claim"}: {label}
    </Badge>
  );
}
