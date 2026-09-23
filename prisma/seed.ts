/**
 * Seeds the master tables (skills and roles) plus a demo dataset — Amrita
 * students, events, teams, achievements and requests — so that search, Team
 * Builder and the event pages have something real to show on a fresh clone.
 *
 * Every demo account is a real-shaped Amrita roll address, spread across
 * branches (CSE, AIE, CYS, CSD, ECE, EEE, MEC) and joining years, so the
 * "same year" and "same branch" filters on the home page are demonstrable.
 *
 * All demo accounts share one password: Amrita@2026
 *
 * Run with:  npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import { profileCompleteness } from "../src/lib/completeness";
import { STANDARD_ROLES } from "../src/lib/enums";
import { parseStudentEmail } from "../src/lib/amrita";
import { hashPassword } from "../src/lib/password";

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "Amrita@2026";

const db = new PrismaClient();

const day = 86_400_000;
const fromNow = (days: number, hour = 9) => {
  const d = new Date(Date.now() + days * day);
  d.setHours(hour, 0, 0, 0);
  return d;
};

// ---------------------------------------------------------------------------
// Master data
// ---------------------------------------------------------------------------

const SKILLS: Array<[string, string]> = [
  // Frontend
  ["HTML", "FRONTEND"], ["CSS", "FRONTEND"], ["JavaScript", "FRONTEND"],
  ["TypeScript", "FRONTEND"], ["React", "FRONTEND"], ["Next.js", "FRONTEND"],
  ["Angular", "FRONTEND"], ["Vue", "FRONTEND"], ["Tailwind CSS", "FRONTEND"],
  // Backend
  ["Node.js", "BACKEND"], ["Express", "BACKEND"], ["Django", "BACKEND"],
  ["Flask", "BACKEND"], ["FastAPI", "BACKEND"], ["Spring Boot", "BACKEND"],
  ["Go", "BACKEND"], ["GraphQL", "BACKEND"],
  // Mobile
  ["Flutter", "MOBILE"], ["React Native", "MOBILE"], ["Kotlin", "MOBILE"],
  ["Swift", "MOBILE"],
  // Data and AI/ML
  ["Python", "DATA_AI"], ["Pandas", "DATA_AI"], ["TensorFlow", "DATA_AI"],
  ["PyTorch", "DATA_AI"], ["Scikit-learn", "DATA_AI"], ["NLP", "DATA_AI"],
  ["Computer Vision", "DATA_AI"], ["LangChain", "DATA_AI"],
  // Database
  ["MySQL", "DATABASE"], ["PostgreSQL", "DATABASE"], ["MongoDB", "DATABASE"],
  ["Firebase", "DATABASE"], ["Redis", "DATABASE"], ["Prisma", "DATABASE"],
  // Cloud and DevOps
  ["AWS", "CLOUD_DEVOPS"], ["Azure", "CLOUD_DEVOPS"], ["GCP", "CLOUD_DEVOPS"],
  ["Docker", "CLOUD_DEVOPS"], ["Kubernetes", "CLOUD_DEVOPS"], ["CI/CD", "CLOUD_DEVOPS"],
  // Design
  ["Figma", "DESIGN"], ["Adobe XD", "DESIGN"], ["Photoshop", "DESIGN"],
  ["UI/UX Research", "DESIGN"], ["Prototyping", "DESIGN"],
  // Emerging
  ["Blockchain", "EMERGING"], ["Solidity", "EMERGING"], ["IoT", "EMERGING"],
  ["AR/VR", "EMERGING"], ["Cybersecurity", "EMERGING"],
  // Soft skills
  ["Presentation", "SOFT"], ["Pitching", "SOFT"], ["Project Management", "SOFT"],
  ["Technical Writing", "SOFT"],
];

type DemoUser = {
  name: string;
  /** Amrita roll address — campus, school, programme, branch and year come from it. */
  email: string;
  bio: string;
  availability: string;
  role?: "USER" | "ADMIN";
  skills: Array<[string, string]>;
  roles: string[];
  github?: string;
  linkedin?: string;
  portfolio?: string;
  activeDaysAgo?: number;
  achievements?: Array<{
    title: string;
    eventName: string;
    organizer?: string;
    position: string;
    daysAgo: number;
    status: string;
    description?: string;
    reviewNote?: string;
  }>;
};

const USERS: DemoUser[] = [
  {
    name: "Parthiv Surya",
    email: "cb.sc.u4cse24535@cb.students.amrita.edu",
    bio: "Third-year CSE at Amrita Coimbatore. I build web apps and I am usually the one organising the team. Platform admin here.",
    availability: "OPEN",
    role: "ADMIN",
    skills: [["TypeScript", "EXPERT"], ["Next.js", "EXPERT"], ["React", "EXPERT"], ["Node.js", "INTERMEDIATE"], ["PostgreSQL", "INTERMEDIATE"], ["Prisma", "INTERMEDIATE"], ["Project Management", "INTERMEDIATE"]],
    roles: ["Full Stack Developer", "Team Lead/Project Manager"],
    github: "https://github.com/Parthivsurya",
    activeDaysAgo: 0,
    achievements: [
      { title: "Finalist – Anokha Hackathon 2025", eventName: "Anokha 2025", organizer: "Amrita Vishwa Vidyapeetham", position: "FINALIST", daysAgo: 120, status: "VERIFIED", description: "Built a campus lost-and-found platform with image matching." },
    ],
  },
  {
    name: "Priya Sharma",
    email: "cb.sc.u4cse24118@cb.students.amrita.edu",
    bio: "Backend developer, third year CSE. Working on an accessible transport app for Smart India Hackathon — looking for an ML engineer and a designer.",
    availability: "OPEN",
    skills: [["Node.js", "EXPERT"], ["PostgreSQL", "EXPERT"], ["Express", "INTERMEDIATE"], ["Docker", "INTERMEDIATE"], ["TypeScript", "INTERMEDIATE"], ["Project Management", "INTERMEDIATE"]],
    roles: ["Backend Developer", "Team Lead/Project Manager"],
    github: "https://github.com/priyasharma",
    linkedin: "https://linkedin.com/in/priyasharma",
    portfolio: "https://priya.dev",
    activeDaysAgo: 0,
    achievements: [
      { title: "Runner-up – Anokha Hackathon 2025", eventName: "Anokha 2025", organizer: "Amrita Vishwa Vidyapeetham", position: "RUNNER_UP", daysAgo: 220, status: "VERIFIED", description: "Crowd-sourced pothole reporting platform. Second of 180 teams." },
      { title: "Finalist – Coimbatore Civic Tech Challenge", eventName: "Coimbatore Civic Tech Challenge", organizer: "Coimbatore Smart City", position: "FINALIST", daysAgo: 95, status: "PENDING" },
    ],
  },
  {
    name: "Meera Krishnan",
    email: "cb.sc.u4aie23156@cb.students.amrita.edu",
    bio: "Final-year AIE, three-time hackathon winner. Applied ML — vision and NLP. I only join teams that actually ship a demo.",
    availability: "EVENTS_ONLY",
    skills: [["Python", "EXPERT"], ["PyTorch", "EXPERT"], ["Computer Vision", "EXPERT"], ["TensorFlow", "INTERMEDIATE"], ["NLP", "INTERMEDIATE"], ["FastAPI", "INTERMEDIATE"], ["LangChain", "INTERMEDIATE"]],
    roles: ["ML/AI Engineer", "Data Analyst"],
    github: "https://github.com/meerak",
    linkedin: "https://linkedin.com/in/meerakrishnan",
    portfolio: "https://meera.ml",
    activeDaysAgo: 2,
    achievements: [
      { title: "Winner – Smart India Hackathon 2025", eventName: "Smart India Hackathon 2025", organizer: "Ministry of Education, Govt. of India", position: "WINNER", daysAgo: 300, status: "VERIFIED", description: "Crop disease detection from phone photos, piloted with 2,000 farmers." },
      { title: "Winner – Anokha Techfest AI Challenge", eventName: "Anokha 2025", organizer: "Amrita Vishwa Vidyapeetham", position: "WINNER", daysAgo: 180, status: "VERIFIED", description: "Real-time sign language translation running fully on-device." },
      { title: "Winner – Google Solution Challenge Regional", eventName: "Google Solution Challenge 2025", organizer: "Google Developers", position: "WINNER", daysAgo: 420, status: "VERIFIED" },
      { title: "Finalist – Amazon ML Challenge", eventName: "Amazon ML Challenge 2026", organizer: "Amazon", position: "FINALIST", daysAgo: 60, status: "PENDING" },
    ],
  },
  {
    name: "Arjun Menon",
    email: "cb.sc.u4cse25211@cb.students.amrita.edu",
    bio: "Second-year CSE who loves shipping clean interfaces. React and Figma are my home turf. No team yet — happy to join one that moves fast.",
    availability: "OPEN",
    skills: [["React", "EXPERT"], ["Figma", "EXPERT"], ["Tailwind CSS", "INTERMEDIATE"], ["JavaScript", "INTERMEDIATE"], ["Next.js", "INTERMEDIATE"], ["Prototyping", "INTERMEDIATE"]],
    roles: ["Frontend Developer", "UI/UX Designer"],
    github: "https://github.com/arjunmenon",
    linkedin: "https://linkedin.com/in/arjunmenon",
    activeDaysAgo: 1,
    achievements: [
      { title: "Participant – HackCBS 6.0", eventName: "HackCBS 6.0", organizer: "SSCBS, Delhi University", position: "PARTICIPANT", daysAgo: 150, status: "UNVERIFIED" },
    ],
  },
  {
    name: "Rahul Verma",
    email: "cb.sc.u4cse23044@cb.students.amrita.edu",
    bio: "Final-year CSE and coding club lead. I run our department hackathon and build full-stack side projects in between.",
    availability: "OPEN",
    skills: [["React", "INTERMEDIATE"], ["Node.js", "INTERMEDIATE"], ["MongoDB", "INTERMEDIATE"], ["Presentation", "EXPERT"], ["Project Management", "EXPERT"], ["Pitching", "EXPERT"]],
    roles: ["Full Stack Developer", "Team Lead/Project Manager", "Pitcher/Presenter"],
    github: "https://github.com/rahulverma",
    linkedin: "https://linkedin.com/in/rahulverma",
    activeDaysAgo: 3,
    achievements: [
      { title: "Winner – Anokha Hackathon 2024", eventName: "Anokha 2024", organizer: "Amrita Vishwa Vidyapeetham", position: "WINNER", daysAgo: 240, status: "VERIFIED" },
    ],
  },
  {
    name: "Sneha Patil",
    email: "cb.sc.u4csd25032@cb.students.amrita.edu",
    bio: "Computer Science and Design, second year. Design systems, user research, and very opinionated about spacing.",
    availability: "OPEN",
    skills: [["Figma", "EXPERT"], ["UI/UX Research", "EXPERT"], ["Prototyping", "EXPERT"], ["Adobe XD", "INTERMEDIATE"], ["Photoshop", "INTERMEDIATE"], ["Presentation", "INTERMEDIATE"]],
    roles: ["UI/UX Designer", "Pitcher/Presenter"],
    portfolio: "https://sneha.design",
    linkedin: "https://linkedin.com/in/snehapatil",
    activeDaysAgo: 1,
    achievements: [
      { title: "Winner – Design Sprint, Anokha 2026", eventName: "Anokha 2026", organizer: "Amrita Vishwa Vidyapeetham", position: "WINNER", daysAgo: 130, status: "VERIFIED", description: "Redesigned a public health reporting flow; judged best on usability." },
    ],
  },
  {
    name: "Vikram Singh",
    email: "cb.en.u4ece24312@cb.students.amrita.edu",
    bio: "Third-year ECE who drifted into infrastructure. I make things deploy, stay up, and cost less.",
    availability: "OPEN",
    skills: [["Docker", "EXPERT"], ["Kubernetes", "EXPERT"], ["AWS", "EXPERT"], ["CI/CD", "INTERMEDIATE"], ["Go", "INTERMEDIATE"], ["PostgreSQL", "INTERMEDIATE"]],
    roles: ["DevOps Engineer", "Backend Developer"],
    github: "https://github.com/vikramsingh",
    activeDaysAgo: 5,
  },
  {
    name: "Zoya Sheikh",
    email: "cb.sc.u4cys24089@cb.students.amrita.edu",
    bio: "Cyber security branch, third year. I break things carefully and then fix them. InCTF regular.",
    availability: "OPEN",
    skills: [["Cybersecurity", "EXPERT"], ["Python", "INTERMEDIATE"], ["Node.js", "INTERMEDIATE"], ["React", "INTERMEDIATE"], ["Docker", "BEGINNER"]],
    roles: ["Full Stack Developer", "DevOps Engineer"],
    github: "https://github.com/zoyasheikh",
    activeDaysAgo: 7,
    achievements: [
      { title: "Finalist – InCTF Nationals", eventName: "InCTF 2025", organizer: "Amrita Vishwa Vidyapeetham", position: "FINALIST", daysAgo: 140, status: "VERIFIED" },
    ],
  },
  {
    name: "Nisha Gupta",
    email: "cb.sc.u4aie24207@cb.students.amrita.edu",
    bio: "AIE third year. NLP in training — I spend most of my time on retrieval and evaluation.",
    availability: "EVENTS_ONLY",
    skills: [["Python", "EXPERT"], ["NLP", "EXPERT"], ["LangChain", "INTERMEDIATE"], ["PyTorch", "INTERMEDIATE"], ["FastAPI", "BEGINNER"]],
    roles: ["ML/AI Engineer"],
    github: "https://github.com/nishagupta",
    portfolio: "https://nisha.page",
    activeDaysAgo: 6,
    achievements: [
      { title: "Finalist – Inter-IIT Tech Meet ML Challenge", eventName: "Inter-IIT Tech Meet 14.0", organizer: "IIT Kanpur", position: "FINALIST", daysAgo: 160, status: "VERIFIED" },
    ],
  },
  {
    name: "Dev Patel",
    email: "cb.sc.u4cse26077@cb.students.amrita.edu",
    bio: "First-year CSE, already shipping. Mostly Next.js and Postgres. Building a habit tracker nobody asked for.",
    availability: "OPEN",
    skills: [["Next.js", "INTERMEDIATE"], ["React", "EXPERT"], ["Node.js", "INTERMEDIATE"], ["PostgreSQL", "BEGINNER"], ["Prisma", "BEGINNER"], ["Tailwind CSS", "EXPERT"]],
    roles: ["Full Stack Developer", "Frontend Developer"],
    github: "https://github.com/devpatel",
    activeDaysAgo: 1,
  },
  {
    name: "Karthik Reddy",
    email: "cb.en.u4eee23275@cb.students.amrita.edu",
    bio: "Final-year EEE, blockchain developer by night. Solidity, audits, and a healthy scepticism about most web3 pitches.",
    availability: "OPEN",
    skills: [["Solidity", "EXPERT"], ["Blockchain", "EXPERT"], ["TypeScript", "INTERMEDIATE"], ["Node.js", "INTERMEDIATE"], ["Cybersecurity", "INTERMEDIATE"]],
    roles: ["Blockchain Developer", "Backend Developer"],
    github: "https://github.com/karthikreddy",
    activeDaysAgo: 4,
    achievements: [
      { title: "Winner – ETHIndia Fellowship Track", eventName: "ETHIndia 2025", organizer: "Devfolio", position: "WINNER", daysAgo: 200, status: "VERIFIED" },
      { title: "Winner – Polygon Buildathon", eventName: "Polygon Buildathon 2024", organizer: "Polygon Labs", position: "WINNER", daysAgo: 500, status: "REJECTED", reviewNote: "The certificate uploaded belonged to a different participant name." },
    ],
  },
  {
    name: "Ananya Iyer",
    email: "cb.sc.u4cse24290@cb.students.amrita.edu",
    bio: "Third-year CSE. I like making messy datasets tell a clear story. Pandas, SQL and dashboards.",
    availability: "OPEN",
    skills: [["Python", "INTERMEDIATE"], ["Pandas", "EXPERT"], ["MySQL", "INTERMEDIATE"], ["Scikit-learn", "INTERMEDIATE"], ["Technical Writing", "INTERMEDIATE"]],
    roles: ["Data Analyst", "ML/AI Engineer"],
    linkedin: "https://linkedin.com/in/ananyaiyer",
    activeDaysAgo: 8,
  },
  {
    name: "Ishaan Bose",
    email: "cb.en.u4mec24401@cb.students.amrita.edu",
    bio: "Mechanical third year, hardware and IoT person. Sensors, ESP32 boards, and the occasional soldering burn.",
    availability: "OPEN",
    skills: [["IoT", "EXPERT"], ["Python", "INTERMEDIATE"], ["AR/VR", "BEGINNER"], ["Computer Vision", "BEGINNER"]],
    roles: ["Hardware/IoT Engineer"],
    activeDaysAgo: 12,
  },
  {
    name: "Tanvi Joshi",
    email: "cb.sc.p2cse25007@cb.students.amrita.edu",
    bio: "M.Tech CSE. I pitch — ten slides, five minutes, no filler. Also handle business models and market sizing.",
    availability: "OPEN",
    skills: [["Pitching", "EXPERT"], ["Presentation", "EXPERT"], ["Project Management", "INTERMEDIATE"], ["Technical Writing", "INTERMEDIATE"]],
    roles: ["Pitcher/Presenter", "Team Lead/Project Manager"],
    linkedin: "https://linkedin.com/in/tanvijoshi",
    activeDaysAgo: 3,
    achievements: [
      { title: "Winner – Best Pitch, Startup Weekend Coimbatore", eventName: "Startup Weekend Coimbatore 2026", organizer: "Techstars", position: "WINNER", daysAgo: 90, status: "VERIFIED" },
    ],
  },
  {
    name: "Fatima Khan",
    email: "cb.sc.u4aie25163@cb.students.amrita.edu",
    bio: "Second-year AIE. Flutter developer — shipped two apps on the Play Store with 10k+ installs between them.",
    availability: "OPEN",
    skills: [["Flutter", "EXPERT"], ["Kotlin", "INTERMEDIATE"], ["Firebase", "EXPERT"], ["React Native", "BEGINNER"], ["Figma", "BEGINNER"]],
    roles: ["Mobile Developer", "Frontend Developer"],
    github: "https://github.com/fatimak",
    portfolio: "https://fatima.app",
    activeDaysAgo: 2,
    achievements: [
      { title: "Runner-up – Google DevFest Hack", eventName: "DevFest Coimbatore 2025", organizer: "GDG Coimbatore", position: "RUNNER_UP", daysAgo: 110, status: "VERIFIED" },
    ],
  },
  {
    name: "Rohan Das",
    email: "cb.sc.u4cse23188@cb.students.amrita.edu",
    bio: "Final-year CSE, Go and Postgres. Heads-down on my thesis this semester, so not taking on events.",
    availability: "NOT_AVAILABLE",
    skills: [["Go", "EXPERT"], ["PostgreSQL", "EXPERT"], ["Redis", "INTERMEDIATE"], ["Docker", "INTERMEDIATE"]],
    roles: ["Backend Developer"],
    github: "https://github.com/rohandas",
    activeDaysAgo: 40,
  },
];

const EVENTS = [
  {
    name: "Smart India Hackathon 2026",
    slug: "smart-india-hackathon-2026",
    organizer: "Ministry of Education, Govt. of India",
    description:
      "India's largest open innovation hackathon. Teams pick a problem statement published by a government ministry or industry partner and build a working solution over 36 hours at a regional nodal centre.",
    startDate: fromNow(45),
    endDate: fromNow(47),
    registrationDeadline: fromNow(21),
    mode: "OFFLINE",
    location: "Coimbatore (regional centre)",
    minTeamSize: 4,
    maxTeamSize: 6,
    themes: "Smart Automation, Healthcare, Agriculture, Clean Energy, Transport",
    prize: "₹1,00,000 per winning team per problem statement",
    registrationLink: "https://sih.gov.in",
    status: "APPROVED",
  },
  {
    name: "Global AI Hackathon 2026",
    slug: "global-ai-hackathon-2026",
    organizer: "OpenBuild Community",
    description:
      "A fully online, 48-hour AI hackathon. Build anything with an LLM, a vision model, or classical ML — judged on usefulness, technical depth and the quality of the demo.",
    startDate: fromNow(18),
    endDate: fromNow(20),
    registrationDeadline: fromNow(12),
    mode: "ONLINE",
    minTeamSize: 2,
    maxTeamSize: 4,
    themes: "LLM Applications, Computer Vision, Responsible AI, Developer Tools",
    prize: "$5,000 prize pool + GPU credits",
    registrationLink: "https://example.com/global-ai-hack",
    status: "APPROVED",
  },
  {
    name: "Anokha 2027 Hackathon",
    slug: "anokha-2027-hackathon",
    organizer: "Amrita Vishwa Vidyapeetham, Coimbatore",
    description:
      "The flagship 24-hour hackathon at Anokha, Amrita's national techfest. Open to all Amrita students across campuses.",
    startDate: fromNow(30),
    endDate: fromNow(31),
    registrationDeadline: fromNow(16),
    mode: "OFFLINE",
    location: "Amrita School of Engineering, Ettimadai, Coimbatore",
    minTeamSize: 2,
    maxTeamSize: 4,
    themes: "Civic Tech, EdTech, Accessibility, Sustainability",
    prize: "₹50,000 prize pool",
    registrationLink: "https://anokha.amrita.edu",
    status: "APPROVED",
  },
  {
    name: "FinTech Build Sprint",
    slug: "fintech-build-sprint",
    organizer: "Bengaluru FinTech Collective",
    description:
      "A weekend sprint on payments, lending and fraud detection, run in partnership with three fintech companies. Hybrid format: build remotely, demo in person.",
    startDate: fromNow(60),
    endDate: fromNow(62),
    registrationDeadline: fromNow(40),
    mode: "HYBRID",
    location: "Koramangala, Bengaluru",
    minTeamSize: 3,
    maxTeamSize: 5,
    themes: "Payments, Fraud Detection, Credit Scoring, UPI",
    prize: "₹2,00,000 prize pool + internship interviews",
    registrationLink: "https://example.com/fintech-sprint",
    status: "APPROVED",
  },
  {
    name: "Web3 Winter Jam",
    slug: "web3-winter-jam",
    organizer: "Devfolio",
    description:
      "Ten days, fully online, to ship something on-chain. Mentors from four protocol teams review projects mid-way.",
    startDate: fromNow(8),
    endDate: fromNow(18),
    registrationDeadline: fromNow(5),
    mode: "ONLINE",
    minTeamSize: 2,
    maxTeamSize: 4,
    themes: "DeFi, Identity, Public Goods, Tooling",
    prize: "$10,000 in bounties",
    registrationLink: "https://example.com/web3-winter-jam",
    status: "APPROVED",
  },
  {
    name: "CSE Department Codeathon 2027",
    slug: "cse-department-codeathon-2027",
    organizer: "Department of CSE, Amrita Coimbatore",
    description:
      "An intra-department codeathon for CSE and AIE students. Submitted for review — waiting on admin approval.",
    startDate: fromNow(75),
    endDate: fromNow(76),
    registrationDeadline: fromNow(55),
    mode: "OFFLINE",
    location: "Amrita School of Computing, Coimbatore",
    minTeamSize: 2,
    maxTeamSize: 4,
    themes: "Open Innovation",
    prize: "₹30,000 prize pool",
    status: "PENDING",
  },
];

async function main() {
  console.log("Seeding FindMyTeammate...");

  // Earlier versions of this seed used @example.com addresses. Since access is
  // now limited to Amrita student addresses, clear those out so search results
  // are not polluted by accounts nobody can sign in to.
  const legacy = await db.user.deleteMany({
    where: { email: { endsWith: "@example.com" } },
  });
  if (legacy.count) console.log(`  removed ${legacy.count} superseded demo accounts`);

  // --- master tables ------------------------------------------------------
  for (const [name, category] of SKILLS) {
    await db.skill.upsert({
      where: { name },
      update: { category, approved: true },
      create: { name, category, approved: true },
    });
  }
  // One pending suggestion so the admin queue has something in it.
  await db.skill.upsert({
    where: { name: "Rust" },
    update: {},
    create: { name: "Rust", category: "BACKEND", approved: false },
  });

  for (const name of STANDARD_ROLES) {
    await db.role.upsert({ where: { name }, update: {}, create: { name } });
  }

  const skillByName = new Map(
    (await db.skill.findMany()).map((s) => [s.name, s.id]),
  );
  const roleByName = new Map((await db.role.findMany()).map((r) => [r.name, r.id]));
  console.log(`  ${skillByName.size} skills, ${roleByName.size} roles`);

  // --- users --------------------------------------------------------------
  // Keyed by first name, which is what the participation and team tables below
  // refer to.
  const userByUsername = new Map<string, string>();

  // One hash reused for every demo account — hashing is deliberately slow.
  const demoPasswordHash = await hashPassword(DEMO_PASSWORD);

  for (const u of USERS) {
    const identity = parseStudentEmail(u.email);
    if (!identity) throw new Error(`Seed email is not a valid roll address: ${u.email}`);

    // Everything academic comes from the address itself.
    const college = `Amrita Vishwa Vidyapeetham, ${identity.campus}`;
    const location = identity.campus;
    const username = `${identity.branchCode}${String(identity.joiningYear).slice(-2)}${identity.rollNumber}`;

    const completeness = profileCompleteness({
      name: u.name,
      image: null,
      bio: u.bio,
      college,
      location,
      skillCount: u.skills.length,
      roleCount: u.roles.length,
      githubUrl: u.github,
      linkedinUrl: u.linkedin,
      portfolioUrl: u.portfolio,
    });

    const user = await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        username,
        email: u.email,
        bio: u.bio,
        college,
        location,
        passwordHash: demoPasswordHash,
        emailVerifiedAt: new Date(Date.now() - 30 * day),
        campusCode: identity.campusCode,
        schoolCode: identity.schoolCode,
        programCode: identity.programCode,
        programYears: identity.programYears,
        branchCode: identity.branchCode,
        joiningYear: identity.joiningYear,
        rollNumber: identity.rollNumber,
        availability: u.availability,
        availabilityUpdatedAt: new Date(Date.now() - (u.activeDaysAgo ?? 3) * day),
        role: u.role ?? "USER",
        onboarded: true,
        githubUrl: u.github,
        linkedinUrl: u.linkedin,
        portfolioUrl: u.portfolio,
        profileCompleteness: completeness,
        lastActiveAt: new Date(Date.now() - (u.activeDaysAgo ?? 3) * day),
      },
    });

    const key = u.name.split(" ")[0]!.toLowerCase();
    userByUsername.set(key, user.id);

    for (const [skillName, level] of u.skills) {
      const skillId = skillByName.get(skillName);
      if (!skillId) throw new Error(`Unknown skill in seed: ${skillName}`);
      await db.userSkill.upsert({
        where: { userId_skillId: { userId: user.id, skillId } },
        update: { level },
        create: { userId: user.id, skillId, level },
      });
    }

    for (const roleName of u.roles) {
      const roleId = roleByName.get(roleName);
      if (!roleId) throw new Error(`Unknown role in seed: ${roleName}`);
      await db.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId } },
        update: {},
        create: { userId: user.id, roleId },
      });
    }

    for (const a of u.achievements ?? []) {
      const exists = await db.achievement.findFirst({
        where: { userId: user.id, title: a.title },
      });
      if (exists) continue;
      await db.achievement.create({
        data: {
          userId: user.id,
          title: a.title,
          eventName: a.eventName,
          organizer: a.organizer,
          position: a.position,
          date: new Date(Date.now() - a.daysAgo * day),
          description: a.description,
          proofUrl: a.status === "UNVERIFIED" ? null : "/uploads/demo-certificate.pdf",
          status: a.status,
          reviewNote: a.reviewNote,
          reviewedAt:
            a.status === "VERIFIED" || a.status === "REJECTED"
              ? new Date(Date.now() - (a.daysAgo - 5) * day)
              : null,
          reviewedBy:
            a.status === "VERIFIED" || a.status === "REJECTED" ? "Parthiv Surya" : null,
        },
      });
    }
  }
  console.log(`  ${userByUsername.size} users with skills, roles and achievements`);

  // --- events -------------------------------------------------------------
  const eventBySlug = new Map<string, string>();
  for (const e of EVENTS) {
    const createdById =
      e.slug === "cse-department-codeathon-2027"
        ? (userByUsername.get("rahul") ?? null)
        : e.slug === "anokha-2027-hackathon"
          ? (userByUsername.get("priya") ?? null)
          : (userByUsername.get("parthiv") ?? null);

    const event = await db.event.upsert({
      where: { slug: e.slug },
      update: { createdById },
      create: { ...e, createdById },
    });
    eventBySlug.set(e.slug, event.id);
  }
  console.log(`  ${eventBySlug.size} events`);

  // --- who is attending what ---------------------------------------------
  const participations: Array<[string, string, string]> = [
    ["priya", "smart-india-hackathon-2026", "TEAM_LOOKING_FOR_MEMBERS"],
    ["meera", "smart-india-hackathon-2026", "LOOKING_FOR_TEAM"],
    ["sneha", "smart-india-hackathon-2026", "LOOKING_FOR_TEAM"],
    ["vikram", "smart-india-hackathon-2026", "LOOKING_FOR_TEAM"],
    ["arjun", "smart-india-hackathon-2026", "LOOKING_FOR_TEAM"],
    ["tanvi", "smart-india-hackathon-2026", "LOOKING_FOR_TEAM"],
    ["ishaan", "smart-india-hackathon-2026", "LOOKING_FOR_TEAM"],
    ["nisha", "global-ai-hackathon-2026", "LOOKING_FOR_TEAM"],
    ["meera", "global-ai-hackathon-2026", "LOOKING_FOR_TEAM"],
    ["dev", "global-ai-hackathon-2026", "TEAM_LOOKING_FOR_MEMBERS"],
    ["ananya", "global-ai-hackathon-2026", "LOOKING_FOR_TEAM"],
    ["arjun", "global-ai-hackathon-2026", "LOOKING_FOR_TEAM"],
    ["rahul", "anokha-2027-hackathon", "TEAM_LOOKING_FOR_MEMBERS"],
    ["arjun", "anokha-2027-hackathon", "LOOKING_FOR_TEAM"],
    ["fatima", "anokha-2027-hackathon", "LOOKING_FOR_TEAM"],
    ["zoya", "anokha-2027-hackathon", "LOOKING_FOR_TEAM"],
    ["karthik", "web3-winter-jam", "TEAM_LOOKING_FOR_MEMBERS"],
    ["zoya", "web3-winter-jam", "LOOKING_FOR_TEAM"],
    ["dev", "web3-winter-jam", "LOOKING_FOR_TEAM"],
    ["ananya", "fintech-build-sprint", "LOOKING_FOR_TEAM"],
    ["tanvi", "fintech-build-sprint", "LOOKING_FOR_TEAM"],
    ["vikram", "fintech-build-sprint", "LOOKING_FOR_TEAM"],
    ["fatima", "fintech-build-sprint", "LOOKING_FOR_TEAM"],
  ];

  for (const [username, slug, status] of participations) {
    const userId = userByUsername.get(username)!;
    const eventId = eventBySlug.get(slug)!;
    await db.eventParticipation.upsert({
      where: { userId_eventId: { userId, eventId } },
      update: { status },
      create: { userId, eventId, status },
    });
  }
  console.log(`  ${participations.length} event participations`);

  // --- teams and open role slots -----------------------------------------
  type SeedTeam = {
    name: string;
    idea: string;
    slug: string;
    leader: string;
    slots: Array<{ role: string; skills?: string[]; note?: string; filledBy?: string }>;
  };

  const TEAMS: SeedTeam[] = [
    {
      name: "NeuralNav",
      slug: "smart-india-hackathon-2026",
      leader: "priya",
      idea: "An accessible public transport companion: live crowding estimates from CCTV feeds plus a voice-first interface for visually impaired commuters.",
      slots: [
        { role: "ML/AI Engineer", skills: ["Computer Vision", "PyTorch"], note: "Crowd density estimation from video" },
        { role: "UI/UX Designer", skills: ["Figma", "UI/UX Research"], note: "Accessibility-first mobile flows" },
        { role: "Hardware/IoT Engineer", skills: ["IoT"], note: "Optional — edge device at bus stops" },
        { role: "Backend Developer", skills: ["Node.js", "PostgreSQL"], filledBy: "priya" },
      ],
    },
    {
      name: "PitchPerfect",
      slug: "anokha-2027-hackathon",
      leader: "rahul",
      idea: "A practice tool for student founders: record a pitch, get structured feedback on pace, filler words and slide density.",
      slots: [
        { role: "Frontend Developer", skills: ["React", "Tailwind CSS"] },
        { role: "ML/AI Engineer", skills: ["NLP", "Python"], note: "Speech analysis" },
        { role: "Full Stack Developer", skills: ["Node.js"], filledBy: "rahul" },
      ],
    },
    {
      name: "ChainGuard",
      slug: "web3-winter-jam",
      leader: "karthik",
      idea: "A pre-deploy contract linter that flags the ten most common Solidity footguns and explains each one in plain language.",
      slots: [
        { role: "Frontend Developer", skills: ["Next.js", "TypeScript"] },
        { role: "Blockchain Developer", skills: ["Solidity"], filledBy: "karthik" },
      ],
    },
    {
      name: "LedgerLens",
      slug: "global-ai-hackathon-2026",
      leader: "dev",
      idea: "Point your camera at any receipt and get a clean, categorised expense entry — works offline on mid-range phones.",
      slots: [
        { role: "ML/AI Engineer", skills: ["Computer Vision", "Python"], note: "On-device OCR" },
        { role: "Mobile Developer", skills: ["Flutter"] },
        { role: "Full Stack Developer", skills: ["Next.js"], filledBy: "dev" },
      ],
    },
  ];

  let slotCount = 0;
  const teamByName = new Map<string, string>();

  for (const t of TEAMS) {
    const eventId = eventBySlug.get(t.slug)!;
    const leaderId = userByUsername.get(t.leader)!;

    const existing = await db.team.findFirst({ where: { name: t.name, eventId } });
    if (existing) {
      teamByName.set(t.name, existing.id);
      continue;
    }

    const team = await db.team.create({
      data: { name: t.name, idea: t.idea, eventId, leaderId },
    });
    teamByName.set(t.name, team.id);

    for (const slot of t.slots) {
      const roleId = roleByName.get(slot.role);
      if (!roleId) throw new Error(`Unknown role in seed team: ${slot.role}`);
      await db.teamSlot.create({
        data: {
          teamId: team.id,
          roleId,
          note: slot.note,
          filledById: slot.filledBy ? userByUsername.get(slot.filledBy) : null,
          requiredSkills: {
            connect: (slot.skills ?? []).map((name) => ({
              id: skillByName.get(name)!,
            })),
          },
        },
      });
      slotCount++;
    }
  }
  console.log(`  ${teamByName.size} teams with ${slotCount} role slots`);

  // --- a few live requests and notifications ------------------------------
  const neuralNav = teamByName.get("NeuralNav")!;
  const pitchPerfect = teamByName.get("PitchPerfect")!;

  const mlSlot = await db.teamSlot.findFirst({
    where: { teamId: neuralNav, role: { name: "ML/AI Engineer" }, filledById: null },
  });
  const frontendSlot = await db.teamSlot.findFirst({
    where: { teamId: pitchPerfect, role: { name: "Frontend Developer" }, filledById: null },
  });

  const priyaId = userByUsername.get("priya")!;
  const meeraId = userByUsername.get("meera")!;
  const arjunId = userByUsername.get("arjun")!;
  const rahulId = userByUsername.get("rahul")!;

  const existingRequests = await db.teamRequest.count();
  if (existingRequests === 0) {
    if (mlSlot) {
      await db.teamRequest.create({
        data: {
          type: "INVITE",
          teamId: neuralNav,
          slotId: mlSlot.id,
          fromUserId: priyaId,
          toUserId: meeraId,
          message:
            "Hi Meera — we are building an accessible transport app for SIH and your on-device vision work is exactly what we need. Would you join as our ML engineer?",
        },
      });
      await db.notification.create({
        data: {
          userId: meeraId,
          type: "INVITE",
          title: "Priya Sharma invited you to NeuralNav",
          body: "ML/AI Engineer · Smart India Hackathon 2026",
          href: "/requests",
        },
      });
    }

    if (frontendSlot) {
      await db.teamRequest.create({
        data: {
          type: "JOIN_REQUEST",
          teamId: pitchPerfect,
          slotId: frontendSlot.id,
          fromUserId: arjunId,
          toUserId: rahulId,
          message:
            "I would love to take the frontend slot — I have shipped three React apps and can also help with the Figma work.",
        },
      });
      await db.notification.create({
        data: {
          userId: rahulId,
          type: "JOIN_REQUEST",
          title: "Arjun Menon asked to join PitchPerfect",
          body: "Frontend Developer · Kurukshetra '26 Hackathon",
          href: "/requests",
        },
      });
    }

    await db.notification.create({
      data: {
        userId: priyaId,
        type: "ACHIEVEMENT_VERIFIED",
        title: "Your achievement was verified",
        body: "Runner-up – Kurukshetra Hackathon 2025 now shows a verified badge.",
        href: "/u/priya",
        read: true,
      },
    });
  }

  console.log("Seed complete.\n");
  console.log("Sign in with any seeded Amrita address, password: " + DEMO_PASSWORD);
  console.log("  cb.sc.u4cse24535@cb.students.amrita.edu  Parthiv Surya  CSE 2024  (admin)");
  console.log("  cb.sc.u4cse24118@cb.students.amrita.edu  Priya Sharma   CSE 2024");
  console.log("  cb.sc.u4aie23156@cb.students.amrita.edu  Meera Krishnan AIE 2023");
  console.log("  cb.sc.u4cse25211@cb.students.amrita.edu  Arjun Menon    CSE 2025");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
