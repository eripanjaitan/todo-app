-- Add the daily schedule anchor (review finding m2).
-- Existing rows are backfilled from dueAt, so no data is lost.
ALTER TABLE "Reminder" ADD COLUMN "scheduledAt" TIMESTAMP(3);

UPDATE "Reminder" SET "scheduledAt" = "dueAt" WHERE "scheduledAt" IS NULL;

ALTER TABLE "Reminder" ALTER COLUMN "scheduledAt" SET NOT NULL;
