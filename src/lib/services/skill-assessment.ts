import { HttpError } from "@/lib/api";
import { db } from "@/lib/db";
import { envNumber } from "@/lib/env";
import { SKILL_LEVELS, type SkillLevel } from "@/lib/enums";
import { questionFor, questionVariants } from "./skill-questions";
import {
  askSystemOne,
  confidencePercent,
  isTypeSafeConfigured,
  noulPercent,
  typeSafeModel,
  type Question,
} from "@/lib/typesafe";

/**
 * Skill assessment, in the three steps the product asks for:
 *
 *   1. put a question about the claimed framework to the student
 *   2. judge whether the answer looks machine-written
 *   3. rank the demonstrated level as beginner, intermediate or expert
 *
 * Step one needs no model. System One answers questions about text but does
 * not write text, and rather than keep a second provider around only to
 * phrase a question, the questions are written by hand per skill category in
 * ./skill-questions.ts. That is also what generation was losing to: the
 * generated questions had to be argued down from essays, and each cost a
 * 4-14 second call that could fail outright.
 *
 * Steps two and three go out as one request with separate named questions, so
 * each judgement is made independently — folded together, an answer read as
 * machine-written drags the level up and a terse human answer drags it down.
 *
 * On the authorship signal: LLM-based AI-text detection is not reliable enough
 * to decide anything on its own. It is worst exactly where this feature lives,
 * on short technical answers written by non-native English speakers. So the
 * score is recorded and, past a threshold, the attempt is FLAGGED for an admin
 * to look at. It never silently downgrades or rejects anyone.
 */

/**
 * Limits are read per call, not at module load. A value captured at import
 * time cannot be changed without restarting the process and cannot be
 * exercised by a test at all, and a process.env lookup costs nothing.
 */
const aiFlagThreshold = () => envNumber("ASSESSMENT_AI_FLAG_THRESHOLD", 80);
const attemptsPerDay = () => envNumber("ASSESSMENT_ATTEMPTS_PER_DAY", 12);
/**
 * How much probability must sit on the chosen level before the profile moves.
 *
 * Deliberately measured against that level's own share, not the `confidence`
 * System One returns for the choice. The three levels are ordered, so adjacent
 * ones compete on almost every real answer: a clear intermediate answer came
 * back 62% intermediate / 38% expert, which is only 43% confident but is not
 * remotely unsure about the level being "around intermediate". Gating on
 * confidence threw those away — measured 43 and 36 rejected against 82, 97 and
 * 100 accepted, so whether an honest answer counted was close to a coin flip.
 */
const minLevelProbability = () =>
  envNumber("ASSESSMENT_MIN_LEVEL_PROBABILITY", 55);

// ---------------------------------------------------------------------------
// Step 1 — the question
// ---------------------------------------------------------------------------

/**
 * Questions are grounded in experience rather than recall: "what goes wrong
 * when…" is harder to answer convincingly from documentation than "what does
 * X do", and it is what actually distinguishes someone who has used a tool.
 */
/** Whether skill checks are available at all. */
export function isSkillCheckEnabled(): boolean {
  return isTypeSafeConfigured();
}

/**
 * The question for a claimed skill. No model call: see ./skill-questions.ts
 * for why, and for the shape every question follows.
 */
export function questionForSkill(
  skillName: string,
  category: string | null | undefined,
  variant = 0,
): string {
  return questionFor(skillName, category, variant);
}

// ---------------------------------------------------------------------------
// The two judgements
// ---------------------------------------------------------------------------

export type AuthorshipJudgement = {
  likelihood: number;
  verdict: "LIKELY_HUMAN" | "UNCERTAIN" | "LIKELY_AI";
  signals: string[];
};

export type LevelJudgement = {
  level: SkillLevel;
  confidence: number;
  /** The chosen level's own probability, 0-100. This is what gates the profile. */
  probability: number;
  rationale: string;
  /**
   * Whether the answer actually addressed the question.
   *
   * Kept separate from the level because conflating them is unfair: an
   * earlier version ranked a detailed, clearly expert answer as BEGINNER at
   * 85% confidence purely because it described a different problem than the
   * one asked. Off-question now means inconclusive, not unskilled.
   */
  addressedQuestion: boolean;
};

// ---------------------------------------------------------------------------
// Steps 2 and 3 together, on System One
// ---------------------------------------------------------------------------

const LEVEL_CRITERIA: Record<SkillLevel, string> = {
  BEGINNER:
    "Has followed tutorials. Describes the happy path only, with no sense of failure modes or trade-offs.",
  INTERMEDIATE:
    "Has built something real. Names a concrete problem they hit and what they did about it.",
  EXPERT:
    "Reasons about trade-offs, edge cases, performance or failure modes unprompted, with specifics such as numbers, versions, tools or error messages.",
};

/**
 * Both judgements in one request.
 *
 * Preferred over the chat path when TYPESAFE_API_KEY is set: the probabilities
 * come back calibrated rather than self-reported by a chat model, there is no
 * JSON to recover from prose, and batching the questions is what TypeSafe's
 * own measurements say is cheapest and fastest.
 */
async function judgeWithSystemOne({
  skillName,
  question,
  answer,
}: {
  skillName: string;
  question: string;
  answer: string;
}): Promise<{
  authorship: AuthorshipJudgement;
  ranking: LevelJudgement;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}> {
  // Structured, because System One reads JSON and labelled keys beat a prose
  // template. criteria.true / criteria.false describe each side of a noul
  // explicitly, which separates genuine from machine-written answers far
  // better than packing both descriptions into one instruction string.
  const questions: Record<string, Question> = {
    machine_written: {
      type: "noul",
      instructions: "`student_answer` was produced by a language model rather than written by the student from their own memory.",
      criteria: {
        true: [
          "Textbook-complete coverage with nothing specific to this writer's own situation.",
          "Even-handed 'it depends on your use case' framing, or advice addressed to a general reader.",
          "Answers a broader question than the one asked.",
          "Polished, evenly-paced prose with no concrete numbers, versions, tool names or error messages.",
        ],
        false: [
          "Recalls a specific incident: what broke, what was tried, what finally worked.",
          "Mentions particular tools, versions, numbers, error text or time spent.",
          "Reads like one person's memory, including dead ends and irritation.",
          "Admits the limits of their own experience — that they followed a tutorial, that it was a course project, that they did not hit any problems, that they are unsure. A language model does not volunteer this; a beginner answering honestly does.",
          "Speaks only about themselves and their own work, rather than advising a general reader.",
          "IGNORE ENTIRELY, as none of these indicate a language model: non-native English, grammar or spelling mistakes, brevity, a plain register, being correct, or lacking depth. A thin answer from a genuine beginner is still written by a person — judge who wrote it, never how skilled they are.",
        ],
      },
    },
    addressed_question: {
      type: "noul",
      instructions: "`student_answer` engages with `question_asked`.",
      criteria: {
        true: [
          "Answers what was asked.",
          "Describes closely related first-hand experience with the same technology — a different problem with that technology still counts, because the question invites the closest thing.",
        ],
        false: [
          "Is about a different technology, or ignores the question entirely.",
        ],
      },
    },
    level: {
      type: "choice",
      instructions: {
        question: "How much hands-on experience with `technology` does `student_answer` demonstrate?",
        judge: "Substance, not fluency. A short, plain or non-native-English answer can still be expert.",
        ignore: "Whatever level the student claimed.",
      },
      criteria: LEVEL_CRITERIA,
    },
  };

  const result = await askSystemOne(
    { technology: skillName, question_asked: question, student_answer: answer },
    questions,
  );
  if (!result.ok) throw new HttpError(503, `Could not judge the answer: ${result.error}`);

  const machine = noulPercent(result.answers.machine_written);
  const addressed = noulPercent(result.answers.addressed_question);
  const levelAnswer = result.answers.level;

  if (machine === null || addressed === null || levelAnswer?.type !== "choice") {
    throw new HttpError(503, "The judgement came back in an unexpected shape");
  }

  const level = (SKILL_LEVELS as readonly string[]).includes(levelAnswer.choice)
    ? (levelAnswer.choice as SkillLevel)
    : null;
  if (!level) throw new HttpError(503, "The judgement named an unknown level");

  const confidence = confidencePercent(levelAnswer) ?? 50;
  const addressedQuestion = addressed >= 50;
  const probability = levelAnswer.probabilities?.[level] !== undefined
    ? Math.round(levelAnswer.probabilities[level] * 100)
    : confidence;

  // System One returns judgements, not prose, so the explanation is assembled
  // here from what it actually reported rather than being written by a model.
  const spread = levelAnswer.probabilities
    ? Object.entries(levelAnswer.probabilities)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, v]) => `${k.toLowerCase()} ${Math.round(v * 100)}%`)
        .join(", ")
    : "";

  // The off-question note is added once, by the caller, so it is not repeated
  // here.
  // The confidence number is recorded but kept out of this sentence: shown to
  // a student it read as a mark on their answer, which it is not.
  const rationale = [
    `Your answer reads as ${level.toLowerCase()} level`,
    spread ? ` (${spread})` : "",
    `.`,
  ].join("");

  return {
    model: result.model,
    usage: result.usage,
    authorship: {
      likelihood: machine,
      verdict: machine >= 75 ? "LIKELY_AI" : machine >= 35 ? "UNCERTAIN" : "LIKELY_HUMAN",
      signals: [],
    },
    ranking: { level, confidence, probability, rationale, addressedQuestion },
  };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

const MIN_ANSWER_CHARS = 60;
const MAX_ANSWER_CHARS = 4000;

/** Starts an attempt: picks the question and records it so the answer is bound to it. */
export async function startAssessment({
  userId,
  skillId,
}: {
  userId: string;
  skillId: string;
}) {
  if (!isSkillCheckEnabled()) {
    throw new HttpError(503, "Skill checks are not available right now");
  }

  const claim = await db.userSkill.findUnique({
    where: { userId_skillId: { userId, skillId } },
    include: { skill: { select: { name: true, category: true } } },
  });
  if (!claim) throw new HttpError(404, "Add that skill to your profile first");

  const since = new Date(Date.now() - 86_400_000);
  const today = await db.skillAssessment.count({
    where: { userId, createdAt: { gte: since } },
  });
  if (today >= attemptsPerDay()) {
    throw new HttpError(429, "You have taken enough skill checks today. Try again tomorrow.");
  }

  // A question already waiting for an answer is reused, so refreshing the page
  // cannot reroll it until something easier turns up.
  const open = await db.skillAssessment.findFirst({
    where: { userId, skillId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (open) return open;

  // Rotate the phrasing by how many checks this student has taken for this
  // skill, so a retake is not the identical question.
  const taken = await db.skillAssessment.count({ where: { userId, skillId } });
  const question = questionForSkill(
    claim.skill.name,
    claim.skill.category,
    taken % Math.max(1, questionVariants(claim.skill.category)),
  );

  return db.skillAssessment.create({
    data: {
      userId,
      skillId,
      claimedLevel: claim.level,
      question,
      answer: "",
      model: typeSafeModel(),
    },
  });
}

/** Submits an answer and runs both judgements. */
export async function submitAssessment({
  assessmentId,
  userId,
  answer,
}: {
  assessmentId: string;
  userId: string;
  answer: string;
}) {
  const attempt = await db.skillAssessment.findUnique({
    where: { id: assessmentId },
    include: { skill: { select: { name: true } } },
  });

  if (!attempt) throw new HttpError(404, "That skill check does not exist");
  if (attempt.userId !== userId) throw new HttpError(403, "That skill check is not yours");
  if (attempt.status !== "PENDING") throw new HttpError(409, "That skill check was already answered");

  const trimmed = answer.trim();
  if (trimmed.length < MIN_ANSWER_CHARS) {
    throw new HttpError(400, `Write a little more, at least ${MIN_ANSWER_CHARS} characters.`);
  }
  if (trimmed.length > MAX_ANSWER_CHARS) {
    throw new HttpError(400, "That answer is too long.");
  }

  try {
    const judged = await judgeWithSystemOne({
      skillName: attempt.skill.name,
      question: attempt.question,
      answer: trimmed,
    });
    const { authorship, ranking } = judged;
    const judgedBy = judged.model;
    const usage = judged.usage;

    // Past the threshold the attempt goes to an admin rather than being acted
    // on automatically, and the level is still recorded either way.
    const flagged = authorship.likelihood >= aiFlagThreshold();
    const tooClose = ranking.probability < minLevelProbability();

    // The profile moves only on a judgement that is unflagged, on-question and
    // decided. Every other path has to say so: an earlier version told the
    // student "Assessed as intermediate" and then changed nothing, which is
    // indistinguishable from the feature being broken.
    const applied = !flagged && ranking.addressedQuestion && !tooClose;
    const note = !ranking.addressedQuestion
      ? "This answered a different question, so your claimed level was left as it is."
      : flagged
        ? "An admin will look this over before your profile changes."
        : tooClose
          ? "The levels came out too close to call, so your claimed level was left as it is. Answering with more of what you actually did will separate them."
          : "";

    const saved = await db.skillAssessment.update({
      where: { id: attempt.id },
      data: {
        answer: trimmed,
        assessedLevel: ranking.level,
        confidence: ranking.confidence,
        rationale: [ranking.rationale, note].filter(Boolean).join(" "),
        aiLikelihood: authorship.likelihood,
        aiVerdict: authorship.verdict,
        aiSignals: JSON.stringify(authorship.signals),
        status: flagged ? "FLAGGED" : "ASSESSED",
        model: judgedBy,
        inputTokens: usage?.inputTokens,
        outputTokens: usage?.outputTokens,
        completedAt: new Date(),
      },
    });

    if (applied) {
      await db.userSkill.update({
        where: { userId_skillId: { userId, skillId: attempt.skillId } },
        data: { assessedLevel: ranking.level, assessedAt: new Date() },
      });
    }

    return { ...saved, applied };
  } catch (error) {
    const message = error instanceof HttpError ? error.message : "The skill check could not be completed";
    await db.skillAssessment.update({
      where: { id: attempt.id },
      data: { answer: trimmed, status: "FAILED", error: message, completedAt: new Date() },
    });
    throw error instanceof HttpError ? error : new HttpError(503, message);
  }
}

export async function listAssessments(userId: string) {
  return db.skillAssessment.findMany({
    where: { userId },
    include: { skill: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function listFlaggedAssessments() {
  return db.skillAssessment.findMany({
    where: { status: "FLAGGED" },
    include: {
      skill: { select: { name: true } },
      user: { select: { name: true, username: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
}
