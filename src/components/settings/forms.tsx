"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, PlusIcon } from "@/components/icons";
import {
  LeveledSkillPicker,
  type PickerSkill,
} from "@/components/search/skill-picker";
import { changePasswordAction } from "@/lib/actions/auth";
import { addAchievementAction, deleteAchievementAction } from "@/lib/actions/achievements";
import { deleteAccountAction } from "@/lib/actions/account";
import {
  updateNotificationPrefsAction,
  updateProfileAction,
  updateSkillsAction,
} from "@/lib/actions/profile";
import { ACHIEVEMENT_POSITIONS, ACHIEVEMENT_POSITION_LABEL, type AchievementPosition } from "@/lib/enums";
import type { FormResult } from "@/lib/actions/shared";
import { cn } from "@/lib/utils";

function Banner({ state }: { state: FormResult | undefined }) {
  if (state?.error) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.83rem] text-danger"
      >
        {state.error}
      </p>
    );
  }
  if (state?.ok) {
    return (
      <p className="flex items-start gap-2 rounded-xl border border-ok/30 bg-ok-soft px-3.5 py-2.5 text-[0.83rem] text-ink-2">
        <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-ok" />
        {state.message ?? "Saved."}
      </p>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------

export function ProfileForm({
  defaults,
}: {
  defaults: {
    name: string;
    username: string;
    bio: string | null;
    image: string | null;
    githubUrl: string | null;
    linkedinUrl: string | null;
    portfolioUrl: string | null;
    resumeUrl: string | null;
    showGithub: boolean;
    showLinkedin: boolean;
    showPortfolio: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, undefined);
  const error = (key: string) => state?.fieldErrors?.[key];

  return (
    <form action={formAction} className="space-y-5">
      <Banner state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="field-label">
            Full name
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={defaults.name}
            className="field"
          />
          {error("name") ? <p className="field-error">{error("name")}</p> : null}
        </div>

        <div>
          <label htmlFor="username" className="field-label">
            Username
          </label>
          <input
            id="username"
            name="username"
            defaultValue={defaults.username}
            pattern="[a-zA-Z0-9_-]+"
            className="field"
          />
          <p className="field-hint">Your profile lives at /u/{defaults.username}</p>
          {error("username") ? <p className="field-error">{error("username")}</p> : null}
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
        />
        <p className="field-hint">Up to 300 characters.</p>
      </div>

      <div>
        <label htmlFor="image" className="field-label">
          Photo URL
        </label>
        <input
          id="image"
          name="image"
          type="url"
          defaultValue={defaults.image ?? ""}
          className="field"
          placeholder="https://…"
        />
        <p className="field-hint">
          Leave empty to use your initials on the brand gradient.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="field-label">Links and what is public</legend>

        {(
          [
            ["githubUrl", "showGithub", "GitHub", "https://github.com/yourname"],
            ["linkedinUrl", "showLinkedin", "LinkedIn", "https://linkedin.com/in/yourname"],
            ["portfolioUrl", "showPortfolio", "Portfolio", "https://yoursite.dev"],
          ] as const
        ).map(([urlKey, showKey, label, placeholder]) => (
          <div key={urlKey} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label htmlFor={urlKey} className="field-label">
                {label}
              </label>
              <input
                id={urlKey}
                name={urlKey}
                type="url"
                defaultValue={defaults[urlKey] ?? ""}
                className="field"
                placeholder={placeholder}
              />
              {error(urlKey) ? <p className="field-error">{error(urlKey)}</p> : null}
            </div>
            <label className="flex items-center gap-2 pb-2 text-[0.8rem] text-ink-2">
              <input
                type="checkbox"
                name={showKey}
                defaultChecked={defaults[showKey]}
                className="size-4 accent-[var(--brand)]"
              />
              Public
            </label>
          </div>
        ))}
      </fieldset>

      <div>
        <label htmlFor="resumeUrl" className="field-label">
          Resume link
        </label>
        <input
          id="resumeUrl"
          name="resumeUrl"
          type="url"
          defaultValue={defaults.resumeUrl ?? ""}
          className="field"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function SkillsRolesForm({
  skills,
  roles,
  defaultSkills,
  defaultRoleIds,
}: {
  skills: PickerSkill[];
  roles: Array<{ id: string; name: string }>;
  defaultSkills: Array<{ skillId: string; level: string }>;
  defaultRoleIds: string[];
}) {
  const [state, formAction, pending] = useActionState(updateSkillsAction, undefined);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(defaultRoleIds);

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
    <form action={formAction} className="space-y-6">
      <Banner state={state} />

      <div>
        <h3 className="mb-2 text-[0.9rem] font-semibold">Skills</h3>
        <LeveledSkillPicker
          name="skills"
          skills={skills}
          defaultValue={defaultSkills}
        />
      </div>

      <div>
        <h3 className="mb-1 text-[0.9rem] font-semibold">Roles you can play</h3>
        <p className="mb-3 text-[0.82rem] text-ink-muted">
          Up to three. Team Builder searches by exactly these.
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
                  "rounded-full border px-3.5 py-1.5 text-[0.83rem] font-medium transition-colors",
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

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save skills and roles"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function AchievementForm() {
  const [state, formAction, pending] = useActionState(addAchievementAction, undefined);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="space-y-3">
        <Banner state={state} />
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <PlusIcon className="size-4" />
          Add an achievement
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Banner state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="title" className="field-label">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            className="field"
            placeholder="Winner – Anokha 2027 Hackathon"
          />
        </div>

        <div>
          <label htmlFor="eventName" className="field-label">
            Event
          </label>
          <input id="eventName" name="eventName" required className="field" />
        </div>

        <div>
          <label htmlFor="organizer" className="field-label">
            Organiser
          </label>
          <input id="organizer" name="organizer" className="field" />
        </div>

        <div>
          <label htmlFor="position" className="field-label">
            Position
          </label>
          <select id="position" name="position" className="field" defaultValue="WINNER">
            {ACHIEVEMENT_POSITIONS.map((position) => (
              <option key={position} value={position}>
                {ACHIEVEMENT_POSITION_LABEL[position as AchievementPosition]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="date" className="field-label">
            Date
          </label>
          <input id="date" name="date" type="date" required className="field" />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="description" className="field-label">
            What you built
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={600}
            className="field resize-y"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="proofUrl" className="field-label">
            Proof link
          </label>
          <input
            id="proofUrl"
            name="proofUrl"
            type="url"
            className="field"
            placeholder="https://… certificate or results page"
          />
          <p className="field-hint">
            Needed for verification — without proof it stays unverified and does
            not count in search filters.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add achievement"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function DeleteAchievementButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(deleteAchievementAction, undefined);

  if (state?.ok) return <span className="text-[0.78rem] text-ink-muted">Removed</span>;

  return (
    <form action={formAction}>
      <input type="hidden" name="achievementId" value={id} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        Delete
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function NotificationPrefsForm({
  defaults,
}: {
  defaults: {
    emailOnRequests: boolean;
    emailOnVerification: boolean;
    emailWeeklyDigest: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateNotificationPrefsAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      <Banner state={state} />

      {(
        [
          ["emailOnRequests", "Team invites and join requests"],
          ["emailOnVerification", "Achievement verification results"],
          ["emailWeeklyDigest", "Weekly digest of people matching my open roles"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="flex items-start gap-2.5 text-[0.87rem]">
          <input
            type="checkbox"
            name={key}
            defaultChecked={defaults[key]}
            className="mt-0.5 size-4 accent-[var(--brand)]"
          />
          {label}
        </label>
      ))}

      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <Banner state={state} />

      <div>
        <label htmlFor="currentPassword" className="field-label">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="newPassword" className="field-label">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          className="field"
        />
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

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(deleteAccountAction, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <Banner state={state} />

      <div>
        <label htmlFor="confirm" className="field-label">
          Type DELETE to confirm
        </label>
        <input
          id="confirm"
          name="confirm"
          required
          autoComplete="off"
          className="field max-w-48"
          placeholder="DELETE"
        />
      </div>

      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Deleting…" : "Delete my account permanently"}
      </Button>
    </form>
  );
}
