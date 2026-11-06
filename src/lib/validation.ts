import { z } from "zod";

// AC-1: slugs are lowercase letters, digits, and hyphens.
export const SLUG_PATTERN = /^[a-z0-9-]{3,40}$/;

export const createWorkspaceSchema = z.object({
  slug: z.string().regex(SLUG_PATTERN, "Slug must be 3-40 lowercase letters, digits, or hyphens"),
  name: z.string().trim().min(1).max(60),
  accessCode: z.string().min(8, "Access code must be at least 8 characters").max(200),
});

export const unlockSchema = z.object({
  accessCode: z.string().min(1).max(200),
});

// AC-6
export const changeCodeSchema = z.object({
  currentCode: z.string().min(1).max(200),
  newCode: z.string().min(8, "New access code must be at least 8 characters").max(200),
});

// AC-16
export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().max(2000).optional(),
});

// AC-17
export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    notes: z.string().max(2000).nullable().optional(),
    completed: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No changes provided" });

// AC-20: Jakarta wall-clock time, plus repeat setting (AC-25).
export const setReminderSchema = z.object({
  dueLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Use YYYY-MM-DDTHH:mm"),
  repeat: z.enum(["NONE", "DAILY"]).default("NONE"),
});

// AC-33
export const snoozeSchema = z.object({
  option: z.enum(["10m", "1h", "tomorrow9"]),
});
