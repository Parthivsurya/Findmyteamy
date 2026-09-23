# Deploying FindMyTeammate

Two supported paths: **Vercel + hosted Postgres**, or **your own server**.
Both need the same four things done first.

---

## 1. Pre-flight — do these or it will not work

| Setting | Why it matters |
| --- | --- |
| `DATABASE_PROVIDER=postgresql` + a real `DATABASE_URL` | SQLite cannot be used on Vercel (the filesystem is ephemeral). On your own server SQLite would survive, but Postgres handles concurrent writes properly. |
| `AUTH_SECRET` = 32 random bytes | Sessions and one-time codes are signed with it. The committed default is a public placeholder — anyone could forge a session cookie. Generate with `openssl rand -base64 32`. |
| `SMTP_*` filled in | **Registration is impossible without it.** The fallback that prints codes to the console is disabled when `NODE_ENV=production`, so with no SMTP a student signs up and no code ever arrives. |
| `ALLOW_DEMO_LOGIN=false` | When true, the sign-in page lists real accounts *and* their shared password. |

Optional but recommended: `CRON_SECRET` (`openssl rand -hex 24`) to enable the
scheduled jobs.

After deploying, open `/api/health` — it reports on exactly these settings:

```json
{
  "status": "ok",
  "database": "ok",
  "config": {
    "smtp": "configured",
    "authSecret": "set",
    "demoLogin": "disabled",
    "cron": "configured"
  }
}
```

If `authSecret` says `INSECURE` or `demoLogin` says `ENABLED`, stop and fix it.

---

## 2. Option A — Vercel + Neon

Neon's free tier is enough for a pilot.

1. **Create the database.** At [neon.tech](https://neon.tech), make a project
   and copy the pooled connection string (it ends `?sslmode=require`).

2. **Import the repo** at [vercel.com/new](https://vercel.com/new). Framework
   detection handles the rest; do not override the build command.

3. **Set the environment variables** in Vercel → Settings → Environment
   Variables (Production *and* Preview):

   ```
   DATABASE_PROVIDER = postgresql
   DATABASE_URL      = postgresql://...  (from Neon)
   AUTH_SECRET       = <openssl rand -base64 32>
   NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
   SMTP_HOST = smtp.gmail.com
   SMTP_PORT = 587
   SMTP_USER = you@gmail.com
   SMTP_PASS = <Google app password>
   SMTP_FROM = FindMyTeammate <you@gmail.com>
   CRON_SECRET = <openssl rand -hex 24>
   ALLOW_DEMO_LOGIN = false
   ```

4. **Create the tables.** From your laptop, pointing at the production database:

   ```bash
   DATABASE_PROVIDER=postgresql DATABASE_URL="postgresql://..." npm run db:push
   DATABASE_PROVIDER=postgresql DATABASE_URL="postgresql://..." npm run db:seed
   ```

   `db:seed` loads **only** the 56 skills and 12 roles. Never run
   `db:seed:demo` against production — it creates sixteen fake students who all
   share one password.

5. **Deploy**, then visit `/api/health`.

6. **Make yourself admin.** Sign up on the live site with your Amrita address,
   confirm the emailed code, then:

   ```bash
   DATABASE_PROVIDER=postgresql DATABASE_URL="postgresql://..." \
     npm run make-admin -- cb.sc.u4cse24535@cb.students.amrita.edu
   ```

Cron is already declared in `vercel.json`, so the three jobs register
automatically. Vercel sends `Authorization: Bearer $CRON_SECRET`.

---

## 3. Option B — your own server

Assumes Ubuntu/Debian with Docker. Postgres can run on the same box.

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

```cron
0 4 * * *  curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/availability-reminders >/dev/null
30 4 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/cleanup >/dev/null
0 5 * * 1  curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/weekly-digest >/dev/null
```

---

## 4. What the scheduled jobs do

| Endpoint | Schedule | Effect |
| --- | --- | --- |
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
