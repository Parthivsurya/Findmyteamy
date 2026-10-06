"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  createVouchAction,
  revokeVouchAction,
  setVouchHiddenAction,
} from "@/lib/actions/vouch";
import type { FormResult } from "@/lib/actions/shared";

function Notice({ state }: { state: FormResult | undefined }) {
  if (state?.error) {
    return (
      <p
        role="alert"
        className="rounded-box border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.83rem] text-danger"
      >
        {state.error}
      </p>
    );
  }
  if (state?.message) {
    return (
      <p className="rounded-box border border-ok/30 bg-ok-soft px-3.5 py-2.5 text-[0.83rem] text-ok">
        {state.message}
      </p>
    );
  }
  return null;
}

/**
 * Writing a vouch.
 *
 * The roll number is the only identifier asked for, because it is what
 * students actually know about each other and what makes the resulting link
 * safe to forward: it only works for the person it names.
 */
export function VouchForm({ ownCampus }: { ownCampus?: string | null }) {
  const [state, formAction, pending] = useActionState(createVouchAction, undefined);
  const [statement, setStatement] = useState("");

  const remaining = 400 - statement.length;
  const tooShort = statement.length > 0 && statement.length < 20;

  return (
    <form action={formAction} className="space-y-4">
      <Notice state={state} />

      <div>
        <label htmlFor="shortRoll" className="field-label">
          Their roll number
        </label>
        <input
          id="shortRoll"
          name="shortRoll"
          placeholder="cse24535"
          autoComplete="off"
          spellCheck={false}
          className="field font-mono"
          required
        />
        <p className="field-hint">
          The part in the middle of their Amrita address.
          {ownCampus ? ` Assumed to be ${ownCampus.toUpperCase()} campus, like yours.` : ""}
        </p>
        {state?.fieldErrors?.shortRoll ? (
          <p className="field-error">{state.fieldErrors.shortRoll}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="statement" className="field-label">
          Why are you vouching for them?
        </label>
        <textarea
          id="statement"
          name="statement"
          rows={3}
          maxLength={400}
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="We were teammates at Anokha and they built the whole recommendation engine."
          className="field"
          required
        />
        <p className="field-hint">
          Everyone who sees their profile reads this, with your name on it. Be
          specific: what did you build together, and what did they do?
          <span className="ml-1 tabular-nums">
            {tooShort ? `${20 - statement.length} more characters` : `${remaining} left`}
          </span>
        </p>
        {state?.fieldErrors?.statement ? (
          <p className="field-error">{state.fieldErrors.statement}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create vouch link"}
      </Button>
    </form>
  );
}

/** Copies a link without needing a toast system. */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard access can be refused; the link is on screen regardless.
        }
      }}
      className="shrink-0 rounded-box border border-line-strong px-2 py-1 text-[0.78rem] font-medium text-ink-2 transition-colors duration-120 hover:bg-surface-2 active:translate-y-px"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/** Withdrawing a statement you wrote. Never removes their account. */
export function RevokeVouchButton({ vouchId }: { vouchId: string }) {
  const [state, formAction, pending] = useActionState(revokeVouchAction, undefined);

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="vouchId" value={vouchId} />
      <Button type="submit" variant="danger" size="sm" disabled={pending}>
        {pending ? "Withdrawing…" : "Withdraw"}
      </Button>
      {state?.error ? (
        <span className="ml-2 text-[0.78rem] text-danger">{state.error}</span>
      ) : null}
    </form>
  );
}

/** Hiding a statement someone wrote about you. */
export function HideVouchButton({
  vouchId,
  hidden,
}: {
  vouchId: string;
  hidden: boolean;
}) {
  const [state, formAction, pending] = useActionState(setVouchHiddenAction, undefined);

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="vouchId" value={vouchId} />
      <input type="hidden" name="hidden" value={hidden ? "false" : "true"} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Saving…" : hidden ? "Show on profile" : "Hide from profile"}
      </Button>
      {state?.error ? (
        <span className="ml-2 text-[0.78rem] text-danger">{state.error}</span>
      ) : null}
    </form>
  );
}
