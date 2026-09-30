# FindMyTeammate

> Find the right teammates for hackathons and competitions — built for Amrita Vishwa Vidyapeetham.

FindMyTeammate helps Amrita students find teammates for hackathons, coding
competitions and project challenges. Every student signs in with their Amrita
roll address, lists their technical skills and the roles they can play, and adds
their achievements. Anyone forming a team can then search by skill, role,
availability and verified track record — narrowed to their own year or their own
branch — and invite people directly into a specific open role.

## Core features

- **Skills-first search** — the home page is a skill search, with one-click
  filters for *same year as me* and *same branch as me*
- **Amrita sign-in** — email and password, restricted to student addresses and
  confirmed with a six-digit code over SMTP
- **Academic identity from the address** — campus, school, programme, branch and
  joining year are read from the email, so there is nothing to type and nothing
  to fake
- **Verified achievements** — hackathon results backed by a certificate and
  admin review; only verified wins count in search filters
- **Availability** — global status plus a per-event status, so you only contact
  people who are actually free
- **Team Builder** — describe the roles you need and get a separate ranked
  shortlist for each one
- **Event pages** — people looking for a team, and teams looking for members
- **Two-way team formation** — invites and join requests into specific role
  slots, with team size limits enforced

## How the email address is read

```
cb.sc.u4cse24535@cb.students.amrita.edu
│  │  ││  │  │
│  │  ││  │  └── 535  roll number within the batch
│  │  ││  └───── 24   joined in 2024
│  │  │└──────── cse  branch
│  │  └───────── u4   undergraduate, four years
│  └──────────── sc   School of Computing
└─────────────── cb   Coimbatore campus
```

That gives every profile its branch, batch and year of study, which is what
makes *same year* and *same branch* search possible. The parser and the code
tables live in `src/lib/amrita.ts`.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | Next.js route handlers + server actions |
| Database | Prisma ORM (SQLite for local dev, PostgreSQL in production) |
| Auth | Email + password, scrypt hashing, signed HTTP-only session cookies |
| Email | SMTP via Nodemailer, for one-time codes |
| Validation | Zod |

## Colour palette

| Token | Hex | Use |
| --- | --- | --- |
| Brand | `#2373F4` | primary actions, links, active state |
| Brand light | `#578EF5` | hovers, gradients, secondary accents |
| Sky | `#65D0F4` | informational highlights, rings |
| Lime | `#F2F7A0` | match scores, verified badges, hero accents |

## Getting started

```bash
npm install
cp .env.example .env
npm run db:push     # create the SQLite dev database
npm run db:seed     # load skills, roles, demo students and events
npm run dev
```

Open http://localhost:3000.

### Signing in locally

The seed creates sixteen Amrita students across several branches and batches.
They all share one password, and a few are listed on the sign-in page:

| Address | Student | Branch / batch |
| --- | --- | --- |
| `cb.sc.u4cse24001@cb.students.amrita.edu` | Aditi Nair (admin) | CSE 2024 |
| `cb.sc.u4cse24118@cb.students.amrita.edu` | Priya Sharma | CSE 2024 |
| `cb.sc.u4aie23156@cb.students.amrita.edu` | Meera Krishnan | AIE 2023 |
| `cb.sc.u4cse25211@cb.students.amrita.edu` | Arjun Menon | CSE 2025 |

Password for all of them: `Amrita@2026`

Set `ALLOW_DEMO_LOGIN="false"` to hide that list before deploying.

### Email (one-time codes)

Sign-up confirmation and password resets send a six-digit code. With no SMTP
credentials configured, the code is printed to the server console and shown on
the verification screen, so registration works offline. To send real mail, fill
in the `SMTP_*` values in `.env` — for Gmail that means an app password, not the
account password.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | start the dev server |
| `npm run build` | production build |
| `npm run db:push` | sync the Prisma schema to the database |
| `npm run db:seed` | seed skills, roles and demo data |
| `npm run db:studio` | browse the database in Prisma Studio |
| `npm run typecheck` | TypeScript check |

## Deploying

See **[DEPLOY.md](DEPLOY.md)** for the full guide — Vercel + Neon, or your own
server with Docker, nginx and cron. Four settings are mandatory in production:
a PostgreSQL `DATABASE_URL`, a real `AUTH_SECRET`, working `SMTP_*` (without it
nobody can register), and `ALLOW_DEMO_LOGIN=false`. After deploying, `/api/health`
reports on exactly those.
