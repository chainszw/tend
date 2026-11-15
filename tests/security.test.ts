import { describe, expect, it } from "vitest";
import {
  LOCKOUT_MINUTES,
  MAX_FAILED_ATTEMPTS,
  isLocked,
  minutesUntilUnlock,
  registerFailure,
} from "@/lib/lockout";
import {
  generateCircleCode,
  hashPasscode,
  normaliseCircleCode,
  verifyPasscode,
} from "@/lib/passcode";
import { createRateLimiter } from "@/lib/rate-limit";

describe("passcode hashing", () => {
  it("verifies the right passcode and rejects the wrong one", async () => {
    const hash = await hashPasscode("482913");
    expect(await verifyPasscode("482913", hash)).toBe(true);
    expect(await verifyPasscode("482914", hash)).toBe(false);
  });

  it("never stores the passcode and salts every hash", async () => {
    const first = await hashPasscode("482913");
    const second = await hashPasscode("482913");
    expect(first).not.toContain("482913");
    expect(first).not.toBe(second);
  });

  it("rejects malformed stored hashes", async () => {
    expect(await verifyPasscode("482913", "plain-text")).toBe(false);
    expect(await verifyPasscode("482913", "md5$aa$bb")).toBe(false);
  });
});

describe("circle codes", () => {
  it("generates WORD-0000 style codes", () => {
    for (let i = 0; i < 20; i += 1) {
      expect(generateCircleCode()).toMatch(/^[A-Z]{4,5}-\d{4}$/);
    }
  });

  it("normalises what people type", () => {
    expect(normaliseCircleCode("maple 4821")).toBe("MAPLE-4821");
    expect(normaliseCircleCode(" Maple-4821 ")).toBe("MAPLE-4821");
    expect(normaliseCircleCode("maple4821")).toBe("MAPLE-4821");
  });
});

describe("lockout", () => {
  const now = new Date("2026-11-15T10:00:00Z");

  it("locks after the maximum number of failures", () => {
    let state = { failed_attempts: 0, locked_until: null as string | null };
    for (let i = 0; i < MAX_FAILED_ATTEMPTS - 1; i += 1) {
      state = registerFailure(state, now);
      expect(isLocked(state, now)).toBe(false);
    }
    state = registerFailure(state, now);
    expect(isLocked(state, now)).toBe(true);
    expect(minutesUntilUnlock(state, now)).toBe(LOCKOUT_MINUTES);
  });

  it("unlocks once the lock expires", () => {
    const state = { failed_attempts: 0, locked_until: "2026-11-15T10:10:00Z" };
    expect(isLocked(state, new Date("2026-11-15T10:09:59Z"))).toBe(true);
    expect(isLocked(state, new Date("2026-11-15T10:10:01Z"))).toBe(false);
    expect(minutesUntilUnlock(state, new Date("2026-11-15T10:10:01Z"))).toBe(0);
  });
});

describe("rate limiter", () => {
  it("allows up to the limit, then blocks until the window resets", () => {
    const allow = createRateLimiter(2, 1_000);
    expect(allow("a", 0)).toBe(true);
    expect(allow("a", 10)).toBe(true);
    expect(allow("a", 20)).toBe(false);
    expect(allow("b", 20)).toBe(true);
    expect(allow("a", 1_001)).toBe(true);
  });
});
