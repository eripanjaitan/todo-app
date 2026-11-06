# Test Report

## Command results (user's local machine)

| Command | Result | Evidence |
|---|---|---|
| `npm install` | Completed | User reported success |
| `npm run lint` | PASSED | exit=0 |
| `npm run build` | PASSED | exit=0 |
| `npm test` | PASSED | Test Files 17 passed (17); Tests 71 passed (71); Duration 3.16s |

## Acceptance criteria coverage

Status meanings: PASS = automated test covers it and the run exited 0. PARTIAL = some behavior covered. REVIEW = verified by code review, not a test. GAP = no test.

| AC | Coverage | Status |
|---|---|---|
| AC-1 | route workspaces (slug, taken, hash-only, 201); validation | PASS |
| AC-2 | password.test.ts | PASS |
| AC-3 | route unlock (correct code sets cookie) | PASS |
| AC-4 | route unlock (same 401 for unknown slug and wrong code) | PASS |
| AC-5 | route tasks GET (401 without session) | PASS |
| AC-6 | route access-code (wrong code rejected; new hash stored) | PASS |
| AC-7 to AC-10 | recent-workspaces.test.ts | PASS |
| AC-11 | session.test.ts | PASS |
| AC-12 | session.test.ts; route sign-out-others (version increment) | PASS |
| AC-13 | route sign-out-others | PASS |
| AC-14 | route unlock (429 when rate limited). Limiter itself mocked. | PARTIAL |
| AC-15 | route unlock (failure recorded). Redis itself mocked. | PARTIAL |
| AC-16, AC-17 | route tasks, tasks/[id]; validation | PASS |
| AC-18 | Code review only (no dangerouslySetInnerHTML) | REVIEW |
| AC-19 | validation.test.ts; route tasks (400 on empty title) | PASS |
| AC-20 | time.test.ts; route reminder PUT (stores UTC) | PASS |
| AC-21 | route reminder DELETE (scoped to task and workspace; 401 without session) | PASS (pending local run) |
| AC-22 | time.test.ts; route reminder PUT (past time rejected) | PASS |
| AC-23 | route reminder PUT (one reminder per task via upsert) | PARTIAL |
| AC-24 | route tasks/[id] PATCH (transaction cancels reminder) | PASS |
| AC-25, AC-25a | reminders.test.ts; route dismiss (daily advances) | PASS |
| AC-25b | Code review only | REVIEW |
| AC-26 | route.test.ts (cron marks due) | PASS |
| AC-27 | cron-auth.test.ts; route.test.ts | PASS |
| AC-28 | Code review only (dueMarkedAt filter) | REVIEW |
| AC-29 | vercel.json (review) | REVIEW |
| AC-30 | reminders.test.ts; route tasks GET (isDue flag) | PASS |
| AC-31 | Code review only (workspace filter in every query) | REVIEW |
| AC-32 | route dismiss (one-time sets dismissed) | PASS |
| AC-33 | route snooze (options) | PASS |
| AC-34 | route snooze; tasks GET (hidden until snooze time, reappears after) | PASS (pending local run) |
| AC-35 | tasks GET (dismissed reminder stays hidden when read again). Database persistence itself is not tested. | PARTIAL (pending local run) |
| AC-36, AC-37 | time.test.ts (conversion); formatJakarta test (Jakarta wall time) | PASS (pending local run) |
| AC-38 | reminders.test.ts (exact instant); time.test.ts | PASS |
| AC-39 | Code review only (no logging of secrets) | REVIEW |
| AC-40 | Code review only (no raw SQL) | REVIEW |
| AC-41 | Code review only (.gitignore, .env.example) | REVIEW |

## Open items
- Tests for AC-21, AC-34, AC-35, and AC-37 were added after the last local run and have not been executed yet.
- Lint and build pass with no output recorded. Exit codes are the evidence.
