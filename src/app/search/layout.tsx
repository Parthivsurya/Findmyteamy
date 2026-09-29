import type { ReactNode } from "react";
import { requireOnboardedUser } from "@/lib/auth";

/**
 * The gate lives in the layout, not only in the page, because `loading.tsx`
 * below it opens a Suspense boundary: once the page segment starts streaming,
 * Next can no longer answer with an HTTP redirect and has to deliver it inside
 * the stream instead, which a client without JavaScript never acts on. Running
 * the check here keeps `/search` answering a plain 307 like every other gated
 * route, and the page keeps its skeleton.
 *
 * The page guards itself as well. That is deliberate duplication: it is the
 * check that actually has the viewer's id, and it must not stop working if
 * this file is ever removed.
 */
export default async function SearchLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireOnboardedUser("/search");
  return children;
}
