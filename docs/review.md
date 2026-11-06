# Code Review

Reviewer: Hermes Code Reviewer pass
Date: 2026-11-06
Method: re-read changed source and config from disk; ran grep checks for Section 7 items. Tests were run by the user (see `docs/test-report.md`).

## Section 7 checklist

| # | Item | Result |
|---|---|---|
| 1 | `.env*` ignored, `.env.example` committed with placeholders | PASS (`.gitignore` lines 2-4) |
| 2 | No hardcoded secrets, tokens, codes, or connection strings | PASS (grep: secrets only read from `process.env`) |
| 3 | Every route body validated with Zod | PASS (7 routes use `parseBody`; cron has no body) |
| 4 | Prisma query methods only, no raw SQL | PASS (grep: none) |
| 5 | To-do and reminder text rendered as plain text | PASS (grep: no `dangerouslySetInnerHTML`) |
| 6 | Access codes hashed with bcryptjs | PASS (`password.ts`; plain code never stored or logged) |
| 7 | Session cookie httpOnly, jose HS256, key from env | PASS (`workspace-auth.ts`, `session.ts`) |
| 8 | Changing session version revokes other sessions | PASS (sign-out-others route; `getWorkspaceSession` compares version) |
| 9 | Rate limit access-code attempts and other sensitive endpoints | PASS after Stage 5 (M1 fixed: workspace creation limited) |
| 10 | Failed unlock attempts counted | PASS after Stage 5 (M2 fixed: lock after 5 failures for 15 minutes) |
| 11 | Cron rejects requests without valid `CRON_SECRET` | PASS (`cron-auth.ts`, constant-time compare, returns 401) |
| 12 | No secrets, tokens, or request bodies logged | PASS (grep: no `console` calls in `src`) |

## Findings

### Blocker
None.

### Major
- **M1: Workspace creation is not rate limited.** `POST /api/workspaces` has no limiter, so one client can create unlimited workspaces. `agents.md` Section 7 requires rate limiting for "other sensitive endpoints." Proposed fix: apply a per-IP limit to creation using a separate Upstash prefix.
- **M2: Failed-unlock count has no effect.** AC-15 requires counting failures, and the code does that. Nothing acts on the count, so a client that rotates IP addresses can keep guessing codes after the per-IP limit resets. This needs a product decision: lock a workspace after N failures, and if so, for how long. Not fixed until you decide.
- **M3: Changing the access code does not sign out other devices.** If a code leaks, the owner changes it, but devices that already hold a session keep access. This contradicts the intent of US-5 ("respond to a leak"). Proposed fix: increment `sessionVersion` when the code changes, and re-issue this device's cookie, as sign-out-others already does.

### Minor
- **m1: Rate-limit key uses the first `x-forwarded-for` entry.** The first entry can be set by the client, so a client can choose a new key on each request. Proposed fix: use the last entry added by the proxy, or Vercel's `x-real-ip` header.
- **m2: "Tomorrow 09:00" snooze on a daily reminder changes its cadence.** The reminder then repeats at 09:00 Jakarta from that day on. This may be intended, but it isn't specified. Decision needed: keep the daily time, or only snooze the current occurrence.
- **m3: Unlock failures are not tested with a stale session version.** The session-version check is covered in `session.test.ts` and the sign-out route test, but not end to end. Low risk.

### Notes
- `dueMarkedAt` is set only by the cron route and cleared by every edit that changes `dueAt`, as AC-28 requires. The panel uses `dueAt`, so late reminders still show (AC-30).
- Workspace isolation holds on every route: lookups are scoped by `workspaceId` from the session (AC-5, AC-31).

## Summary
0 blockers, 3 major, 3 minor. Stage 5 fixes depend on decisions for M2 and m2. M1, M3, and m1 have clear fixes and can go ahead once approved.

## Stage 5 resolution
| Finding | Resolution |
|---|---|
| M1 | `POST /api/workspaces` limited to 10 per IP per hour (AC-43) |
| M2 | Lock after 5 failures within 15 minutes, for 15 minutes; success resets the count (AC-42). Decided by user. |
| M3 | Access-code change bumps the session version and re-issues this device's cookie (AC-44) |
| m1 | Client IP from `x-real-ip`, else last `x-forwarded-for` entry |
| m2 | Daily reminders keep a `scheduledAt` anchor; snooze changes only the current occurrence. Decided by user. Requires migration `20261106130000_reminder_scheduled_at`. |
| m3 | Tests added for stale session versions and mismatched slugs |

Stage 5 changes still need the local checks: migration (`npx prisma migrate dev`), `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm test`.
