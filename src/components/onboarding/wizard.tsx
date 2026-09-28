"use client";

import { useActionState, useState } from "react";
import { Button, btn } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRightIcon, CheckIcon, SparklesIcon } from "@/components/icons";
import { LeveledSkillPicker, type PickerSkill } from "@/components/search/skill-picker";
import { completeOnboardingAction } from "@/lib/actions/profile";
import { AVAILABILITY, AVAILABILITY_HINT, AVAILABILITY_LABEL, type Availability } from "@/lib/enums";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "About you", hint: "Name, college and a short bio" },
  { title: "Your skills", hint: "What you can build, and how well" },
  { title: "Your roles", hint: "What you play on a team" },
  { title: "Your links", hint: "GitHub, LinkedIn, portfolio" },
  { title: "Availability", hint: "How teams should approach you" },
] as const;

/**
 * The five-step onboarding wizard.
 *
 * Every step lives in the same form and is hidden rather than unmounted, so
 * going back and forth never loses what was typed, and the whole profile is
 * saved in a single server action.
 */
export function OnboardingWizard({
  skills,
  roles,
  defaults,
}: {
  skills: PickerSkill[];
  roles: Array<{ id: string; name: string }>;
  defaults: {
    name: string;
    username: string;
    college?: string | null;
    location?: string | null;
    bio?: string | null;
    githubUrl?: string | null;
    linkedinUrl?: string | null;
    portfolioUrl?: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(completeOnboardingAction, undefined);
  const [step, setStep] = useState(0);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Availability>("OPEN");

  const isLast = step === STEPS.length - 1;
  const fieldError = (key: string) => state?.fieldErrors?.[key];

  function toggleRole(roleId: string) {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : prev.length >= 3
          ? prev
          : [...prev, roleId],
    );
  }

  return (
    <form action={formAction}>
      {/* ------------------------------------------------------ step rail */}
      <ol className="mb-6 grid gap-2 sm:grid-cols-5">
        {STEPS.map((item, index) => {
          const done = index < step;
          const active = index === step;
          return (
            <li key={item.title}>
              <button
                type="button"
                onClick={() => setStep(index)}
                className={cn(
                  "w-full rounded-box border px-3 py-2 text-left transition-colors",
                  active
                    ? "border-brand bg-brand-soft"
                    : done
                      ? "border-ok/40 bg-ok-soft"
                      : "border-line bg-surface hover:border-line-strong",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold",
                      active
                        ? "bg-brand text-white"
                        : done
                          ? "bg-ok text-white"
                          : "bg-surface-3 text-ink-2",
                    )}
                  >
                    {done ? <CheckIcon className="size-3" /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      "truncate text-[0.8rem] font-semibold",
                      active ? "text-brand" : done ? "text-ok" : "text-ink-2",
                    )}
                  >
                    {item.title}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <Card className="p-5 sm:p-6">
        <header className="mb-5">
          <h2 className="text-lg font-semibold">{STEPS[step]!.title}</h2>
          <p className="mt-0.5 text-[0.85rem] text-ink-muted">{STEPS[step]!.hint}</p>
        </header>

        {state?.error ? (
          <p
            role="alert"
            className="mb-4 rounded-box border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.83rem] text-danger"
          >
            {state.error}
          </p>
        ) : null}

        {/* ------------------------------------------------ 1. about you */}
        <div hidden={step !== 0} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="field-label">
                Full name
              </label>
              <input
                id="name"
                name="name"
                defaultValue={defaults.name}
                required
                className="field"
                placeholder="Priya Sharma"
              />
              {fieldError("name") ? <p className="field-error">{fieldError("name")}</p> : null}
            </div>

            <div>
              <label htmlFor="username" className="field-label">
                Username
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[0.82rem] text-ink-muted">/u/</span>
                <input
                  id="username"
                  name="username"
                  defaultValue={defaults.username}
                  required
                  pattern="[a-zA-Z0-9_-]+"
                  className="field"
                  placeholder="priya"
                />
              </div>
              <p className="field-hint">This is your public profile URL.</p>
              {fieldError("username") ? (
                <p className="field-error">{fieldError("username")}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="college" className="field-label">
                College or company
              </label>
              <input
                id="college"
                name="college"
                defaultValue={defaults.college ?? ""}
                className="field"
                placeholder="Anna University, Chennai"
              />
            </div>

            <div>
              <label htmlFor="location" className="field-label">
                City
              </label>
              <input
                id="location"
                name="location"
                defaultValue={defaults.location ?? ""}
                className="field"
                placeholder="Chennai"
              />
            </div>
          </div>

          <div>
            <label htmlFor="bio" className="field-label">
              Short bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              maxLength={300}
              defaultValue={defaults.bio ?? ""}
              className="field resize-y"
              placeholder="What you build, what you are looking for, and anything a team leader should know."
            />
            <p className="field-hint">Up to 300 characters.</p>
          </div>
        </div>

        {/* --------------------------------------------------- 2. skills */}
        <div hidden={step !== 1}>
          <LeveledSkillPicker name="skills" skills={skills} />
        </div>

        {/* ---------------------------------------------------- 3. roles */}
        <div hidden={step !== 2}>
          <p className="mb-3 text-[0.85rem] text-ink-muted">
            Pick up to three roles you can genuinely play. Team Builder searches
            by exactly these.
          </p>

          {selectedRoles.map((roleId) => (
            <input key={roleId} type="hidden" name="roleIds" value={roleId} />
          ))}

          <div className="flex flex-wrap gap-2">
            {roles.map((role) => {
              const active = selectedRoles.includes(role.id);
              const blocked = !active && selectedRoles.length >= 3;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  aria-pressed={active}
                  disabled={blocked}
                  className={cn(
                    "rounded-box border px-3 py-1 text-[0.83rem] font-medium transition-colors duration-120",
                    active
                      ? "border-brand bg-brand text-white"
                      : blocked
                        ? "cursor-not-allowed border-line bg-surface-2 text-ink-muted opacity-60"
                        : "border-line-strong bg-surface text-ink-2 hover:border-brand hover:text-brand",
                  )}
                >
                  {role.name}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-[0.8rem] text-ink-muted">
            {selectedRoles.length} of 3 selected
          </p>
        </div>

        {/* ---------------------------------------------------- 4. links */}
        <div hidden={step !== 3} className="space-y-4">
          <div>
            <label htmlFor="githubUrl" className="field-label">
              GitHub
            </label>
            <input
              id="githubUrl"
              name="githubUrl"
              type="url"
              defaultValue={defaults.githubUrl ?? ""}
              className="field"
              placeholder="https://github.com/yourname"
            />
            {fieldError("githubUrl") ? (
              <p className="field-error">{fieldError("githubUrl")}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="linkedinUrl" className="field-label">
              LinkedIn
            </label>
            <input
              id="linkedinUrl"
              name="linkedinUrl"
              type="url"
              defaultValue={defaults.linkedinUrl ?? ""}
              className="field"
              placeholder="https://linkedin.com/in/yourname"
            />
          </div>

          <div>
            <label htmlFor="portfolioUrl" className="field-label">
              Portfolio or website
            </label>
            <input
              id="portfolioUrl"
              name="portfolioUrl"
              type="url"
              defaultValue={defaults.portfolioUrl ?? ""}
              className="field"
              placeholder="https://yoursite.dev"
            />
          </div>

          <p className="rounded-box bg-surface-2 px-3.5 py-2.5 text-[0.8rem] text-ink-muted">
            Links are optional but each one adds to your profile completeness,
            and completeness affects where you appear in search results.
          </p>
        </div>

        {/* --------------------------------------------- 5. availability */}
        <div hidden={step !== 4} className="space-y-3">
          <input type="hidden" name="availability" value={availability} />

          {AVAILABILITY.map((option) => {
            const active = availability === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setAvailability(option)}
                aria-pressed={active}
                className={cn(
                  "flex w-full items-start gap-3 rounded-box border p-3.5 text-left transition-colors",
                  active
                    ? "border-brand bg-brand-soft"
                    : "border-line bg-surface hover:border-line-strong",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                    active ? "border-brand bg-brand" : "border-line-strong",
                  )}
                >
                  {active ? <span className="size-1.5 rounded-full bg-white" /> : null}
                </span>
                <span>
                  <span
                    className={cn(
                      "block text-[0.88rem] font-semibold",
                      active && "text-brand",
                    )}
                  >
                    {AVAILABILITY_LABEL[option as Availability]}
                  </span>
                  <span className="block text-[0.8rem] text-ink-muted">
                    {AVAILABILITY_HINT[option as Availability]}
                  </span>
                </span>
              </button>
            );
          })}

          <p className="rounded-box border border-line bg-surface-2 px-3 py-2 text-[0.8rem] text-ink-2">
            You can add achievements and mark which events you are attending
            right after this. Both make a real difference to who finds you.
          </p>
        </div>

        {/* ------------------------------------------------------ actions */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className={btn("ghost", "md", step === 0 ? "invisible" : undefined)}
          >
            Back
          </button>

          {isLast ? (
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "Creating your profile…" : "Finish and start searching"}
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className={btn("primary", "md")}
            >
              Continue
              <ArrowRightIcon className="size-4" />
            </button>
          )}
        </div>
      </Card>
    </form>
  );
}
