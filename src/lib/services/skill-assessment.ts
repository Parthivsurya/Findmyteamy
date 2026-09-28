import { HttpError } from "@/lib/api";
import { db } from "@/lib/db";
import { envNumber } from "@/lib/env";
import { SKILL_LEVELS, type SkillLevel } from "@/lib/enums";
import { chatJson, isOpenRouterConfigured, openRouterModel } from "@/lib/openrouter";
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
 * Two and three are separate model calls on purpose. Folding them together
 * lets the authorship judgement colour the level judgement — an answer read as
 * "AI-written" drags the level up, and a terse human answer drags it down —
 * and the two need to be weighed differently afterwards.
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
/** Below this, the judgement is recorded but the profile is left alone. */
const minConfidence = () => envNumber("ASSESSMENT_MIN_CONFIDENCE", 60);

// ---------------------------------------------------------------------------
// Step 1 — the question
// ---------------------------------------------------------------------------

/**
 * Questions are grounded in experience rather than recall: "what goes wrong
 * when…" is harder to answer convincingly from documentation than "what does
 * X do", and it is what actually distinguishes someone who has used a tool.
 */
/**
 * Whether skill checks are available at all. Either provider is enough: the
 * judgements need TypeSafe or OpenRouter, and the question falls back to a
 * template when nothing can generate one.
 */
export function isSkillCheckEnabled(): boolean {
  return isTypeSafeConfigured() || isOpenRouterConfigured();
}

/**
 * A question that needs no generative model.
 *
 * System One answers questions about text; it does not write text. So when
 * only TypeSafe is configured there is nothing to generate a question with,
 * and this template stands in. It is deliberately the same shape the model is
 * asked to produce — one remembered moment, with an escape hatch.
 */
export function templateQuestion(skillName: string): string {
  return `Tell me about a time something in ${skillName} did not behave the way you expected. What turned out to be going on, and how did you work it out? If that has not happened to you, tell me about the closest thing.`;
}

export async function generateQuestion(
  skillName: string,
  claimedLevel: SkillLevel,
): Promise<string> {
  // No generative model available: fall back rather than refuse the feature.
  if (!isOpenRouterConfigured()) return templateQuestion(skillName);

  const result = await chatJson<{ question: string }>(
    [
      {
        role: "system",
        content: [
          "You set one short question that reveals whether a student has actually used a technology, for a university hackathon-team platform.",
          "",
          "The question must ask about their own past experience. Aim it at a specific moment: something that broke, something they had to choose between, something that surprised them.",
          "",
          "GOOD examples of the shape to aim for:",
          '- "Tell me about a time something in React did not re-render when you expected it to. What was actually going on?"',
          '- "What is the most annoying problem you have hit deploying with Docker, and what did you end up doing about it?"',
          "",
          "BAD examples, never write these:",
          '- "How would you design a large-scale React application, covering architecture, state management, performance, testing and accessibility?" (an essay, not a question; nobody answers this in a paragraph)',
          '- "What is the virtual DOM?" (recall; documentation answers it)',
          '- "Explain the difference between props and state." (recall)',
          "",
          "Hard rules:",
          "- One question, at most 40 words.",
          "- Answerable honestly in three to six sentences.",
          "- Ask about ONE thing. Never list several topics to cover.",
          "- Do not ask for code.",
          "- End with a short escape hatch so an honest student is never stuck, e.g. \"If that has not happened to you, tell me about the closest thing.\" A question this specific otherwise punishes people whose real experience simply went differently.",
          "- Someone who has genuinely used the technology at the claimed level should find it easy; someone who has only read about it should not.",
          'Reply as JSON: {"question": "..."}',
        ].join("\n"),
      },
      {
        role: "user",
        content: `Technology: ${skillName}\nClaimed level: ${claimedLevel}`,
      },
    ],
    (v) => {
      const q = (v as { question?: unknown })?.question;
      return typeof q === "string" && q.trim().length > 15 ? { question: q.trim() } : null;
    },
    { temperature: 0.7, maxTokens: 600 },
  );

  if (!result.ok) throw new HttpError(503, `Could not prepare a question: ${result.error}`);
  return result.data.question;
}

// ---------------------------------------------------------------------------
// Step 2 — authorship signal
// ---------------------------------------------------------------------------

export type AuthorshipJudgement = {
  likelihood: number;
  verdict: "LIKELY_HUMAN" | "UNCERTAIN" | "LIKELY_AI";
  signals: string[];
};

export async function detectAiAuthorship(
  question: string,
  answer: string,
): Promise<AuthorshipJudgement> {
  const result = await chatJson<AuthorshipJudgement>(
    [
      {
        role: "system",
        content: [
          "You estimate whether a short technical answer was written by a language model or by a person.",
          "Be calibrated and conservative. Most answers are human.",
          "Do NOT treat any of these as evidence of machine writing:",
          "- non-native English, grammar slips, spelling mistakes, or unusual word order",
          "- brevity, bullet points, or a plain factual register",
          "- correct technical content, or confident phrasing",
          "Signals that do suggest a language model:",
          "- textbook completeness with no specifics of the writer's own situation",
          "- hedging boilerplate and even-handed 'it depends on your use case' framing",
          "- answering a different, more general question than the one asked",
          "- polished rhythm with no concrete numbers, tool versions, error messages or anecdotes",
          "Return likelihood as an integer 0-100 that a language model wrote it.",
          "Use LIKELY_HUMAN below 35, UNCERTAIN from 35 to 74, LIKELY_AI at 75 or above.",
          'Reply as JSON: {"likelihood": 0-100, "verdict": "LIKELY_HUMAN|UNCERTAIN|LIKELY_AI", "signals": ["..."]}',
        ].join("\n"),
      },
      { role: "user", content: `Question asked:\n${question}\n\nAnswer given:\n${answer}` },
    ],
    (v) => {
      const o = v as { likelihood?: unknown; verdict?: unknown; signals?: unknown };
      const n = typeof o.likelihood === "number" ? Math.round(o.likelihood) : NaN;
      const verdicts = ["LIKELY_HUMAN", "UNCERTAIN", "LIKELY_AI"];
      if (!Number.isFinite(n) || n < 0 || n > 100) return null;
      if (typeof o.verdict !== "string" || !verdicts.includes(o.verdict)) return null;
      return {
        likelihood: n,
        verdict: o.verdict as AuthorshipJudgement["verdict"],
        signals: Array.isArray(o.signals)
          ? o.signals.filter((x): x is string => typeof x === "string").slice(0, 5)
          : [],
      };
    },
    { temperature: 0, maxTokens: 700 },
  );

  if (!result.ok) throw new HttpError(503, `Could not check the answer: ${result.error}`);
  return result.data;
}

// ---------------------------------------------------------------------------
// Step 3 — the ranking
// ---------------------------------------------------------------------------

export type LevelJudgement = {
  level: SkillLevel;
  confidence: number;
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

export async function rankSkillLevel({
  skillName,
  claimedLevel,
  question,
  answer,
}: {
  skillName: string;
  claimedLevel: SkillLevel;
  question: string;
  answer: string;
}): Promise<LevelJudgement> {
  const result = await chatJson<LevelJudgement>(
    [
      {
        role: "system",
        content: [
          "You rank how much hands-on experience a short answer demonstrates, for a university hackathon-team platform.",
          "Rank only what the answer shows. Ignore what the student claimed.",
          "BEGINNER: has followed tutorials; describes the happy path; no sense of failure modes or trade-offs.",
          "INTERMEDIATE: has built something real; names concrete problems hit and how they were handled.",
          "EXPERT: reasons about trade-offs, edge cases, performance or failure modes unprompted, with specifics.",
          "Judge substance, not fluency. Short, plain or non-native English answers can be EXPERT.",
          "Set addressedQuestion to false only if the answer is about something genuinely unrelated to the question. Closely related experience with the same technology counts as addressing it — the question offers an escape hatch for exactly that, and a student whose real experience went slightly differently is not dodging.",
          "When it is false, still rank the depth the answer does show, and lower your confidence — an answer about the wrong problem is inconclusive, not unskilled. Never mark someone down to BEGINNER merely for drifting off the question.",
          "Confidence is an integer 0-100 in your own ranking; be honest when an answer is too short to tell.",
          "The rationale is one sentence, addressed to the student, plain and specific.",
          'Reply as JSON: {"level": "BEGINNER|INTERMEDIATE|EXPERT", "confidence": 0-100, "addressedQuestion": true|false, "rationale": "..."}',
        ].join("\n"),
      },
      {
        role: "user",
        content: `Technology: ${skillName}\nThe student claimed: ${claimedLevel}\n\nQuestion asked:\n${question}\n\nAnswer given:\n${answer}`,
      },
    ],
    (v) => {
      const o = v as {
        level?: unknown;
        confidence?: unknown;
        rationale?: unknown;
        addressedQuestion?: unknown;
      };
      if (typeof o.level !== "string" || !(SKILL_LEVELS as readonly string[]).includes(o.level)) return null;
      const c = typeof o.confidence === "number" ? Math.round(o.confidence) : NaN;
      if (!Number.isFinite(c) || c < 0 || c > 100) return null;
      return {
        level: o.level as SkillLevel,
        confidence: c,
        rationale: typeof o.rationale === "string" ? o.rationale.trim().slice(0, 400) : "",
        // Absent means we cannot tell, so assume it did rather than punish.
        addressedQuestion: o.addressedQuestion !== false,
      };
    },
    { temperature: 0, maxTokens: 700 },
  );

  if (!result.ok) throw new HttpError(503, `Could not rank the answer: ${result.error}`);
  return result.data;
}

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
  const rationale = [
    `Your answer reads as ${level.toLowerCase()} level`,
    spread ? ` (${spread})` : "",
    `, judged with ${confidence}% confidence.`,
  ].join("");

  return {
    model: result.model,
    usage: result.usage,
    authorship: {
      likelihood: machine,
      verdict: machine >= 75 ? "LIKELY_AI" : machine >= 35 ? "UNCERTAIN" : "LIKELY_HUMAN",
      signals: [],
    },
    ranking: { level, confidence, rationale, addressedQuestion },
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
  if (!isOpenRouterConfigured() && !isTypeSafeConfigured()) {
    throw new HttpError(503, "Skill checks are not available right now");
  }

  const claim = await db.userSkill.findUnique({
    where: { userId_skillId: { userId, skillId } },
    include: { skill: { select: { name: true } } },
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

  const question = await generateQuestion(claim.skill.name, claim.level as SkillLevel);

  return db.skillAssessment.create({
    data: {
      userId,
      skillId,
      claimedLevel: claim.level,
      question,
      answer: "",
      model: isTypeSafeConfigured() ? typeSafeModel() : openRouterModel(),
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
    throw new HttpError(400, `Write a little more — at least ${MIN_ANSWER_CHARS} characters.`);
  }
  if (trimmed.length > MAX_ANSWER_CHARS) {
    throw new HttpError(400, "That answer is too long.");
  }

  try {
    // System One answers both judgements in one calibrated request. The chat
    // path remains for deployments with only an OpenRouter key; there the two
    // judgements go out in parallel, since neither needs the other's output.
    let authorship: AuthorshipJudgement;
    let ranking: LevelJudgement;
    let judgedBy = attempt.model;
    let usage: { inputTokens: number; outputTokens: number } | null = null;

    if (isTypeSafeConfigured()) {
      const judged = await judgeWithSystemOne({
        skillName: attempt.skill.name,
        question: attempt.question,
        answer: trimmed,
      });
      authorship = judged.authorship;
      ranking = judged.ranking;
      judgedBy = judged.model;
      usage = judged.usage;
    } else {
      [authorship, ranking] = await Promise.all([
        detectAiAuthorship(attempt.question, trimmed),
        rankSkillLevel({
          skillName: attempt.skill.name,
          claimedLevel: attempt.claimedLevel as SkillLevel,
          question: attempt.question,
          answer: trimmed,
        }),
      ]);
    }

    // Past the threshold the attempt goes to an admin rather than being acted
    // on automatically, and the level is still recorded either way.
    const flagged = authorship.likelihood >= aiFlagThreshold();

    const saved = await db.skillAssessment.update({
      where: { id: attempt.id },
      data: {
        answer: trimmed,
        assessedLevel: ranking.level,
        confidence: ranking.confidence,
        rationale: ranking.addressedQuestion
          ? ranking.rationale
          : `${ranking.rationale} (This answered a different question, so it was not applied to your profile.)`.trim(),
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

    // The profile moves only on a judgement that is unflagged, on-question and
    // confident. Anything else is kept as a record without changing the badge.
    const conclusive =
      !flagged && ranking.addressedQuestion && ranking.confidence >= minConfidence();

    if (conclusive) {
      await db.userSkill.update({
        where: { userId_skillId: { userId, skillId: attempt.skillId } },
        data: { assessedLevel: ranking.level, assessedAt: new Date() },
      });
    }

    return saved;
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
