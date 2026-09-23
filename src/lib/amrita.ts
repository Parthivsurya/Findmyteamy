/**
 * Amrita student email parsing.
 *
 * Every Amrita student address encodes who the student is, for example:
 *
 *     cb.sc.u4cse24000@cb.students.amrita.edu
 *     │  │  ││  │  │
 *     │  │  ││  │  └── 000  roll number within the batch
 *     │  │  ││  └───── 24   joined in 2024
 *     │  │  │└──────── cse  branch
 *     │  │  └───────── u4   undergraduate, four years
 *     │  └──────────── sc   School of Computing
 *     └─────────────── cb   Coimbatore campus
 *
 * Parsing it means a student never has to type their campus, school, branch or
 * year — and it is what makes "same year" and "same branch" search possible.
 */

export const STUDENT_EMAIL_DOMAIN_SUFFIX = "students.amrita.edu";

export const CAMPUSES: Record<string, string> = {
  cb: "Coimbatore",
  am: "Amritapuri",
  bl: "Bengaluru",
  ch: "Chennai",
  kc: "Kochi",
  ko: "Kochi",
  ag: "Amaravati",
  my: "Mysuru",
  nd: "Faridabad (NCR)",
};

export const SCHOOLS: Record<string, string> = {
  sc: "School of Computing",
  en: "School of Engineering",
  ai: "School of Artificial Intelligence",
  bu: "School of Business",
  ar: "School of Arts and Sciences",
  ph: "School of Physical Sciences",
  bi: "School of Biotechnology",
  ay: "School of Ayurveda",
  ag: "School of Agricultural Sciences",
  md: "School of Medicine",
  nr: "School of Nursing",
  de: "School of Dentistry",
  ns: "Centre for Nanosciences",
};

export const BRANCHES: Record<string, string> = {
  cse: "Computer Science and Engineering",
  cys: "Computer Science and Engineering (Cyber Security)",
  aie: "Computer Science and Engineering (Artificial Intelligence)",
  csd: "Computer Science and Design",
  ecc: "Electronics and Computer Engineering",
  eac: "Electronics and Computer Engineering",
  ece: "Electronics and Communication Engineering",
  eee: "Electrical and Electronics Engineering",
  eie: "Electronics and Instrumentation Engineering",
  mec: "Mechanical Engineering",
  mee: "Mechanical Engineering",
  cve: "Civil Engineering",
  civ: "Civil Engineering",
  che: "Chemical Engineering",
  bme: "Biomedical Engineering",
  bte: "Biotechnology",
  ain: "Artificial Intelligence",
  dsc: "Data Science",
  cca: "Computer Applications",
  msc: "Computer Science",
  bca: "Computer Applications",
};

export const PROGRAM_KINDS: Record<string, string> = {
  u: "Undergraduate",
  p: "Postgraduate",
  d: "Doctoral",
  i: "Integrated",
};

export type StudentIdentity = {
  email: string;
  campusCode: string;
  campus: string;
  schoolCode: string;
  school: string;
  /** "u4", "p2" … */
  programCode: string;
  programKind: string;
  /** Nominal duration of the programme in years. */
  programYears: number;
  branchCode: string;
  branch: string;
  /** Four-digit joining year, e.g. 2024. */
  joiningYear: number;
  graduationYear: number;
  rollNumber: string;
};

/**
 * Local part shape: <campus>.<school>.<kind><years><branch><yy><roll>
 * e.g. cb . sc . u 4 cse 24 535
 */
const LOCAL_PART = /^([a-z]{2})\.([a-z]{2,4})\.([a-z])(\d)([a-z]{2,8})(\d{2})(\d{2,4})$/;

export function isStudentEmailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return domain === STUDENT_EMAIL_DOMAIN_SUFFIX ||
    domain.endsWith(`.${STUDENT_EMAIL_DOMAIN_SUFFIX}`);
}

/** Title-cases an unknown code so unmapped branches still read sensibly. */
function fallbackLabel(code: string): string {
  return code.toUpperCase();
}

/**
 * Parses an Amrita student address. Returns null when the address is not a
 * student address or does not follow the documented pattern — staff addresses
 * and personal addresses both land here.
 */
export function parseStudentEmail(rawEmail: string): StudentIdentity | null {
  const email = rawEmail.trim().toLowerCase();
  if (!isStudentEmailDomain(email)) return null;

  const [localPart] = email.split("@");
  if (!localPart) return null;

  const match = LOCAL_PART.exec(localPart);
  if (!match) return null;

  const [, campusCode, schoolCode, kind, years, branchCode, yy, rollNumber] = match;

  const programYears = Number(years);
  // Two-digit years are all 2000s in practice for current students.
  const joiningYear = 2000 + Number(yy);

  return {
    email,
    campusCode: campusCode!,
    campus: CAMPUSES[campusCode!] ?? fallbackLabel(campusCode!),
    schoolCode: schoolCode!,
    school: SCHOOLS[schoolCode!] ?? fallbackLabel(schoolCode!),
    programCode: `${kind}${years}`,
    programKind: PROGRAM_KINDS[kind!] ?? fallbackLabel(kind!),
    programYears,
    branchCode: branchCode!,
    branch: BRANCHES[branchCode!] ?? fallbackLabel(branchCode!),
    joiningYear,
    graduationYear: joiningYear + programYears,
    rollNumber: rollNumber!,
  };
}

/**
 * The academic year currently in progress. Amrita's year turns over mid-year,
 * so anything from June onwards belongs to the new academic year.
 */
export function currentAcademicStartYear(now = new Date()): number {
  return now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
}

/**
 * Which year of study a student is in: 1 for first year, and so on. Returns
 * null once they are past the nominal duration of the programme.
 */
export function studyYear(
  joiningYear: number,
  programYears: number,
  now = new Date(),
): number | null {
  const year = currentAcademicStartYear(now) - joiningYear + 1;
  if (year < 1) return null;
  if (year > programYears) return null;
  return year;
}

const ORDINALS = ["", "1st", "2nd", "3rd", "4th", "5th", "6th"];

/** "3rd year" / "Alumni" / "Joining soon" — what to show on a profile. */
export function studyYearLabel(
  joiningYear: number | null | undefined,
  programYears: number | null | undefined,
  now = new Date(),
): string | null {
  if (!joiningYear || !programYears) return null;

  const year = studyYear(joiningYear, programYears, now);
  if (year === null) {
    return currentAcademicStartYear(now) - joiningYear + 1 > programYears
      ? "Alumni"
      : "Joining soon";
  }
  return `${ORDINALS[year] ?? `${year}th`} year`;
}

/** "CSE · 3rd year" style summary used on cards. */
export function academicSummary(user: {
  branchCode?: string | null;
  joiningYear?: number | null;
  programYears?: number | null;
}): string | null {
  const parts: string[] = [];
  if (user.branchCode) parts.push(user.branchCode.toUpperCase());

  const year = studyYearLabel(user.joiningYear, user.programYears);
  if (year) parts.push(year);

  return parts.length ? parts.join(" · ") : null;
}

/** Batch label, e.g. "2024–2028". */
export function batchLabel(
  joiningYear: number | null | undefined,
  programYears: number | null | undefined,
): string | null {
  if (!joiningYear) return null;
  if (!programYears) return String(joiningYear);
  return `${joiningYear}–${joiningYear + programYears}`;
}

/**
 * Validation message for the sign-up form. Returns null when the address is
 * acceptable, otherwise the reason to show the student.
 */
export function studentEmailProblem(rawEmail: string): string | null {
  const email = rawEmail.trim().toLowerCase();

  if (!email.includes("@")) return "Enter your full Amrita email address";
  if (!isStudentEmailDomain(email)) {
    return "Use your Amrita student address, ending in students.amrita.edu";
  }
  if (!parseStudentEmail(email)) {
    return "That does not look like a student roll address (example: cb.sc.u4cse24000@cb.students.amrita.edu)";
  }
  return null;
}
