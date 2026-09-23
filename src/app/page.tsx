import Link from "next/link";
import { btn } from "@/components/ui/button";
import { SparklesIcon } from "@/components/icons";
import { academicSummary, studyYearLabel } from "@/lib/amrita";
import { HomeSearch } from "@/components/search/home-search";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSkills } from "@/lib/services/catalog";

export const revalidate = 60;

/**
 * The home page is deliberately one thing: search for a teammate by skill.
 * Everything else lives behind the header nav.
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

  return (
    <section className="hero-grid relative flex min-h-[calc(100dvh-3.5rem)] items-center overflow-hidden brand-gradient">
      <div className="relative mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(255_255_255/0.16)] px-3 py-1 text-[0.78rem] font-semibold text-white ring-1 ring-inset ring-[rgb(255_255_255/0.28)]">
              <SparklesIcon className="size-3.5" />
              Amrita Vishwa Vidyapeetham
            </span>

            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-white sm:text-5xl">
              Search for a teammate{" "}
              <span className="text-[#F2F7A0]">by skills</span>.
            </h1>

            <p className="mt-4 max-w-lg text-[1.02rem] leading-relaxed text-[rgb(255_255_255/0.85)]">
              Find people from your own year or branch for your next hackathon.
            </p>

            {user ? (
              <p className="mt-7 text-[0.88rem] text-[rgb(255_255_255/0.8)]">
                Signed in as {user.name}
                {academicSummary(me ?? {}) ? ` · ${academicSummary(me ?? {})}` : ""}
              </p>
            ) : (
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/login" className={btn("lime", "lg", "shadow-float")}>
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center justify-center rounded-[10px] border border-[rgb(255_255_255/0.45)] px-6 text-[0.95rem] font-semibold text-white transition-colors hover:bg-[rgb(255_255_255/0.14)]"
                >
                  Create account
                </Link>
              </div>
            )}
          </div>

          <HomeSearch
            skills={skills}
            signedIn={Boolean(user)}
            myBranch={me?.branchCode ? me.branchCode.toUpperCase() : null}
            myYearLabel={studyYearLabel(me?.joiningYear, me?.programYears)}
          />
        </div>
      </div>
    </section>
  );
}
