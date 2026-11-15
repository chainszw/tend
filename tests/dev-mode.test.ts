import { describe, expect, it } from "vitest";
import { isDevModeEnabled } from "@/lib/dev-mode";

describe("Dev mode switch", () => {
  it("is on in next dev", () => {
    expect(isDevModeEnabled({ NODE_ENV: "development" })).toBe(true);
  });

  it("is off in production by default", () => {
    expect(isDevModeEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(isDevModeEnabled({ NODE_ENV: "production", DEV_MODE: "off" })).toBe(false);
  });

  it("is opt-in in production with DEV_MODE=on", () => {
    expect(isDevModeEnabled({ NODE_ENV: "production", DEV_MODE: "on" })).toBe(true);
  });
});
