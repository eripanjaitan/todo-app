# Task Reminder

Workspace-based to-do list with in-app reminders. Times are shown in Asia/Jakarta and stored in UTC. There are no user accounts: each workspace is protected by an access code.

## Setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to both `.env` (read by Prisma CLI) and `.env.local` (read by Next.js), then fill in real values in both:
   - `DATABASE_URL` (Neon pooled), `DIRECT_URL` (Neon direct)
   - `SESSION_SECRET` (32+ random characters)
   - `CRON_SECRET` (random string)
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
3. `npm install` (also runs `prisma generate`).
4. `npx prisma migrate dev --name init` to create the tables locally.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | Lint |
| `npm test` | Unit and route tests (Vitest) |
| `npx prisma migrate deploy` | Apply migrations to a non-local database |

## Deployment

Vercel is connected to `main`. `vercel.json` schedules the reminder check once a day (00:00 UTC, which is 07:00 Jakarta). Set the same environment variables in Vercel. Vercel sends `CRON_SECRET` as a Bearer token to the cron route.

## Notes
- Snooze options: 10 minutes, 1 hour, or tomorrow at 09:00 Jakarta time.
- Reminders can be set to Once or Daily. Changing the repeat interval later only needs a new enum value.
- Lost access codes cannot be recovered in this version.
