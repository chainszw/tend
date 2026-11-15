import { describe, expect, it } from "vitest";
import { DEV_SCREENS, isDevDestination, isDevModeEnabled } from "@/lib/dev-mode";

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

describe("Dev mode screens", () => {
  it("covers every signed-in screen and the 3D device", () => {
    expect(DEV_SCREENS.map((screen) => screen.href)).toEqual([
      "/circle",
      "/circle/medications",
      "/circle/appointments",
      "/circle/health",
      "/circle/companion",
      "/circle/family",
      "/device",
    ]);
  });

  it("refuses any destination that is not a listed screen", () => {
    expect(isDevDestination("/device")).toBe(true);
    expect(isDevDestination("/circle/health")).toBe(true);
    expect(isDevDestination("https://example.com")).toBe(false);
    expect(isDevDestination("//example.com")).toBe(false);
    expect(isDevDestination("/circle/unknown")).toBe(false);
    expect(isDevDestination(undefined)).toBe(false);
  });
});
