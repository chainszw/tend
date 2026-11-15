import { describe, expect, it } from "vitest";
import {
  buildDay,
  doseKey,
  doseStatus,
  indexLogs,
  summariseAdherence,
  type LoggedDose,
} from "@/lib/adherence";
import type { MedSchedule } from "@/lib/schedule";

const TZ = "Asia/Kolkata";
const med: MedSchedule = {
  id: "med-1",
  times: ["08:00", "20:00"],
  days: [0, 1, 2, 3, 4, 5, 6],
  start_date: "2026-11-13",
  end_date: null,
  active: true,
};
const taken = (iso: string): LoggedDose => ({
  medication_id: "med-1",
  scheduled_for: iso,
  status: "taken",
});

describe("doseStatus", () => {
  const dose = new Date("2026-11-15T02:30:00Z");
  const at = (minutes: number) => new Date(dose.getTime() + minutes * 60_000);

  it("uses the log when one exists", () => {
    expect(doseStatus(dose, at(500), "taken")).toBe("taken");
    expect(doseStatus(dose, at(-500), "skipped")).toBe("skipped");
  });

  it("moves from later to due to missed as time passes", () => {
    expect(doseStatus(dose, at(-31), undefined)).toBe("later");
    expect(doseStatus(dose, at(-30), undefined)).toBe("due");
    expect(doseStatus(dose, at(60), undefined)).toBe("due");
    expect(doseStatus(dose, at(61), undefined)).toBe("missed");
  });
});

describe("doseKey", () => {
  it("matches database timestamps to computed instants", () => {
    const fromDb = doseKey("med-1", "2026-11-15T02:30:00+00:00");
    const computed = doseKey("med-1", new Date("2026-11-15T08:00:00+05:30"));
    expect(fromDb).toBe(computed);
  });
});

describe("buildDay", () => {
  it("lists doses in order with statuses", () => {
    const now = new Date("2026-11-15T06:00:00Z"); // 11:30 IST
    const logs = indexLogs([taken("2026-11-15T02:30:00Z")]);
    const day = buildDay([med], logs, "2026-11-15", TZ, now);
    expect(day.map((slot) => [slot.time, slot.status])).toEqual([
      ["08:00", "taken"],
      ["20:00", "later"],
    ]);
  });
});

describe("summariseAdherence", () => {
  const now = new Date("2026-11-15T17:00:00Z"); // 22:30 IST on the 15th

  it("counts only doses that are already past due", () => {
    const summary = summariseAdherence([med], [], TZ, new Date("2026-11-15T06:00:00Z"));
    // 13th: 2, 14th: 2, 15th: 08:00 only (20:00 is still ahead)
    expect(summary.expected).toBe(5);
    expect(summary.taken).toBe(0);
    expect(summary.percent).toBe(0);
    expect(summary.streak).toBe(0);
  });

  it("computes percentage and streak", () => {
    const logs = [
      taken("2026-11-13T02:30:00Z"), // 13th morning only → incomplete day
      taken("2026-11-14T02:30:00Z"),
      taken("2026-11-14T14:30:00Z"),
      taken("2026-11-15T02:30:00Z"),
      taken("2026-11-15T14:30:00Z"),
    ];
    const summary = summariseAdherence([med], logs, TZ, now);
    expect(summary.expected).toBe(6);
    expect(summary.taken).toBe(5);
    expect(summary.percent).toBe(83);
    expect(summary.streak).toBe(2);
    expect(summary.days).toHaveLength(7);
  });

  it("counts skipped doses as expected but not taken", () => {
    const logs: LoggedDose[] = [
      { medication_id: "med-1", scheduled_for: "2026-11-15T02:30:00Z", status: "skipped" },
    ];
    const summary = summariseAdherence([med], logs, TZ, now, 1);
    expect(summary.days[0]).toMatchObject({ expected: 2, taken: 0, skipped: 1, missed: 1 });
  });

  it("returns a null percentage when nothing was due", () => {
    const summary = summariseAdherence([], [], TZ, now);
    expect(summary.percent).toBeNull();
    expect(summary.streak).toBe(0);
  });
});
