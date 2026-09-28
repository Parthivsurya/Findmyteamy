import Link from "next/link";
import { academicSummary, studyYearLabel } from "@/lib/amrita";
import { HomeSearch } from "@/components/search/home-search";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSkills } from "@/lib/services/catalog";

export const revalidate = 60;

/**
 * The home page is one thing: search for a teammate by skill.
 *
 * Left-aligned rather than centred, and the search form is the only thing on
 * it. There is no feature grid, no screenshot and no stock photography,
 * because the form is the product: a student who lands here wants to type a
 * skill, not read about the site. Anything else on this page would push the
 * one control that matters further down the screen.
 */
export default async function LandingPage() {
  const [user, skills] = await Promise.all([getCurrentUser(), getSkills()]);

  // Only used to label the two filters with the student's own year and branch.
  const me = user
    ? await db.user.findUnique({
        where: { id: user.id },
        select: { branchCode: true, joiningYear: true, programYears: true },
      })
    : null;

  const summary = academicSummary(me ?? {});

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
      <h1 className="text-[1.6rem] leading-[1.15] sm:text-[1.9rem]">
        Search for a teammate by skills
      </h1>
      <p className="mt-2 text-[0.92rem] text-ink-muted">
        Find people from your own year or branch for your next hackathon.
      </p>

      <div className="mt-7">
        <HomeSearch
          skills={skills}
          signedIn={Boolean(user)}
          myBranch={me?.branchCode ? me.branchCode.toUpperCase() : null}
          myYearLabel={studyYearLabel(me?.joiningYear, me?.programYears)}
        />
      </div>

      <p className="rule mt-8 pt-4 text-[0.85rem] text-ink-muted">
        {user ? (
          <>
            Signed in as {user.name}
            {summary ? `, ${summary}` : ""}
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="font-medium text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
            >
              Sign in
            </Link>{" "}
            with your Amrita email, or{" "}
            <Link
              href="/signup"
              className="font-medium text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
            >
              create an account
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}
