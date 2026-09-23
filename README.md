# FindMyTeammate

> Find the right teammates for hackathons and competitions.

FindMyTeammate is a web platform that helps students and developers find the right
teammates for hackathons, coding competitions and project challenges. Every user
creates a profile listing their technical skills, the roles they can play in a team,
and their verified achievements. Anyone forming a team can then search by skill,
role, availability and track record — and invite people directly to a team for a
specific event.

Think of it as LinkedIn built for team formation rather than hiring.

## Core features

- **Skill profiles** — structured skills with proficiency levels and team roles
- **Verified achievements** — hackathon wins backed by certificates and admin review
- **Availability status** — global and per-event, so you only contact people who are free
- **Team Builder** — pick the roles you need, get ranked candidates grouped by role
- **Event pages** — people looking for a team, and teams looking for members
- **Team formation** — open role slots, invites, join requests, notifications

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | Next.js route handlers + server actions |
| Database | Prisma ORM (SQLite for local dev, PostgreSQL in production) |
| Auth | Signed HTTP-only session cookies, GitHub + Google OAuth |
| Validation | Zod |

## Colour palette

| Token | Hex | Use |
| --- | --- | --- |
| Brand | `#2373F4` | primary actions, links, active state |
| Brand light | `#578EF5` | hovers, gradients, secondary accents |
| Sky | `#65D0F4` | informational highlights, charts, rings |
| Lime | `#F2F7A0` | verified badges, highlight chips, callouts |

## Getting started

```bash
npm install
cp .env.example .env
npm run db:push     # create the SQLite dev database
npm run db:seed     # load skills, roles, demo users and events
npm run dev
```

Open http://localhost:3000. The seeded demo accounts are listed on the sign-in page —
pick any one to sign in locally without OAuth credentials.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | start the dev server |
| `npm run build` | production build |
| `npm run db:push` | sync the Prisma schema to the database |
| `npm run db:seed` | seed skills, roles and demo data |
| `npm run db:studio` | browse the database in Prisma Studio |
| `npm run lint` | type-check and lint |

## Documentation

The full product requirements, system design and implementation plan live in
`FindMyTeammate_Project_Documentation.docx`.
