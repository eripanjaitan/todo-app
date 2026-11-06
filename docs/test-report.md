# Test Report

## Command results

| Command | Result | Evidence |
|---|---|---|
| `npm install` | Completed | User reported success |
| `npm run lint` | PASSED | No ESLint output; exit=0 |
| `npm run build` | PASSED | exit=0 |
| `npm test` | PASSED: 8 files, 35 tests | Test Files 8 passed (8); Tests 35 passed (35); Duration 2.18s |

## Acceptance criteria coverage

Only criteria with a passing automated test are marked PASS. Others are marked as code review or gap.

| AC | Coverage | Status |
|---|---|---|
| AC-1 | validation.test.ts (slug, code length). Route not tested. | PARTIAL |
| AC-2 | password.test.ts | PASS |
| AC-3, AC-4 | Route unlock not tested | GAP |
| AC-5 | Code review only (every data route calls getWorkspaceSession) | REVIEW |
| AC-6 | Route access-code not tested | GAP |
| AC-7 to AC-10 | recent-workspaces.test.ts | PASS |
| AC-11 | session.test.ts (missing SESSION_SECRET throws) | PASS |
| AC-12 | session.test.ts (round trip; key mismatch). Version check in workspace-auth.ts is code review only. | PARTIAL |
| AC-13 | Route sign-out-others not tested | GAP |
| AC-14, AC-15 | Code review only (needs Upstash) | REVIEW |
| AC-16, AC-17 | validation.test.ts. Route tasks not tested. | PARTIAL |
| AC-18 | Code review only (no dangerouslySetInnerHTML, grep confirmed) | REVIEW |
| AC-19 | validation.test.ts | PASS |
| AC-20 | time.test.ts (Jakarta to UTC). Route reminder not tested. | PARTIAL |
| AC-21 | Route reminder DELETE not tested | GAP |
| AC-22 | time.test.ts (isInPast) | PASS |
| AC-23 | Code review only | REVIEW |
| AC-24 | Code review only (transaction in tasks/[id] PATCH) | REVIEW |
| AC-25, AC-25a | reminders.test.ts (advanceDaily). Route dismiss not tested. | PARTIAL |
| AC-25b | Code review only | REVIEW |
| AC-26 | route.test.ts (marks due reminders) | PASS |
| AC-27 | cron-auth.test.ts; route.test.ts (401 without or with wrong token) | PASS |
| AC-28 | Code review only (where dueMarkedAt null) | REVIEW |
| AC-29 | vercel.json (review) | REVIEW |
| AC-30, AC-31 | reminders.test.ts (isPanelDue). Tasks route filter not tested. | PARTIAL |
| AC-32 | reminders.test.ts (isPanelDue hides dismissed). Route not tested. | PARTIAL |
| AC-33 | time.test.ts (snooze targets). Route not tested. | PARTIAL |
| AC-34, AC-35 | Route not tested | GAP |
| AC-36, AC-37 | time.test.ts (conversion). formatJakarta not tested. | PARTIAL |
| AC-38 | reminders.test.ts (exact due instant), time.test.ts | PASS |
| AC-39 | Code review only (grep found no console calls) | REVIEW |
| AC-40 | Code review only (grep found no raw SQL) | REVIEW |
| AC-41 | Code review only (.gitignore, .env.example) | REVIEW |

## Summary
- PASS: AC-2, AC-7 to AC-11, AC-19, AC-22, AC-26, AC-27, AC-38
- PARTIAL: AC-1, AC-12, AC-16, AC-17, AC-20, AC-25, AC-30 to AC-33, AC-36, AC-37
- GAP (no automated test): AC-3, AC-4, AC-6, AC-13, AC-21, AC-34, AC-35
- REVIEW only: AC-5, AC-14, AC-15, AC-18, AC-23, AC-24, AC-25b, AC-28, AC-29, AC-39, AC-40, AC-41

Acceptance requires an automated test for every criterion (`agents.md` section 8). Route tests for the GAP and PARTIAL rows are the next step.
