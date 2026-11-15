import { describe, expect, it } from "vitest";
import {
  addDays,
  dayPartOf,
  formatTime,
  isScheduledOn,
  localDateString,
  localTimeString,
  occurrencesBetween,
  occurrencesOnDate,
  weekdayOf,
  zonedInstant,
  type MedSchedule,
} from "@/lib/schedule";

const KOLKATA = "Asia/Kolkata";
const NEW_YORK = "America/New_York";

const med = (overrides: Partial<MedSchedule> = {}): MedSchedule => ({
  id: "med-1",
  times: ["08:00", "20:00"],
  days: [0, 1, 2, 3, 4, 5, 6],
  start_date: "2026-11-01",
  end_date: null,
  active: true,
  ...overrides,
});

describe("date helpers", () => {
  it("reads the local calendar date in a time zone", () => {
    const instant = new Date("2026-11-15T20:00:00Z"); // 01:30 next day in IST
    expect(localDateString(instant, KOLKATA)).toBe("2026-11-16");
    expect(localDateString(instant, NEW_YORK)).toBe("2026-11-15");
  });

  it("reads the local wall-clock time", () => {
    expect(localTimeString(new Date("2026-11-15T02:30:00Z"), KOLKATA)).toBe("08:00");
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("finds the weekday of a date", () => {
    expect(weekdayOf("2026-11-15")).toBe(0); // Sunday
    expect(weekdayOf("2026-11-16")).toBe(1);
  });

  it("converts a local date and time to the right instant", () => {
    expect(zonedInstant("2026-11-15", "08:00", KOLKATA).toISOString()).toBe(
      "2026-11-15T02:30:00.000Z",
    );
  });

  it("handles daylight-saving offsets", () => {
    // New York is UTC-4 in July and UTC-5 in December.
    expect(zonedInstant("2026-07-01", "08:00", NEW_YORK).toISOString()).toBe(
      "2026-07-01T12:00:00.000Z",
    );
    expect(zonedInstant("2026-12-01", "08:00", NEW_YORK).toISOString()).toBe(
      "2026-12-01T13:00:00.000Z",
    );
  });
});

describe("isScheduledOn", () => {
  it("respects start and end dates", () => {
    const bounded = med({ start_date: "2026-11-10", end_date: "2026-11-12" });
    expect(isScheduledOn(bounded, "2026-11-09")).toBe(false);
    expect(isScheduledOn(bounded, "2026-11-10")).toBe(true);
    expect(isScheduledOn(bounded, "2026-11-12")).toBe(true);
    expect(isScheduledOn(bounded, "2026-11-13")).toBe(false);
  });

  it("respects chosen weekdays and the active flag", () => {
    const mondays = med({ days: [1] });
    expect(isScheduledOn(mondays, "2026-11-16")).toBe(true);
    expect(isScheduledOn(mondays, "2026-11-17")).toBe(false);
    expect(isScheduledOn(med({ active: false }), "2026-11-16")).toBe(false);
  });
});

describe("occurrences", () => {
  it("lists a day's doses in time order", () => {
    const doses = occurrencesOnDate(med({ times: ["20:00", "08:00"] }), "2026-11-15", KOLKATA);
    expect(doses.map((d) => d.toISOString())).toEqual([
      "2026-11-15T02:30:00.000Z",
      "2026-11-15T14:30:00.000Z",
    ]);
  });

  it("skips doses scheduled before the medication was added", () => {
    const added = med({ created_at: "2026-11-15T06:00:00Z" });
    const doses = occurrencesOnDate(added, "2026-11-15", KOLKATA);
    expect(doses).toHaveLength(1);
    expect(doses[0].toISOString()).toBe("2026-11-15T14:30:00.000Z");
  });

  it("finds doses in a window that crosses midnight", () => {
    const from = new Date("2026-11-15T14:00:00Z"); // 19:30 IST
    const to = new Date("2026-11-16T03:00:00Z"); // 08:30 IST next day
    const doses = occurrencesBetween(med(), from, to, KOLKATA);
    expect(doses.map((d) => d.toISOString())).toEqual([
      "2026-11-15T14:30:00.000Z",
      "2026-11-16T02:30:00.000Z",
    ]);
  });

  it("treats the window as exclusive of its start and inclusive of its end", () => {
    const dose = new Date("2026-11-15T02:30:00Z");
    expect(occurrencesBetween(med(), dose, new Date(dose.getTime() + 1), KOLKATA)).toEqual([]);
    expect(
      occurrencesBetween(med(), new Date(dose.getTime() - 1), dose, KOLKATA),
    ).toHaveLength(1);
  });

  it("returns nothing for an empty or reversed window", () => {
    const at = new Date("2026-11-15T02:30:00Z");
    expect(occurrencesBetween(med(), at, at, KOLKATA)).toEqual([]);
  });
});

describe("display helpers", () => {
  it("assigns times to parts of the day", () => {
    expect(dayPartOf("05:00")).toBe("morning");
    expect(dayPartOf("12:00")).toBe("afternoon");
    expect(dayPartOf("17:30")).toBe("evening");
    expect(dayPartOf("21:00")).toBe("night");
    expect(dayPartOf("02:00")).toBe("night");
  });

  it("formats 24-hour times for reading", () => {
    expect(formatTime("00:05")).toBe("12:05 am");
    expect(formatTime("08:30")).toBe("8:30 am");
    expect(formatTime("12:00")).toBe("12:00 pm");
    expect(formatTime("20:15")).toBe("8:15 pm");
  });
});
