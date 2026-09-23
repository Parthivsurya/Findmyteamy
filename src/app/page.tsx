import Link from "next/link";
import { academicSummary, studyYearLabel } from "@/lib/amrita";
import { HomeSearch } from "@/components/search/home-search";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSkills } from "@/lib/services/catalog";

export const revalidate = 60;

/** The home page is one thing: search for a teammate by skill. */
export default async function LandingPage() {
  const [user, skills] = await Promise.all([getCurrentUser(), getSkills()]);

  // Only used to label the two filters with the student's own year and branch.
  const me = user
    ? await db.user.findUnique({
        where: { id: user.id },
        select: { branchCode: true, joiningYear: true, programYears: true },
      })
    : null;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
      <h1 className="text-xl font-semibold">Search for a teammate by skills</h1>
      <p className="mt-1.5 text-[0.88rem] text-ink-muted">
        Find people from your own year or branch for your next hackathon.
      </p>

      <div className="mt-5">
        <HomeSearch
          skills={skills}
          signedIn={Boolean(user)}
          myBranch={me?.branchCode ? me.branchCode.toUpperCase() : null}
          myYearLabel={studyYearLabel(me?.joiningYear, me?.programYears)}
        />
      </div>

      <p className="mt-5 text-[0.85rem] text-ink-muted">
        {user ? (
          <>
            Signed in as {user.name}
            {academicSummary(me ?? {}) ? ` · ${academicSummary(me ?? {})}` : ""}
          </>
        ) : (
          <>
            <Link href="/login" className="font-medium text-brand hover:underline">
              Sign in
            </Link>{" "}
            with your Amrita email, or{" "}
            <Link href="/signup" className="font-medium text-brand hover:underline">
              create an account
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}
