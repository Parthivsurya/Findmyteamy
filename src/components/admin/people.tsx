"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteUserAction } from "@/lib/actions/admin";

/**
 * Deleting a person.
 *
 * The username has to be typed back before the button does anything. A plain
 * confirm button is too easy to hit for an action with no undo: twenty-three
 * relations cascade, taking their skills, teams, requests and vouches with
 * them. Typing the name is a small cost that makes the intent deliberate.
 */
export function DeleteUser({
  userId,
  username,
  name,
}: {
  userId: string;
  username: string;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(deleteUserAction, undefined);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  if (!open) {
    return (
      <Button type="button" variant="danger" size="sm" onClick={() => setOpen(true)}>
        Delete
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="username" value={username} />

      <p className="text-[0.8rem] text-ink-2">
        This removes {name} and everything of theirs, permanently. Type{" "}
        <code className="font-mono font-medium">{username}</code> to confirm.
      </p>

      <input
        name="confirm"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={username}
        autoComplete="off"
        spellCheck={false}
        className="field font-mono"
      />

      <div className="flex gap-2">
        <Button
          type="submit"
          variant="danger"
          size="sm"
          disabled={pending || typed.toLowerCase() !== username.toLowerCase()}
        >
          {pending ? "Deleting…" : "Delete permanently"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setTyped("");
          }}
        >
          Cancel
        </Button>
      </div>

      {state?.error ? (
        <p role="alert" className="text-[0.8rem] text-danger">
          {state.error}
        </p>
      ) : null}
      {state?.message ? (
        <p className="text-[0.8rem] text-ok">{state.message}</p>
      ) : null}
    </form>
  );
}
