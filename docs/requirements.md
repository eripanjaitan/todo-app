# Requirements: Task Reminder App

Status: DRAFT v3, decisions complete, awaiting explicit user approval (Stage 1, Product Designer)
Date: 2026-11-06

## 1. Product Summary
A workspace-based to-do list with in-app reminders. Each workspace is private and protected by an access code. There are no user accounts. All users are in Asia/Jakarta. Input is text only.

## 2. Glossary
- **Workspace:** A private container for to-do items and reminders, identified by a unique slug and protected by an access code.
- **Access code:** A secret string that unlocks a workspace. Stored only as a bcrypt hash.
- **Session:** A signed, httpOnly cookie that keeps a device unlocked for one workspace.
- **Recent workspace list:** A list kept on the device (not on the server) of workspaces the device has unlocked before.
- **Task:** A to-do item with a title, optional notes, and a completed state.
- **Reminder:** A scheduled time attached to a task. When it becomes due, it appears in the app.
- **Due reminder:** A reminder whose scheduled time (UTC) is at or before the current time and that has not been dismissed or snoozed to a later time.
- **Snooze:** Moving a due reminder to a later time chosen by the user.

## 3. User Stories

**US-1 Workspace creation.** As a person starting a new list, I want to create a workspace with an access code so that my tasks are private.

**US-2 Workspace unlock.** As a returning user, I want to open a workspace and enter its access code so that I can see my tasks on this device.

**US-3 Recent workspaces.** As a returning user, I want my device to remember workspaces I have unlocked so that I don't have to retype the workspace slug.

**US-4 Session management.** As a user, I want my unlock to persist on my device, and I want to be able to sign out every other device so that a lost or shared device cannot keep access.

**US-5 Access code change.** As a workspace member, I want to change the access code so that I can respond to a leak.

**US-6 Task management.** As a user, I want to add, edit, complete, and delete tasks so that I can keep my to-do list current.

**US-7 Reminder setting.** As a user, I want to set a reminder date and time on a task, shown in Jakarta time, so that I am prompted at the right moment.

**US-8 In-app reminder display.** As a user, I want due reminders to appear inside the app so that I notice them when I open or use the workspace.

**US-9 Reminder dismissal.** As a user, I want to dismiss a reminder so that it stops appearing.

**US-10 Reminder snooze.** As a user, I want to snooze a due reminder to a later time so that I can deal with it when I am ready.

**US-11 Scheduled due check.** As the operator, I want a scheduled job to mark reminders as due so that reminders become visible without anyone opening the app at the right moment.

**US-12 Time display.** As a user in Jakarta, I want every time in the app shown in Asia/Jakarta so that I never have to convert.

## 4. Acceptance Criteria

### Workspace and access (US-1, US-2, US-5)
- **AC-1:** A workspace can be created with a unique slug and an access code of at least 8 characters. The request is rejected with a clear message if the slug is taken or the code is too short.
- **AC-2:** The access code is stored only as a bcryptjs hash. A test confirms the plain code does not appear in the stored record.
- **AC-3:** Entering the correct slug and access code sets a signed httpOnly session cookie and grants access to that workspace's tasks and reminders.
- **AC-4:** Entering an incorrect access code returns an error and grants no access. The error does not reveal whether the slug exists or how close the code was.
- **AC-5:** A workspace's tasks and reminders are never returned to a request that lacks a valid session for that workspace. This applies to every route that reads or writes task or reminder data.
- **AC-6:** Changing the access code requires the current access code and produces a new hash. If the current code is lost, the workspace cannot be recovered. This is accepted for this phase.

### Recent workspaces (US-3)
- **AC-7:** After a successful unlock, the workspace slug and display name are saved in the device's local storage. The list holds up to 10 entries, most recent first.
- **AC-8:** The saved list contains only slugs and display names. It never contains the access code, the session token, or any task content.
- **AC-9:** A user can remove a single entry from the recent list, and the entry does not reappear on reload.
- **AC-10:** Selecting a recent entry opens the unlock form with the slug already filled in. The user still enters the access code.

### Sessions (US-4)
- **AC-11:** Session cookies are signed with jose (HS256) using a key read from the `SESSION_SECRET` environment variable. The app refuses to start the session code path if the variable is missing.
- **AC-12:** Each workspace stores a session version. Incrementing it invalidates all sessions issued before the increment.
- **AC-13:** A "sign out other devices" action increments the session version and keeps the current device signed in.

### Rate limiting (US-2, US-5)
- **AC-14:** Unlock attempts are rate limited with `@upstash/ratelimit`. After the limit is reached, further attempts from the same source are rejected until the window resets.
- **AC-15:** Failed unlock attempts are counted per workspace in Upstash Redis. The response to a rejected attempt does not reveal the count.

### Tasks (US-6)
- **AC-16:** A user can create a task with a title of 1 to 200 characters. Notes are optional, with a maximum of 2,000 characters.
- **AC-17:** A user can edit a task's title and notes, mark it complete or incomplete, and delete it.
- **AC-18:** Task text is rendered as plain text. Input containing HTML or script tags is displayed literally and is not executed.
- **AC-19:** Every task write request is validated with a Zod schema. Invalid bodies return a 400 response and make no database change.

### Reminders (US-7)
- **AC-20:** A user can attach a reminder to a task by entering a date and time. The input is interpreted as Asia/Jakarta time and stored as UTC.
- **AC-21:** A user can remove or change a task's reminder.
- **AC-22:** A reminder cannot be set in the past relative to the current Jakarta time at the moment of saving. The request is rejected with a clear message.
- **AC-23:** Each task has at most one active reminder.
- **AC-24:** Completing a task automatically cancels its active reminder. Marking the task incomplete does not restore a cancelled reminder.
- **AC-25:** A reminder can be set to repeat daily at the same Jakarta time of day. The repeat setting is stored as a value (for example, `repeat: "DAILY" | "NONE"`) so other intervals can be added later without a data change.
- **AC-25a:** When a repeating reminder is dismissed or snoozed, only the current occurrence is affected. The next occurrence is scheduled for the following day at the same Jakarta time.
- **AC-25b:** A repeating reminder keeps repeating until the user turns repeat off or deletes the reminder, or the task is completed (AC-24).

### Due check and in-app display (US-8, US-11)
- **AC-26:** A Vercel cron job calls a route handler on the schedule defined in `vercel.json`. The handler marks every reminder whose UTC due time has passed as due.
- **AC-27:** The cron route rejects any request without a valid `CRON_SECRET` with a 401 response and makes no database change.
- **AC-28:** The due check is idempotent. Running it twice in a row does not change the result of the first run.
- **AC-29:** The cron schedule is once per day. Reminders are therefore marked due on the daily run, and the in-app panel also treats any reminder past its UTC due time as due when the workspace is opened. The user accepts that reminders may be late (see Section 6).
- **AC-30:** When a workspace is opened, its due reminders appear in an in-app panel. Each due reminder shows the task title and the due time in Asia/Jakarta.
- **AC-31:** Due reminders are shown only inside the workspace they belong to.

### Dismissal and snooze (US-9, US-10)
- **AC-32:** A user can dismiss a due reminder. A dismissed reminder no longer appears in the in-app panel.
- **AC-33:** A user can snooze a due reminder with one of three options: 10 minutes, 1 hour, or tomorrow at 09:00 Asia/Jakarta time.
- **AC-34:** A snoozed reminder does not appear in the panel until its new time. At that time it becomes due again.
- **AC-35:** Dismissed and snoozed states persist after the page is reloaded.

### Time handling (US-12)
- **AC-36:** All timestamps are stored in UTC in the database.
- **AC-37:** All times shown in the UI are formatted in Asia/Jakarta, using `Intl` with `timeZone: "Asia/Jakarta"`.
- **AC-38:** Unit tests cover the Jakarta-to-UTC conversion, the due-time comparison, and a boundary case at exactly the due time.

### Security and operations
- **AC-39:** No secret, session token, or access code is written to logs. A test or review check confirms this for the unlock and cron routes.
- **AC-40:** Database access uses Prisma query methods only. No raw SQL is built from user input.
- **AC-41:** `.env*` files are listed in `.gitignore`. `.env.example` lists every required variable with placeholder values: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `CRON_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

## 5. Out of Scope (this phase)
- Email, push, or SMS reminders.
- Image upload, OCR, or file attachments.
- User accounts, sign-up with email, or per-user identity within a workspace.
- Account recovery for a lost access code.
- Sharing a workspace with an account holder.
- Languages other than the default UI language.

## 6. Decisions

### Decided by the user (first round)
| # | Question | Decision | Criteria |
|---|---|---|---|
| 1 | Snooze | Enabled | AC-10, AC-33 to AC-35 |
| 3 | Due-check frequency | Once a day | AC-26, AC-29 |
| 4 | Late reminders | Acceptable | AC-29 |
| 5 | Remember workspaces on device | Yes, device-only list | AC-7 to AC-10 |
| 6 | Lost access code | Acceptable, no recovery | AC-6 |
| 7 | Completing a task | Cancels its reminder | AC-24 |

### Pending clarification
### Decided by the user (second round)
| # | Question | Decision | Criteria |
|---|---|---|---|
| P1 | Repeat | Daily repeat, adjustable later | AC-25, AC-25a, AC-25b |
| P2 | Due-check frequency | Once a day for now | AC-26, AC-29 |
| S1 | Snooze options | 10 minutes, 1 hour, tomorrow 09:00 Jakarta | AC-33 |

No items are pending.

## 7. Approval
Stage 1 needs your explicit approval before Stage 2 starts. Reply "approved" to proceed. Your answers in this round are recorded above, but the file still needs the approval itself.
