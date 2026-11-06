import { describe, expect, it } from "vitest";
import { hashAccessCode, verifyAccessCode } from "./password";

describe("access code hashing (AC-2)", () => {
  it("never stores the plain code and verifies the correct one", async () => {
    const hash = await hashAccessCode("correct-horse");
    expect(hash).not.toContain("correct-horse");
    expect(await verifyAccessCode("correct-horse", hash)).toBe(true);
    expect(await verifyAccessCode("wrong-horse", hash)).toBe(false);
  });
});
