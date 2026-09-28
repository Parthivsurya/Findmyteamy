# Deploying FindMyTeammate

Two supported paths: **Vercel + hosted Postgres**, or **your own server**.
Both need the same four things done first.

---

## 1. Pre-flight — do these or it will not work

| Setting | Why it matters |
| --- | --- |
| `DATABASE_PROVIDER=postgresql` + a real `DATABASE_URL` | SQLite cannot be used on Vercel (the filesystem is ephemeral). On your own server SQLite would survive, but Postgres handles concurrent writes properly. |
| `AUTH_SECRET` = 32 random bytes | Sessions and one-time codes are signed with it. The committed default is a public placeholder — anyone could forge a session cookie. Generate with `openssl rand -base64 32`. |
| An email transport — `RESEND_API_KEY` **or** `SMTP_*` | **Registration is impossible without one.** The fallback that prints codes to the console is disabled when `NODE_ENV=production`, so a student would sign up and no code would ever arrive. |
| `ALLOW_DEMO_LOGIN=false` | When true, the sign-in page lists real accounts *and* their shared password. |

Optional but recommended: `CRON_SECRET` (`openssl rand -hex 24`) to enable the
scheduled jobs.

After deploying, open `/api/health` — it reports on exactly these settings:

```json
{
  "status": "ok",
  "database": "ok",
  "config": {
    "email": "configured (resend)",
    "authSecret": "set",
    "demoLogin": "disabled",
    "cron": "configured"
  }
}
```

If `authSecret` says `INSECURE` or `demoLogin` says `ENABLED`, stop and fix it.

---

## 2. Option A — entirely on Vercel (recommended)

No server to run or patch. Vercel does not host databases itself, but you
provision managed Postgres from inside the Vercel dashboard, so there is still
nothing for you to maintain.

### a. The import screen, field by field

**Root Directory** → leave it as `Findmyteamy (root)`. The app is not a
monorepo; `prisma/`, `src/`, `public/` and `scripts/` are all part of one
project.

**Environment Variables — "14 Detected"** → Vercel reads `.env.example` and
offers to pre-fill from it. **Do not accept those values.** They are the
development defaults, and three of them are actively wrong for production:

| Detected value | Why it must not be used |
| --- | --- |
| `DATABASE_PROVIDER="sqlite"` | Must be `postgresql`. |
| `DATABASE_URL="file:./dev.db"` | Points at a local file that will not exist. |
| `AUTH_SECRET="dev-secret-change-me..."` | Publicly known — anyone could forge a session cookie. The app now refuses to start a session with it when `NODE_ENV=production`, so a deploy carrying it will error rather than run insecurely. |
| `ALLOW_DEMO_LOGIN="true"` | Ignored in production builds regardless, but set it to `false` so the intent is explicit. |

Clear the detected list and enter the values in section **c** instead.

**Optional Integrations → Prisma Postgres** → you can skip this. See the note
below on which database to pick.

### a2. Which Postgres: Neon or Prisma Postgres?

The import flow offers **Prisma Postgres**. Either works, but they are not
equivalent for this project:

- **Neon (recommended).** Gives a standard `postgresql://…-pooler…` connection
  string, which is exactly what this app was built and tested against — the
  full migration was verified end to end on PostgreSQL 14. Add it from
  Project → **Storage** after the first deploy.
- **Prisma Postgres.** Its default connection string is a
  `prisma+postgres://accelerate.prisma-data.net/?api_key=…` URL, which is
  Prisma Accelerate over HTTP rather than a normal Postgres connection. Using
  it means either taking that database's *direct* connection string instead, or
  adding `@prisma/extension-accelerate` and generating the client with
  `--no-engine`. Neither is hard, but neither has been tested here.

If you have no preference, choose Neon and skip the Prisma Postgres
integration.

### a. Import the repository

At [vercel.com/new](https://vercel.com/new), import
`Parthivsurya/Findmyteamy`. Framework detection handles the build — do not
override the build command.

### b. Add Postgres

Project → **Storage** → create a **Neon** Postgres database. Vercel injects the
connection variables into the project automatically.

Two details that matter:

- **Use the pooled connection string.** Its host contains `-pooler`. Each
  serverless invocation opens its own connection, and an unpooled string will
  exhaust Postgres connection limits under any real traffic.
- **The variable must be named `DATABASE_URL`.** The integration may only set
  `POSTGRES_URL` / `POSTGRES_PRISMA_URL`. If `DATABASE_URL` is not present, add
  it yourself with the same pooled value — Prisma reads that name.

### c. Set the remaining environment variables

Project → Settings → Environment Variables (Production **and** Preview):

```
DATABASE_PROVIDER = postgresql
AUTH_SECRET       = <openssl rand -base64 32>
RESEND_API_KEY    = re_...
EMAIL_FROM        = FindMyTeammate <onboarding@resend.dev>
CRON_SECRET       = <openssl rand -hex 24>
ALLOW_DEMO_LOGIN  = false
```

`NEXT_PUBLIC_APP_URL` is optional here. When it is unset or blank the app falls
back to `VERCEL_PROJECT_PRODUCTION_URL`, then `VERCEL_URL`, both of which Vercel
injects automatically — so email links and page metadata are correct without
configuring anything, and preview deployments link to themselves. Set it
explicitly once you have a custom domain.

Note that a variable left blank in the dashboard is stored as an **empty
string**, not as unset. Every environment read goes through `src/lib/env.ts`,
which treats blank as absent, because `process.env.X ?? fallback` does not.

**Use Resend rather than SMTP here.** Serverless functions handle an HTTP API
call much better than holding an SMTP connection open, which competes with the
function timeout and is unreliable across cold starts. Resend's free tier is
ample for a campus pilot, and `onboarding@resend.dev` works as the sender until
you verify your own domain.

### d. Create the tables

Run this from your laptop against the production database — Vercel's build does
not migrate for you:

```bash
DATABASE_PROVIDER=postgresql DATABASE_URL="<pooled url>" npm run db:push
DATABASE_PROVIDER=postgresql DATABASE_URL="<pooled url>" npm run db:seed
```

`db:seed` loads **only** the 56 skills and 12 roles. Never run `db:seed:demo`
against production — it creates sixteen fake students who all share one
password.

### d2. If `prisma db push` cannot reach the database

`P1001: Can't reach database server at …:5432` is usually not a problem with
the database. Postgres uses port 5432, and many campus and office networks
block that outbound. Neon's compute also sleeps on the free tier, so the very
first connection can time out while it wakes.

Work through it in this order:

```bash
# 1. Can you open a TCP connection at all?
nc -zv ep-something-pooler.c-2.us-east-1.aws.neon.tech 5432
```

- `Operation timed out` → the port is blocked on your network. Try a phone
  hotspot, or use the browser route below.
- `succeeded` → connectivity is fine, so it is the URL or a sleeping compute.

```bash
# 2. Drop channel_binding, which Prisma's connector does not always accept
export PGURL="postgresql://user:pass@host-pooler.../neondb?sslmode=require"
```

3. Open the Neon console once and run `SELECT 1` in the SQL editor. That wakes
   the compute, after which connections are quick.

**The browser route — works on any network.** Everything can be done over
HTTPS instead:

```bash
npm run db:sql        # writes prisma/bootstrap.sql
```

Paste the whole of `prisma/bootstrap.sql` into Neon's **SQL Editor** and run
it. It contains the full schema plus the 55 skills and 12 team roles, and no
demo accounts. It is safe to re-run — the inserts use
`ON CONFLICT DO NOTHING`. Regenerate it whenever the Prisma schema changes.

### e. Deploy, then check `/api/health`

It must report `email: configured (resend)`, `authSecret: set` and
`demoLogin: disabled`. If it does not, fix that before going further.

### f. Make yourself admin

Sign up on the live site with your Amrita address, confirm the emailed code,
then:

```bash
DATABASE_PROVIDER=postgresql DATABASE_URL="<pooled url>" \
  npm run make-admin -- cb.xx.xx.xxx.xxxxx@cb.students.amrita.edu
```

### f2. Function region

`vercel.json` pins `regions: ["bom1"]` (Mumbai). This is not a preference — it
is the difference between a usable app and an unusable one when the database is
in India:

| Functions | Database | Per query | A page making ~6 queries |
| --- | --- | --- | --- |
| `iad1` Washington | Hyderabad | ~440 ms | over 2 seconds |
| `bom1` Mumbai | Hyderabad | ~20 ms | well under 200 ms |

Measured: 220 ms just to open a TCP connection from Hyderabad to `iad1`. Every
route in this app is server-rendered on demand, so there is no static edge
caching to hide the distance. Hobby plans allow a single region, which `bom1`
uses.

If the database is instead hosted in the United States (Neon `us-east`), remove
the `regions` key so functions run in `iad1` beside it.

### g. Cron

`vercel.json` declares a single daily job, `/api/cron/daily`, which does the
housekeeping and availability reminders every day and the weekly digest on
Mondays. It is one entry on purpose: Hobby plans allow only a small number of
cron jobs at a low frequency, and a single trigger stays inside those limits on
any plan. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.

Note that Vercel validates `vercel.json` strictly: a cron entry accepts only
`path` and `schedule`, and any other property — including a `comment` used to
explain the schedule — fails the build with
`crons[0] should NOT have additional property`. Keep notes here rather than in
that file.

### Costs

Vercel Hobby, Neon free tier and Resend free tier cover a campus pilot at no
cost. A domain is the only likely expense (roughly ₹800–1,000 a year), and it
is optional — `your-app.vercel.app` works fine.

---

## 3. Option B — your own server

Only needed if you would rather not depend on managed free tiers, or you want
the app and database on one box you control. Assumes Ubuntu/Debian with Docker;
Postgres can run on the same machine.

### With Docker

```bash
# Postgres
docker run -d --name fmt-db --restart unless-stopped \
  -e POSTGRES_PASSWORD=<strong-password> \
  -e POSTGRES_DB=findmyteammate \
  -v fmt-pgdata:/var/lib/postgresql/data \
  -p 127.0.0.1:5432:5432 \
  postgres:17-alpine

# The app
git clone https://github.com/Parthivsurya/Findmyteamy.git && cd Findmyteamy
docker build --build-arg DATABASE_PROVIDER=postgresql -t findmyteammate .

# Put the values from section 1 in a file, then:
docker run -d --name fmt-app --restart unless-stopped \
  --env-file ./production.env \
  -p 127.0.0.1:3000:3000 \
  findmyteammate
```

Note both services bind to `127.0.0.1` — nginx is what faces the internet.

### Create the tables

```bash
docker exec -it fmt-app npx prisma db push
docker exec -it fmt-app npx tsx prisma/seed.ts     # master data only
```

### Without Docker

```bash
npm ci
DATABASE_PROVIDER=postgresql npm run build
DATABASE_PROVIDER=postgresql npm run db:push
DATABASE_PROVIDER=postgresql npm run db:seed
node .next/standalone/server.js                     # honours PORT
```

`output: "standalone"` in `next.config.ts` means that one directory is the
whole server. A systemd unit:

```ini
[Unit]
Description=FindMyTeammate
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/findmyteammate
EnvironmentFile=/srv/findmyteammate/production.env
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

### nginx and TLS

```nginx
server {
  listen 80;
  server_name findmyteammate.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Then `sudo certbot --nginx -d findmyteammate.example.com`. Set
`NEXT_PUBLIC_APP_URL` to the `https://` address, or the links in emails will
point at the wrong host.

### Scheduled jobs via crontab

A real cron has no job limit, so you can either use the single combined
endpoint:

```cron
0 4 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/daily >/dev/null
```

or schedule each job separately for finer control:

```cron
0 4 * * *  curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/availability-reminders >/dev/null
30 4 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/cleanup >/dev/null
0 5 * * 1  curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/weekly-digest >/dev/null
```

---

## 4. What the scheduled jobs do

| Endpoint | Schedule | Effect |
| --- | --- | --- |
| `/api/cron/daily` | daily | Everything below in one call; the digest part runs only on Mondays. This is what `vercel.json` uses. |
| `/api/cron/availability-reminders` | daily | Prompts anyone whose availability is over 30 days old, at most once a fortnight, so search results stay truthful. |
| `/api/cron/cleanup` | daily | Purges spent one-time codes, expires requests older than 30 days, clears finished login lockouts. |
| `/api/cron/weekly-digest` | Mondays | Emails team leaders with open roles a ranked shortlist per role. Respects each leader's digest preference. |

All three require `CRON_SECRET` and return `503` when it is unset, rather than
being left open.

---

## 5. Backups

Postgres holds everything; there is no other state to preserve.

`scripts/fmt-backup.sh` is the script running in production. Install it on the
database host and schedule it from root's crontab:

```bash
sudo install -m 750 scripts/fmt-backup.sh /usr/local/bin/fmt-backup.sh
sudo install -d -o opc -g opc -m 750 /home/opc/backups
sudo /usr/local/bin/fmt-backup.sh          # prove it works before trusting it

( sudo crontab -l 2>/dev/null || true; \
  echo '15 3 * * * /usr/local/bin/fmt-backup.sh >> /var/log/fmt-backup.log 2>&1' \
) | sudo crontab -
```

It writes to a `.partial` file first and only renames it after confirming the
dump ends with PostgreSQL's completion marker, so an interrupted run cannot
leave a truncated file that looks like a good backup. It keeps the most recent
14 and prunes the rest.

Two caveats worth being honest about:

- **A backup on the same disk is not a backup.** It protects against a bad
  migration or an accidental delete, not against losing the instance. Copy the
  dumps somewhere else periodically — `rsync` to another host, or object
  storage.
- **The dumps contain every student's email address.** They are written
  `chmod 600`, and the directory is `750`. Keep it that way.

On a managed database instead, Neon and Supabase take their own backups on paid
tiers; on free tiers run this same script against the remote `DATABASE_URL`.

---

## 6. Going from staging to launch

The platform's real risk is not technical — it is an empty database. Search
with no results is a worse first impression than launching a week later. So:

1. Deploy privately and click through it on a phone.
2. Get 15–20 people from one club to build real profiles *before* announcing it.
3. Aim the first announcement at a specific upcoming hackathon, so people
   arrive with a reason to search rather than just to look around.

## 6b. Abuse limits

| Limit | Default | Where |
| --- | --- | --- |
| Codes per address | one per 60 seconds | fixed, not configurable |
| Wrong-code attempts | 5, then the code dies | fixed |
| Codes per network per hour | 20 | `OTP_IP_LIMIT_HOUR` |
| Codes per network per day | 60 | `OTP_IP_LIMIT_DAY` |
| Distinct addresses per network per day | 40 | `OTP_IP_EMAILS_DAY` |
| Failed sign-ins per account | 8, then a 15-minute lock | fixed |
| Team requests sent per user per day | 30 | fixed |

The per-network limits are deliberately loose. Every student on campus wifi
shares one public IP, so a tight limit would lock out a whole classroom during
a sign-up drive — and that failure looks identical to the site being broken.
The per-address cooldown is what protects an individual mailbox; the network
limits exist to stop a script walking through thousands of addresses and
burning the mail provider's daily quota.

If you run a sign-up drive in one room and students start seeing *"Too many
codes have been requested from this network"*, raise `OTP_IP_LIMIT_HOUR` for
the day rather than removing the limit.

Requests are logged in `OtpRequestLog` and pruned by the cleanup job after two
days, which is longer than the widest window consulted.

## 6c. Skill checks (optional)

Set `OPENROUTER_API_KEY` to switch on skill verification. A student who claims
a level for a skill can answer one experience-based question; the answer is
then judged twice, independently — once for whether it reads as
machine-written, once for the level it actually demonstrates. Without the key
the feature does not appear anywhere in the UI.

Model defaults to `typesafe/jev-router`, which routes each request to a
suitable underlying model. Three calls per completed check: one to write the
question, two to judge. Questions for an open attempt are reused on refresh so
a student cannot reroll until an easier one appears.

**The router is not reliable on its own.** Measured live, four calls each:

| Model | Succeeded |
| --- | --- |
| `typesafe/jev-router` | 2/4 — `504 Decision model timed out` |
| `openai/gpt-6-luna` | 4/4 |
| `deepseek/deepseek-v4.1-flash` | 4/4 |

The failure is in the router's decision step, which runs before a model is
chosen, so OpenRouter's own `models` fallback cannot rescue it. The client
therefore retries the primary twice and then asks a concrete model from
`OPENROUTER_FALLBACK_MODELS` instead, which took a 6-call sample from 3/6 to
6/6. Expect 4–14 seconds per call. The two judgements are issued in parallel, since
neither needs the other's output, which took the judging phase from about 14
seconds to 8; a whole check lands around 13–22 seconds. Measured cost is
roughly $0.002 per completed check, so the spend is not the constraint — the
wait is.

Two other things worth knowing, both found by running it rather than reading
it. Reasoning is switched off for these calls: reasoning tokens come out of
the same `max_tokens` budget and arrive in the content field, so leaving it on
returned a truncated monologue and no JSON at all. And a reply that stops
because it ran out of budget is now treated as a retryable failure rather than
parsed as half an answer.

A judgement is applied to the profile only when it is unflagged, confident
(`ASSESSMENT_MIN_CONFIDENCE`, default 60) and actually answered the question
asked. That last condition exists because an earlier version ranked a
detailed, clearly expert answer as BEGINNER at 85% confidence purely for
describing a different problem than the one asked. Drifting off the question
now means inconclusive, not unskilled.

Questions end with an escape hatch — "if that has not happened to you, tell me
about the closest thing" — because they are otherwise specific enough to
punish an honest student whose experience simply went differently. Without it,
a genuine Docker answer about build-cache layering was marked as not
addressing a question about runtime differences, and went unapplied.

### Measured behaviour, judging on System One

Five answers with known provenance, through the real code path:

| Answer | Machine-written | Level |
| --- | --- | --- |
| Genuine expert, specific debugging story | 36% | EXPERT |
| Genuine beginner, tutorial-level | 22% | BEGINNER |
| Genuine, terse, non-native English | 28% | INTERMEDIATE |
| Machine-written, hedging | 96% → flagged | BEGINNER |
| Machine-written, short | 93% → flagged | INTERMEDIATE |

A 57-point gap, with the flag threshold at 80 between the two groups.
Judgement takes 320–550ms, against 8.3 seconds on the chat path.

Getting there needed one non-obvious correction. The first version of the
noul criteria described a genuine answer as one that "recalls a specific
incident, mentions tools and versions, includes dead ends". A real beginner
has none of those, so the question was quietly measuring skill rather than
authorship, and an honest tutorial-level answer scored 59% — closer to
machine-written than the expert answer was. The criteria now also treat
admissions of inexperience as human evidence, since a language model does not
volunteer that it followed a YouTube tutorial, and state plainly that lacking
depth is not evidence of a machine. The same answer now scores 22%.

**How the machine-written score is used matters.** LLM-based AI-text detection
is unreliable, and worst precisely here: short technical answers written by
non-native English speakers. So it never rejects or downgrades anyone. Past
`ASSESSMENT_AI_FLAG_THRESHOLD` (default 80) the attempt is held as `FLAGGED`
for an admin to read on `/admin`, with the question, the answer and what the
model noticed — and the profile is left untouched until a person decides. The
judging prompt is also explicit that grammar slips, brevity and non-native
phrasing are not evidence.

It is also worth being clear-eyed that a determined student can paste the
question into another tab. This raises the cost of faking a level; it does not
make it impossible. Verified achievements remain the stronger signal.

## 7. Known gaps

- **Certificate uploads are not built.** Achievement proof is a URL field, so
  students link to Google Drive or a results page. Adding real uploads means
  wiring Cloudinary or S3 signed URLs.
- **No automated tests yet.** PRD section 16 specifies Vitest and Playwright.
- **Login lockout is per account, not per IP.** Eight consecutive failures lock
  an account for fifteen minutes; a distributed attack across many accounts is
  not rate limited.
