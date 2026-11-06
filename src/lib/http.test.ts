import { describe, expect, it } from "vitest";
import { clientIp } from "./http";

const req = (headers: Record<string, string>) => new Request("http://localhost/x", { headers });

describe("clientIp (m1)", () => {
  it("prefers x-real-ip, which the platform sets", () => {
    expect(clientIp(req({ "x-real-ip": "198.51.100.7", "x-forwarded-for": "10.0.0.1, 198.51.100.7" }))).toBe(
      "198.51.100.7",
    );
  });

  it("uses the last x-forwarded-for entry, not the client-supplied first one", () => {
    expect(clientIp(req({ "x-forwarded-for": "spoofed-by-client, 198.51.100.7" }))).toBe("198.51.100.7");
  });

  it("returns 'unknown' when no header is present", () => {
    expect(clientIp(req({}))).toBe("unknown");
  });
});
