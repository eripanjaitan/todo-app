import { describe, expect, it } from "vitest";
import {
  createTaskSchema,
  createWorkspaceSchema,
  setReminderSchema,
  updateTaskSchema,
} from "./validation";

describe("createWorkspaceSchema (AC-1)", () => {
  it("accepts a valid slug, name, and 8+ character code", () => {
    expect(createWorkspaceSchema.safeParse({ slug: "home-list", name: "Home", accessCode: "12345678" }).success).toBe(true);
  });
  it("rejects uppercase or short slugs and short codes", () => {
    expect(createWorkspaceSchema.safeParse({ slug: "Home", name: "x", accessCode: "12345678" }).success).toBe(false);
    expect(createWorkspaceSchema.safeParse({ slug: "ab", name: "x", accessCode: "12345678" }).success).toBe(false);
    expect(createWorkspaceSchema.safeParse({ slug: "home", name: "x", accessCode: "short" }).success).toBe(false);
  });
});

describe("task schemas (AC-16, AC-17, AC-19)", () => {
  it("rejects empty and over-long titles", () => {
    expect(createTaskSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: "a".repeat(201) }).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: "ok" }).success).toBe(true);
  });
  it("rejects notes over 2000 characters", () => {
    expect(createTaskSchema.safeParse({ title: "t", notes: "n".repeat(2001) }).success).toBe(false);
  });
  it("rejects an empty update", () => {
    expect(updateTaskSchema.safeParse({}).success).toBe(false);
    expect(updateTaskSchema.safeParse({ completed: true }).success).toBe(true);
  });
});

describe("setReminderSchema (AC-20, AC-25)", () => {
  it("accepts the Jakarta wall-clock format and defaults repeat to NONE", () => {
    const parsed = setReminderSchema.parse({ dueLocal: "2026-11-07T09:00" });
    expect(parsed.repeat).toBe("NONE");
  });
  it("rejects other formats and unknown repeat values", () => {
    expect(setReminderSchema.safeParse({ dueLocal: "07/11/2026 09:00" }).success).toBe(false);
    expect(setReminderSchema.safeParse({ dueLocal: "2026-11-07T09:00", repeat: "WEEKLY" }).success).toBe(false);
  });
});
