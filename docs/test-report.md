# Test Report

Status: NOT RUN. The sandbox has no network access, so no commands have been executed. Stage 3 (QA) must be run on a machine with network access. Enter the output summary for each row below.

## Commands to run
```
npm install
npm run lint
npm run build
npx prisma migrate dev --name init   # local database
npm test
```

## Acceptance criteria coverage

| AC | Automated test | Result |
|---|---|---|
| AC-1 | validation.test.ts (slug, code length); route POST /api/workspaces (not yet route-tested) | NOT RUN |
| AC-2 | password.test.ts | NOT RUN |
| AC-3 | Route unlock (not yet route-tested) | NOT RUN |
| AC-4 | Route unlock (not yet route-tested) | NOT RUN |
| AC-5 | Code review only (every data route calls getWorkspaceSession) | NOT RUN |
| AC-6 | Route access-code (not yet route-tested) | NOT RUN |
| AC-7 to AC-10 | recent-workspaces.test.ts | NOT RUN |
| AC-11 | session.test.ts | NOT RUN |
| AC-12 | session.test.ts (version field); version check in workspace-auth.ts (code review) | NOT RUN |
| AC-13 | Route sign-out-others (not yet route-tested) | NOT RUN |
| AC-14, AC-15 | Code review only (Upstash required) | NOT RUN |
| AC-16, AC-17 | validation.test.ts; route tasks (not yet route-tested) | NOT RUN |
| AC-18 | Code review only (no dangerouslySetInnerHTML) | NOT RUN |
| AC-19 | validation.test.ts; parseBody in http.ts | NOT RUN |
| AC-20, AC-21 | time.test.ts (conversion); reminder route (not yet route-tested) | NOT RUN |
| AC-22 | time.test.ts (isInPast) | NOT RUN |
| AC-23 | Code review only | NOT RUN |
| AC-24 | Code review only (transaction in tasks/[id] PATCH) | NOT RUN |
| AC-25, AC-25a, AC-25b | reminders.test.ts (advanceDaily); route dismiss (not yet route-tested) | NOT RUN |
| AC-26 | Route cron, route.test.ts | NOT RUN |
| AC-27 | cron-auth.test.ts; route.test.ts (unauthorized) | NOT RUN |
| AC-28 | Code review only (where dueMarkedAt null) | NOT RUN |
| AC-29 | vercel.json schedule (code review) | NOT RUN |
| AC-30, AC-31 | reminders.test.ts (isPanelDue); tasks route filter | NOT RUN |
| AC-32 | reminders.test.ts (isPanelDue); route dismiss | NOT RUN |
| AC-33 to AC-35 | time.test.ts (snooze targets); route snooze (not yet route-tested) | NOT RUN |
| AC-36, AC-37 | time.test.ts; formatJakarta | NOT RUN |
| AC-38 | reminders.test.ts (boundary), time.test.ts | NOT RUN |
| AC-39 | Code review only (no logging of secrets; grep found no console calls) | NOT RUN |
| AC-40 | Code review only (grep found no raw SQL) | NOT RUN |
| AC-41 | .gitignore, .env.example (code review) | NOT RUN |

## Known gaps before the QA pass
- Route tests exist only for the cron route. Other route handlers need tests (AC-1, AC-3, AC-4, AC-6, AC-13, AC-16, AC-17, AC-20, AC-21, AC-25, AC-33).
- shadcn/ui components are not used. Plain Tailwind is used instead. This differs from the stack section of `agents.md`.
- The Prisma migration folder is not committed. Run `npx prisma migrate dev --name init` locally to create it.
