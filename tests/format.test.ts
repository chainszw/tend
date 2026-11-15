import { describe, expect, it } from "vitest";
import {
  formatDateTime,
  formatLongDate,
  formatRelative,
  formatWeekday,
  googleCalendarUrl,
} from "@/lib/format";
import { resolveTextSize } from "@/lib/preferences";
import { describeDays } from "@/lib/schedule";

describe("date formatting", () => {
  it("formats an instant in the circle's time zone", () => {
    const text = formatDateTime("2026-11-16T05:00:00Z", "Asia/Kolkata");
    expect(text).toContain("Monday");
    expect(text).toContain("16 November");
    expect(text).toMatch(/10:30/);
  });

  it("formats calendar dates without shifting the day", () => {
    expect(formatLongDate("2026-11-15")).toBe("Sunday, 15 November");
    expect(formatWeekday("2026-11-16")).toBe("Mon");
  });

  it("describes how long ago something happened", () => {
    const now = new Date("2026-11-15T12:00:00Z");
    expect(formatRelative("2026-11-15T11:59:50Z", now)).toBe("just now");
    expect(formatRelative("2026-11-15T11:59:00Z", now)).toBe("1 minute ago");
    expect(formatRelative("2026-11-15T11:15:00Z", now)).toBe("45 minutes ago");
    expect(formatRelative("2026-11-15T09:00:00Z", now)).toBe("3 hours ago");
    expect(formatRelative("2026-11-14T10:00:00Z", now)).toBe("yesterday");
    expect(formatRelative("2026-11-12T12:00:00Z", now)).toBe("3 days ago");
  });
});

describe("googleCalendarUrl", () => {
  it("builds a prefilled Google Calendar link", () => {
    const url = new URL(
      googleCalendarUrl({
        title: "Asha: visit with Dr. Rao",
        startsAt: "2026-11-16T05:00:00Z",
        location: "City Clinic",
        details: "Bring reports",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Asha: visit with Dr. Rao");
    expect(url.searchParams.get("dates")).toBe("20261116T050000Z/20261116T054500Z");
    expect(url.searchParams.get("location")).toBe("City Clinic");
  });

  it("omits empty optional fields and honours the duration", () => {
    const url = new URL(
      googleCalendarUrl({ title: "Visit", startsAt: "2026-11-16T05:00:00Z", durationMinutes: 30 }),
    );
    expect(url.searchParams.has("location")).toBe(false);
    expect(url.searchParams.get("dates")).toBe("20261116T050000Z/20261116T053000Z");
  });
});

describe("describeDays", () => {
  it("summarises the chosen weekdays", () => {
    expect(describeDays([0, 1, 2, 3, 4, 5, 6])).toBe("Every day");
    expect(describeDays([5, 1, 3])).toBe("Mon, Wed, Fri");
  });
});

describe("resolveTextSize", () => {
  it("uses the saved percentage, kept within the allowed range", () => {
    expect(resolveTextSize("125", "family")).toBe(125);
    expect(resolveTextSize("40", "elder")).toBe(90);
    expect(resolveTextSize("999", "elder")).toBe(160);
    expect(resolveTextSize("122", "family")).toBe(120);
  });

  it("understands the older large/normal values", () => {
    expect(resolveTextSize("large", "family")).toBe(130);
    expect(resolveTextSize("normal", "elder")).toBe(110);
  });

  it("defaults to larger text for the person being cared for", () => {
    expect(resolveTextSize(undefined, "elder")).toBe(130);
    expect(resolveTextSize(undefined, "caretaker")).toBe(110);
    expect(resolveTextSize("huge", "family")).toBe(110);
  });
});
