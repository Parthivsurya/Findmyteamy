"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { unblockUserAction } from "@/lib/actions/moderation";

export function UnblockButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(unblockUserAction, undefined);

  if (state?.ok) {
    return <span className="text-[0.78rem] text-ink-muted">Unblocked</span>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "…" : "Unblock"}
      </Button>
    </form>
  );
}
