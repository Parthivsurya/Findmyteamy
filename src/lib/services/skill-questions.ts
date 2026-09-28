import { type SkillCategory } from "@/lib/enums";

/**
 * The questions put to a student, written rather than generated.
 *
 * System One answers questions about text; it does not write text. Rather than
 * keep a second provider around solely to phrase a question, these are
 * hand-written per skill category — which is also more reliable than
 * generation was: the generated ones had to be argued down from essays like
 * "How would you design a large-scale React application, covering
 * architecture, state management, performance, testing and accessibility?",
 * and each one cost a 4-14 second call that could fail.
 *
 * Every question follows the same shape, because it is the shape that
 * separates someone who has used a tool from someone who has read about it:
 *
 *   - it asks about one remembered moment, not for a definition
 *   - it asks what went wrong, what was chosen, or what surprised them
 *   - it ends with an escape hatch, so a student whose experience went
 *     differently is never stuck with nothing honest to say
 */

type Template = (skill: string) => string;

const ESCAPE = "If that has not happened to you, tell me about the closest thing.";

/** Asked for any skill, whatever its category. */
const GENERAL: Template[] = [
  (s) => `Tell me about a time something in ${s} did not behave the way you expected. What turned out to be going on, and how did you work it out? ${ESCAPE}`,
  (s) => `What is the most annoying problem you have hit while working with ${s}, and what did you end up doing about it? ${ESCAPE}`,
  (s) => `Tell me about a decision you had to make while using ${s} where there was more than one reasonable option. What did you pick, and why? ${ESCAPE}`,
];

/**
 * Category-specific phrasings. These ask about the failure modes that are
 * actually characteristic of each kind of work, which a tutorial-follower
 * tends not to have met.
 */
const BY_CATEGORY: Partial<Record<SkillCategory, Template[]>> = {
  FRONTEND: [
    (s) => `Tell me about a time something you built with ${s} looked or behaved differently than you intended in the browser. What was causing it? ${ESCAPE}`,
    (s) => `Tell me about something you built with ${s} that felt slow or janky. How did you work out what was responsible? ${ESCAPE}`,
  ],
  BACKEND: [
    (s) => `Tell me about a bug in something you built with ${s} that only showed up under real use, not while you were testing it. What was it? ${ESCAPE}`,
    (s) => `Tell me about a time you had to change how something was structured in ${s} after it was already working. What forced the change? ${ESCAPE}`,
  ],
  MOBILE: [
    (s) => `Tell me about something in your ${s} app that worked on your machine but not on a real device. What turned out to be different? ${ESCAPE}`,
  ],
  DATA_AI: [
    (s) => `Tell me about a time a model or pipeline you built with ${s} gave results you did not trust. How did you work out what was wrong? ${ESCAPE}`,
    (s) => `Tell me about a time your ${s} work was held back by the data rather than the model. What did you do? ${ESCAPE}`,
  ],
  DATABASE: [
    (s) => `Tell me about a query or schema decision in ${s} that you later had to undo or rework. What went wrong with the first version? ${ESCAPE}`,
  ],
  CLOUD_DEVOPS: [
    (s) => `Tell me about a time a deployment with ${s} failed or behaved differently from your local setup. What was the cause? ${ESCAPE}`,
    (s) => `Tell me about something in ${s} that you got wrong the first time and had to rebuild properly. What was it? ${ESCAPE}`,
  ],
  DESIGN: [
    (s) => `Tell me about a design you made in ${s} that you had to change after someone actually used it. What did you learn? ${ESCAPE}`,
    (s) => `Tell me about a time a file or component you built in ${s} became hard to work with as it grew. How did you sort it out? ${ESCAPE}`,
  ],
  EMERGING: [
    (s) => `Tell me about something in ${s} that turned out to be harder in practice than it looked in the documentation. What was it? ${ESCAPE}`,
  ],
  SOFT: [
    // Lowercased, because these skills read as activities in a sentence:
    // "your pitching did not land" rather than "your Pitching did not land".
    (s) => `Tell me about a time your ${s.toLowerCase()} did not land the way you hoped. What did you change the next time? ${ESCAPE}`,
    (s) => `Tell me about a time you had to do some ${s.toLowerCase()} for a team and it was harder than you expected. What happened? ${ESCAPE}`,
  ],
};

/**
 * Picks a question for a skill.
 *
 * `variant` rotates the phrasing so a student retaking a check does not get
 * the identical question, and two students in a room are less likely to
 * compare notes on the same one.
 */
export function questionFor(
  skillName: string,
  category: string | null | undefined,
  variant = 0,
): string {
  const specific = BY_CATEGORY[category as SkillCategory] ?? [];
  const pool = [...specific, ...GENERAL];
  const index = ((variant % pool.length) + pool.length) % pool.length;
  return pool[index]!(skillName);
}

/** How many distinct phrasings exist for a skill, for tests and for rotation. */
export function questionVariants(category: string | null | undefined): number {
  return (BY_CATEGORY[category as SkillCategory]?.length ?? 0) + GENERAL.length;
}
