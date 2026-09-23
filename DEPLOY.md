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
  npm run make-admin -- cb.sc.u4cse24535@cb.students.amrita.edu
```

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

```cron
0 3 * * * docker exec fmt-db pg_dump -U postgres findmyteammate | gzip > /var/backups/fmt-$(date +\%F).sql.gz
```

Neon and Supabase both do this for you on paid tiers; on free tiers take your
own dump on the same schedule.

---

## 6. Going from staging to launch

The platform's real risk is not technical — it is an empty database. Search
with no results is a worse first impression than launching a week later. So:

1. Deploy privately and click through it on a phone.
2. Get 15–20 people from one club to build real profiles *before* announcing it.
3. Aim the first announcement at a specific upcoming hackathon, so people
   arrive with a reason to search rather than just to look around.

## 7. Known gaps

- **Certificate uploads are not built.** Achievement proof is a URL field, so
  students link to Google Drive or a results page. Adding real uploads means
  wiring Cloudinary or S3 signed URLs.
- **No automated tests yet.** PRD section 16 specifies Vitest and Playwright.
- **Login lockout is per account, not per IP.** Eight consecutive failures lock
  an account for fifteen minutes; a distributed attack across many accounts is
  not rate limited.
