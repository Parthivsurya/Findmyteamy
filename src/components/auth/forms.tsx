"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/icons";
import {
  forgotPasswordAction,
  loginAction,
  resendCodeAction,
  resetPasswordAction,
  signupAction,
  verifyEmailAction,
} from "@/lib/actions/auth";
import { studentEmailProblem } from "@/lib/amrita";
import { passwordProblem } from "@/lib/password-rules";
import type { FormResult } from "@/lib/actions/shared";

function Alert({ state }: { state: FormResult | undefined }) {
  if (!state?.error) return null;
  return (
    <p
      role="alert"
      className="rounded-box border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.83rem] text-danger"
    >
      {state.error}
    </p>
  );
}

function Notice({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-start gap-2 rounded-box border border-ok/30 bg-ok-soft px-3.5 py-2.5 text-[0.83rem] text-ink-2">
      <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-ok" />
      {message}
    </p>
  );
}

// ---------------------------------------------------------------------------

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Alert state={state} />

      <div>
        <label htmlFor="email" className="field-label">
          Amrita email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          spellCheck={false}
          className="field font-mono text-[0.85rem]"
          placeholder="cb.xx.xx.xxx.xxxxx@cb.students.amrita.edu"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="field-label">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-[0.78rem] font-medium text-brand hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="field"
          placeholder="Your password"
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function SignupForm({ vouchToken }: { vouchToken?: string } = {}) {
  const [state, formAction, pending] = useActionState(signupAction, undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Live guidance, because the roll-address format is easy to mistype.
  const emailHint = email.length > 6 ? studentEmailProblem(email) : null;
  const pwHint = password.length > 0 ? passwordProblem(password) : null;

  return (
    <form action={formAction} className="space-y-4">
      <Alert state={state} />
      {vouchToken ? (
        <input type="hidden" name="vouch" value={vouchToken} />
      ) : null}

      <div>
        <label htmlFor="name" className="field-label">
          Full name
        </label>
        <input
          id="name"
          name="name"
          required
          autoComplete="name"
          className="field"
          placeholder="Ananya Nair"
        />
      </div>

      <div>
        <label htmlFor="email" className="field-label">
          Amrita email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field font-mono text-[0.85rem]"
          placeholder="cb.xx.xx.xxx.xxxxx@cb.students.amrita.edu"
        />
        {emailHint ? (
          <p className="field-error">{emailHint}</p>
        ) : (
          <p className="field-hint">
            Your campus, school, branch and joining year are read from this
            address, nothing to fill in by hand.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          Create a password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field"
          placeholder="At least 8 characters"
        />
        {pwHint ? (
          <p className="field-error">{pwHint}</p>
        ) : (
          <p className="field-hint">At least 8 characters, with a letter and a number.</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="field-label">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className="field"
        />
        {state?.fieldErrors?.confirmPassword ? (
          <p className="field-error">{state.fieldErrors.confirmPassword}</p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending your code…" : "Create account"}
      </Button>

      <p className="text-[0.78rem] leading-relaxed text-ink-muted">
        We will email a six-digit code to confirm the address belongs to you.
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function VerifyForm({
  email,
  devCode,
  purpose = "SIGNUP",
  vouchToken,
}: {
  email: string;
  devCode?: string;
  purpose?: "SIGNUP" | "RESET";
  /** Attached only once the address is confirmed, never before. */
  vouchToken?: string;
}) {
  const [state, formAction, pending] = useActionState(verifyEmailAction, undefined);
  const [resendState, resendAction, resending] = useActionState(
    resendCodeAction,
    undefined,
  );

  return (
    <div className="space-y-4">
      {devCode ? (
        <p className="rounded-box border border-warn/30 bg-warn-soft px-3.5 py-2.5 text-[0.83rem] text-warn">
          SMTP is not configured on this server, so the code is shown here for
          development: <strong className="font-mono text-base">{devCode}</strong>
        </p>
      ) : null}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        {vouchToken ? (
          <input type="hidden" name="vouch" value={vouchToken} />
        ) : null}
        <Alert state={state} />

        <div>
          <label htmlFor="code" className="field-label">
            Six-digit code
          </label>
          <input
            id="code"
            name="code"
            required
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete="one-time-code"
            autoFocus
            className="field text-center font-mono text-2xl tracking-[0.5em]"
            placeholder="000000"
            defaultValue={devCode ?? ""}
          />
          <p className="field-hint">Sent to {email}. It expires in 10 minutes.</p>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Checking…" : "Confirm and continue"}
        </Button>
      </form>

      <form action={resendAction}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="purpose" value={purpose} />
        <Notice message={resendState?.message} />
        {resendState?.error ? (
          <p role="alert" className="mb-2 text-[0.8rem] text-danger">
            {resendState.error}
          </p>
        ) : null}
        <Button type="submit" variant="ghost" size="sm" disabled={resending}>
          {resending ? "Sending…" : "Send a new code"}
        </Button>
        {/* Amrita's filter tags our mail as likely spam, so the code often
            lands in Junk. Saying so is the difference between a student
            finding their code and assuming the site is broken. */}
        <p className="field-hint">
          Nothing arrived? Check your Junk folder before asking for another
          code. Marking the message as not junk will help the next one reach
          your inbox.
        </p>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <Alert state={state} />

      <div>
        <label htmlFor="email" className="field-label">
          Amrita email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          spellCheck={false}
          className="field font-mono text-[0.85rem]"
          placeholder="cb.xx.xx.xxx.xxxxx@cb.students.amrita.edu"
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Email me a reset code"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({
  email,
  devCode,
}: {
  email: string;
  devCode?: string;
}) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, undefined);
  const [password, setPassword] = useState("");
  const pwHint = password.length > 0 ? passwordProblem(password) : null;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="email" value={email} />
      <Alert state={state} />

      {devCode ? (
        <p className="rounded-box border border-warn/30 bg-warn-soft px-3.5 py-2.5 text-[0.83rem] text-warn">
          SMTP is not configured, so the code is shown for development:{" "}
          <strong className="font-mono text-base">{devCode}</strong>
        </p>
      ) : null}

      <div>
        <label htmlFor="code" className="field-label">
          Six-digit code
        </label>
        <input
          id="code"
          name="code"
          required
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          className="field text-center font-mono text-xl tracking-[0.4em]"
          placeholder="000000"
          defaultValue={devCode ?? ""}
        />
        <p className="field-hint">Sent to {email}.</p>
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field"
        />
        {pwHint ? <p className="field-error">{pwHint}</p> : null}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="field-label">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className="field"
        />
        {state?.fieldErrors?.confirmPassword ? (
          <p className="field-error">{state.fieldErrors.confirmPassword}</p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Set new password and sign in"}
      </Button>
    </form>
  );
}
