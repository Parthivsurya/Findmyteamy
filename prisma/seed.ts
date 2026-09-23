/**
 * Seeds the master tables (skills and roles) plus a demo dataset — users,
 * events, teams, achievements and requests — so that search, Team Builder and
 * the event pages have something real to show on a fresh clone.
 *
 * Run with:  npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import { profileCompleteness } from "../src/lib/completeness";
import { STANDARD_ROLES } from "../src/lib/enums";

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
  username: string;
  name: string;
  email: string;
  bio: string;
  college: string;
  location: string;
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
    username: "priya",
    name: "Priya Sharma",
    email: "priya@example.com",
    bio: "Third-year CSE student and backend developer. Building an accessible transport app for Smart India Hackathon — looking for an ML engineer and a designer.",
    college: "Anna University, Chennai",
    location: "Chennai",
    availability: "OPEN",
    skills: [["Node.js", "EXPERT"], ["PostgreSQL", "EXPERT"], ["Express", "INTERMEDIATE"], ["Docker", "INTERMEDIATE"], ["TypeScript", "INTERMEDIATE"], ["Project Management", "INTERMEDIATE"]],
    roles: ["Backend Developer", "Team Lead/Project Manager"],
    github: "https://github.com/priya",
    linkedin: "https://linkedin.com/in/priya",
    portfolio: "https://priya.dev",
    activeDaysAgo: 0,
    achievements: [
      { title: "Runner-up – Kurukshetra Hackathon 2025", eventName: "Kurukshetra 2025", organizer: "Anna University", position: "RUNNER_UP", daysAgo: 220, status: "VERIFIED", description: "Built a crowd-sourced pothole reporting platform. Second place out of 180 teams." },
      { title: "Finalist – Chennai Civic Tech Challenge", eventName: "Chennai Civic Tech Challenge", organizer: "Greater Chennai Corporation", position: "FINALIST", daysAgo: 95, status: "PENDING" },
    ],
  },
  {
    username: "arjun",
    name: "Arjun Menon",
    email: "arjun@example.com",
    bio: "Second-year student who loves shipping clean interfaces. React and Figma are my home turf. No team yet — happy to join one that likes moving fast.",
    college: "NIT Trichy",
    location: "Tiruchirappalli",
    availability: "OPEN",
    skills: [["React", "EXPERT"], ["Figma", "EXPERT"], ["Tailwind CSS", "INTERMEDIATE"], ["JavaScript", "INTERMEDIATE"], ["Next.js", "INTERMEDIATE"], ["Prototyping", "INTERMEDIATE"]],
    roles: ["Frontend Developer", "UI/UX Designer"],
    github: "https://github.com/arjun",
    linkedin: "https://linkedin.com/in/arjun",
    activeDaysAgo: 1,
    achievements: [
      { title: "Participant – HackCBS 6.0", eventName: "HackCBS 6.0", organizer: "SSCBS, Delhi University", position: "PARTICIPANT", daysAgo: 150, status: "UNVERIFIED" },
    ],
  },
  {
    username: "meera",
    name: "Meera Krishnan",
    email: "meera@example.com",
    bio: "Final-year student, three-time hackathon winner. I work on applied ML — vision and NLP — and I only join teams that actually ship a demo.",
    college: "VIT Vellore",
    location: "Vellore",
    availability: "EVENTS_ONLY",
    skills: [["Python", "EXPERT"], ["PyTorch", "EXPERT"], ["Computer Vision", "EXPERT"], ["TensorFlow", "INTERMEDIATE"], ["NLP", "INTERMEDIATE"], ["FastAPI", "INTERMEDIATE"], ["LangChain", "INTERMEDIATE"]],
    roles: ["ML/AI Engineer", "Data Analyst"],
    github: "https://github.com/meera",
    linkedin: "https://linkedin.com/in/meera",
    portfolio: "https://meera.ml",
    activeDaysAgo: 2,
    achievements: [
      { title: "Winner – Smart India Hackathon 2025", eventName: "Smart India Hackathon 2025", organizer: "Ministry of Education, Govt. of India", position: "WINNER", daysAgo: 300, status: "VERIFIED", description: "Crop disease detection from phone photos, deployed for 2,000 farmers in a pilot district." },
      { title: "Winner – VIT HackX 2025", eventName: "VIT HackX 2025", organizer: "VIT Vellore", position: "WINNER", daysAgo: 180, status: "VERIFIED", description: "Real-time sign language translation running fully on-device." },
      { title: "Winner – Google Solution Challenge Regional", eventName: "Google Solution Challenge 2024", organizer: "Google Developers", position: "WINNER", daysAgo: 420, status: "VERIFIED" },
      { title: "Finalist – Amazon ML Challenge", eventName: "Amazon ML Challenge 2025", organizer: "Amazon", position: "FINALIST", daysAgo: 60, status: "PENDING" },
    ],
  },
  {
    username: "rahul",
    name: "Rahul Verma",
    email: "rahul@example.com",
    bio: "Coding club lead. I run our college hackathon and build full-stack side projects in between.",
    college: "BITS Pilani",
    location: "Pilani",
    availability: "OPEN",
    skills: [["React", "INTERMEDIATE"], ["Node.js", "INTERMEDIATE"], ["MongoDB", "INTERMEDIATE"], ["Presentation", "EXPERT"], ["Project Management", "EXPERT"], ["Pitching", "EXPERT"]],
    roles: ["Full Stack Developer", "Team Lead/Project Manager", "Pitcher/Presenter"],
    github: "https://github.com/rahulv",
    linkedin: "https://linkedin.com/in/rahulv",
    activeDaysAgo: 3,
    achievements: [
      { title: "Winner – BITS Hack 2025", eventName: "BITS Hack 2025", organizer: "BITS Pilani", position: "WINNER", daysAgo: 240, status: "VERIFIED" },
    ],
  },
  {
    username: "aditi",
    name: "Aditi Rao",
    email: "aditi@example.com",
    bio: "Platform admin. I review achievement proofs and new event submissions.",
    college: "IIT Madras",
    location: "Chennai",
    availability: "EVENTS_ONLY",
    role: "ADMIN",
    skills: [["Python", "EXPERT"], ["PostgreSQL", "INTERMEDIATE"], ["Technical Writing", "EXPERT"]],
    roles: ["Backend Developer"],
    github: "https://github.com/aditirao",
    activeDaysAgo: 0,
  },
  {
    username: "sneha",
    name: "Sneha Patil",
    email: "sneha@example.com",
    bio: "Product designer who codes enough to be dangerous. Design systems, user research, and very opinionated about spacing.",
    college: "NID Ahmedabad",
    location: "Ahmedabad",
    availability: "OPEN",
    skills: [["Figma", "EXPERT"], ["UI/UX Research", "EXPERT"], ["Prototyping", "EXPERT"], ["Adobe XD", "INTERMEDIATE"], ["Photoshop", "INTERMEDIATE"], ["Presentation", "INTERMEDIATE"]],
    roles: ["UI/UX Designer", "Pitcher/Presenter"],
    portfolio: "https://sneha.design",
    linkedin: "https://linkedin.com/in/snehapatil",
    activeDaysAgo: 1,
    achievements: [
      { title: "Winner – Design Sprint, TechFest 2025", eventName: "TechFest 2025", organizer: "IIT Bombay", position: "WINNER", daysAgo: 130, status: "VERIFIED", description: "Redesigned a public health reporting flow; judged best on usability." },
    ],
  },
  {
    username: "vikram",
    name: "Vikram Singh",
    email: "vikram@example.com",
    bio: "Infrastructure person. I make things deploy, stay up, and cost less. Kubernetes and AWS all day.",
    college: "IIIT Hyderabad",
    location: "Hyderabad",
    availability: "OPEN",
    skills: [["Docker", "EXPERT"], ["Kubernetes", "EXPERT"], ["AWS", "EXPERT"], ["CI/CD", "INTERMEDIATE"], ["Go", "INTERMEDIATE"], ["PostgreSQL", "INTERMEDIATE"]],
    roles: ["DevOps Engineer", "Backend Developer"],
    github: "https://github.com/vikramsingh",
    activeDaysAgo: 5,
  },
  {
    username: "fatima",
    name: "Fatima Khan",
    email: "fatima@example.com",
    bio: "Flutter developer. Shipped two apps on the Play Store with 10k+ installs between them.",
    college: "Jamia Millia Islamia",
    location: "New Delhi",
    availability: "OPEN",
    skills: [["Flutter", "EXPERT"], ["Kotlin", "INTERMEDIATE"], ["Firebase", "EXPERT"], ["React Native", "BEGINNER"], ["Figma", "BEGINNER"]],
    roles: ["Mobile Developer", "Frontend Developer"],
    github: "https://github.com/fatimak",
    portfolio: "https://fatima.app",
    activeDaysAgo: 2,
    achievements: [
      { title: "Runner-up – Google DevFest Hack", eventName: "DevFest Delhi 2025", organizer: "GDG Delhi", position: "RUNNER_UP", daysAgo: 110, status: "VERIFIED" },
    ],
  },
  {
    username: "karthik",
    name: "Karthik Reddy",
    email: "karthik@example.com",
    bio: "Blockchain developer. Solidity, audits, and a healthy scepticism about most web3 pitches.",
    college: "SRM Institute of Science and Technology",
    location: "Chennai",
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
    username: "ananya",
    name: "Ananya Iyer",
    email: "ananya@example.com",
    bio: "Data analyst who likes making messy datasets tell a clear story. Pandas, SQL, and dashboards.",
    college: "Christ University, Bengaluru",
    location: "Bengaluru",
    availability: "OPEN",
    skills: [["Python", "INTERMEDIATE"], ["Pandas", "EXPERT"], ["MySQL", "INTERMEDIATE"], ["Scikit-learn", "INTERMEDIATE"], ["Technical Writing", "INTERMEDIATE"]],
    roles: ["Data Analyst", "ML/AI Engineer"],
    linkedin: "https://linkedin.com/in/ananyaiyer",
    activeDaysAgo: 8,
  },
  {
    username: "dev",
    name: "Dev Patel",
    email: "dev@example.com",
    bio: "Full stack dev, mostly Next.js and Postgres. Building a habit tracker nobody asked for.",
    college: "DA-IICT Gandhinagar",
    location: "Gandhinagar",
    availability: "OPEN",
    skills: [["Next.js", "EXPERT"], ["React", "EXPERT"], ["Node.js", "INTERMEDIATE"], ["PostgreSQL", "INTERMEDIATE"], ["Prisma", "INTERMEDIATE"], ["Tailwind CSS", "EXPERT"]],
    roles: ["Full Stack Developer", "Frontend Developer"],
    github: "https://github.com/devpatel",
    activeDaysAgo: 1,
  },
  {
    username: "nisha",
    name: "Nisha Gupta",
    email: "nisha@example.com",
    bio: "NLP researcher in training. I spend most of my time on retrieval and evaluation.",
    college: "IIT Kanpur",
    location: "Kanpur",
    availability: "EVENTS_ONLY",
    skills: [["Python", "EXPERT"], ["NLP", "EXPERT"], ["LangChain", "INTERMEDIATE"], ["PyTorch", "INTERMEDIATE"], ["FastAPI", "BEGINNER"]],
    roles: ["ML/AI Engineer"],
    github: "https://github.com/nishagupta",
    portfolio: "https://nisha.page",
    activeDaysAgo: 6,
    achievements: [
      { title: "Finalist – Inter-IIT Tech Meet ML Challenge", eventName: "Inter-IIT Tech Meet 13.0", organizer: "IIT Kanpur", position: "FINALIST", daysAgo: 160, status: "VERIFIED" },
    ],
  },
  {
    username: "ishaan",
    name: "Ishaan Bose",
    email: "ishaan@example.com",
    bio: "Hardware and IoT. Sensors, ESP32 boards, and the occasional soldering burn.",
    college: "Jadavpur University",
    location: "Kolkata",
    availability: "OPEN",
    skills: [["IoT", "EXPERT"], ["Python", "INTERMEDIATE"], ["AR/VR", "BEGINNER"], ["Computer Vision", "BEGINNER"]],
    roles: ["Hardware/IoT Engineer"],
    activeDaysAgo: 12,
  },
  {
    username: "tanvi",
    name: "Tanvi Joshi",
    email: "tanvi@example.com",
    bio: "I pitch. Ten slides, five minutes, no filler. Also handle business models and market sizing.",
    college: "Symbiosis, Pune",
    location: "Pune",
    availability: "OPEN",
    skills: [["Pitching", "EXPERT"], ["Presentation", "EXPERT"], ["Project Management", "INTERMEDIATE"], ["Technical Writing", "INTERMEDIATE"]],
    roles: ["Pitcher/Presenter", "Team Lead/Project Manager"],
    linkedin: "https://linkedin.com/in/tanvijoshi",
    activeDaysAgo: 3,
    achievements: [
      { title: "Winner – Best Pitch, Startup Weekend Pune", eventName: "Startup Weekend Pune 2025", organizer: "Techstars", position: "WINNER", daysAgo: 90, status: "VERIFIED" },
    ],
  },
  {
    username: "rohan",
    name: "Rohan Das",
    email: "rohan@example.com",
    bio: "Backend engineer, Go and Postgres. Currently heads-down on my thesis, so not taking on events.",
    college: "NIT Rourkela",
    location: "Rourkela",
    availability: "NOT_AVAILABLE",
    skills: [["Go", "EXPERT"], ["PostgreSQL", "EXPERT"], ["Redis", "INTERMEDIATE"], ["Docker", "INTERMEDIATE"]],
    roles: ["Backend Developer"],
    github: "https://github.com/rohandas",
    activeDaysAgo: 40,
  },
  {
    username: "zoya",
    name: "Zoya Sheikh",
    email: "zoya@example.com",
    bio: "Security-minded full stack developer. I break things carefully and then fix them.",
    college: "Manipal Institute of Technology",
    location: "Manipal",
    availability: "OPEN",
    skills: [["Cybersecurity", "EXPERT"], ["Node.js", "INTERMEDIATE"], ["React", "INTERMEDIATE"], ["Docker", "BEGINNER"], ["Python", "INTERMEDIATE"]],
    roles: ["Full Stack Developer", "DevOps Engineer"],
    github: "https://github.com/zoyasheikh",
    activeDaysAgo: 7,
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
    location: "Chennai (regional centre)",
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
    name: "Kurukshetra '26 Hackathon",
    slug: "kurukshetra-26-hackathon",
    organizer: "Anna University, CEG Campus",
    description:
      "The flagship 24-hour hackathon at Kurukshetra, Anna University's national techno-management fest. Open to all undergraduate students.",
    startDate: fromNow(30),
    endDate: fromNow(31),
    registrationDeadline: fromNow(16),
    mode: "OFFLINE",
    location: "CEG Campus, Guindy, Chennai",
    minTeamSize: 2,
    maxTeamSize: 4,
    themes: "Civic Tech, EdTech, Accessibility, Sustainability",
    prize: "₹50,000 prize pool",
    registrationLink: "https://example.com/kurukshetra",
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
    name: "Campus Code Carnival 2026",
    slug: "campus-code-carnival-2026",
    organizer: "Coding Club, BITS Pilani",
    description:
      "An inter-college hackathon and coding carnival. Submitted for review — waiting on admin approval.",
    startDate: fromNow(75),
    endDate: fromNow(76),
    registrationDeadline: fromNow(55),
    mode: "OFFLINE",
    location: "BITS Pilani, Rajasthan",
    minTeamSize: 2,
    maxTeamSize: 4,
    themes: "Open Innovation",
    prize: "₹30,000 prize pool",
    status: "PENDING",
  },
];

async function main() {
  console.log("Seeding FindMyTeammate...");

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
  const userByUsername = new Map<string, string>();

  for (const u of USERS) {
    const completeness = profileCompleteness({
      name: u.name,
      image: null,
      bio: u.bio,
      college: u.college,
      location: u.location,
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
        username: u.username,
        email: u.email,
        bio: u.bio,
        college: u.college,
        location: u.location,
        availability: u.availability,
        availabilityUpdatedAt: new Date(Date.now() - (u.activeDaysAgo ?? 3) * day),
        role: u.role ?? "USER",
        onboarded: true,
        githubUrl: u.github,
        linkedinUrl: u.linkedin,
        portfolioUrl: u.portfolio,
        profileCompleteness: completeness,
        lastActiveAt: new Date(Date.now() - (u.activeDaysAgo ?? 3) * day),
        accounts: {
          create: { provider: "demo", providerAccountId: u.email },
        },
      },
    });
    userByUsername.set(u.username, user.id);

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
            a.status === "VERIFIED" || a.status === "REJECTED" ? "Aditi Rao" : null,
        },
      });
    }
  }
  console.log(`  ${userByUsername.size} users with skills, roles and achievements`);

  // --- events -------------------------------------------------------------
  const eventBySlug = new Map<string, string>();
  for (const e of EVENTS) {
    const createdById =
      e.slug === "campus-code-carnival-2026" || e.slug === "kurukshetra-26-hackathon"
        ? (userByUsername.get(e.slug.startsWith("campus") ? "rahul" : "priya") ?? null)
        : (userByUsername.get("aditi") ?? null);

    const event = await db.event.upsert({
      where: { slug: e.slug },
      update: {},
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
    ["rahul", "kurukshetra-26-hackathon", "TEAM_LOOKING_FOR_MEMBERS"],
    ["arjun", "kurukshetra-26-hackathon", "LOOKING_FOR_TEAM"],
    ["fatima", "kurukshetra-26-hackathon", "LOOKING_FOR_TEAM"],
    ["zoya", "kurukshetra-26-hackathon", "LOOKING_FOR_TEAM"],
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
      slug: "kurukshetra-26-hackathon",
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
  console.log("Demo sign-in (no OAuth needed): priya@example.com, meera@example.com,");
  console.log("arjun@example.com, rahul@example.com, or aditi@example.com (admin).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
