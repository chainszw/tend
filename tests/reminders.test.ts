import { describe, expect, it } from "vitest";
import { recipientsFor, selectReminders, type ReminderMed } from "@/lib/reminders";

const TZ = "Asia/Kolkata";
const med: ReminderMed = {
  id: "med-1",
  name: "Metformin",
  dosage: "500 mg",
  instructions: "After food",
  times: ["08:00", "20:00"],
  days: [0, 1, 2, 3, 4, 5, 6],
  start_date: "2026-11-01",
  end_date: null,
  active: true,
};
const base = { meds: [med], logs: [], appointments: [], timeZone: TZ };
const morningDose = "2026-11-15T02:30:00Z"; // 08:00 IST

describe("selectReminders: doses", () => {
  it("reminds about a dose due within 30 minutes", () => {
    const reminders = selectReminders({ ...base, now: new Date("2026-11-15T02:10:00Z") });
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({ kind: "upcoming", medName: "Metformin", time: "08:00" });
  });

  it("stays quiet when the next dose is more than 30 minutes away", () => {
    expect(selectReminders({ ...base, now: new Date("2026-11-15T01:30:00Z") })).toEqual([]);
  });

  it("flags a dose as missed one hour after its time", () => {
    const reminders = selectReminders({ ...base, now: new Date("2026-11-15T03:35:00Z") });
    expect(reminders.map((r) => r.kind)).toEqual(["missed"]);
  });

  it("does not flag doses in the grace period", () => {
    expect(selectReminders({ ...base, now: new Date("2026-11-15T03:00:00Z") })).toEqual([]);
  });

  it("ignores doses that were logged", () => {
    const logs = [
      { medication_id: "med-1", scheduled_for: morningDose, status: "taken" as const },
    ];
    expect(
      selectReminders({ ...base, logs, now: new Date("2026-11-15T03:35:00Z") }),
    ).toEqual([]);
    expect(
      selectReminders({ ...base, logs, now: new Date("2026-11-15T02:10:00Z") }),
    ).toEqual([]);
  });

  it("stops alerting about doses missed long ago", () => {
    expect(selectReminders({ ...base, now: new Date("2026-11-15T09:00:00Z") })).toEqual([]);
  });

  it("gives each dose a stable, unique reference key", () => {
    const first = selectReminders({ ...base, now: new Date("2026-11-15T02:10:00Z") });
    const second = selectReminders({ ...base, now: new Date("2026-11-15T02:20:00Z") });
    expect(first[0].refKey).toBe(second[0].refKey);
    const missed = selectReminders({ ...base, now: new Date("2026-11-15T03:35:00Z") });
    expect(missed[0].refKey).not.toBe(first[0].refKey);
  });
});

describe("selectReminders: appointments", () => {
  const appointment = {
    id: "appt-1",
    doctor: "Dr. Rao",
    specialty: "Cardiology",
    location: "City Clinic",
    starts_at: "2026-11-16T05:00:00Z",
  };
  const input = { ...base, meds: [], appointments: [appointment] };

  it("sends a day-before reminder", () => {
    const reminders = selectReminders({ ...input, now: new Date("2026-11-15T06:00:00Z") });
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({ kind: "appointment", soon: false });
  });

  it("sends a separate reminder shortly before", () => {
    const day = selectReminders({ ...input, now: new Date("2026-11-15T06:00:00Z") });
    const soon = selectReminders({ ...input, now: new Date("2026-11-16T03:30:00Z") });
    expect(soon[0]).toMatchObject({ kind: "appointment", soon: true });
    expect(soon[0].refKey).not.toBe(day[0].refKey);
  });

  it("ignores appointments in the past or far ahead", () => {
    expect(selectReminders({ ...input, now: new Date("2026-11-16T05:30:00Z") })).toEqual([]);
    expect(selectReminders({ ...input, now: new Date("2026-11-14T00:00:00Z") })).toEqual([]);
  });
});

describe("recipientsFor", () => {
  const members = [
    { email: "Elder@Example.com", role: "elder" as const, notify: true },
    { email: "son@example.com", role: "family" as const, notify: true },
    { email: "nurse@example.com", role: "caretaker" as const, notify: true },
    { email: "quiet@example.com", role: "family" as const, notify: false },
    { email: null, role: "family" as const, notify: true },
  ];

  it("sends upcoming-dose reminders to the elder and caretakers only", () => {
    expect(recipientsFor("upcoming", "elder@example.com", members)).toEqual([
      "elder@example.com",
      "nurse@example.com",
    ]);
  });

  it("brings family in for missed doses and appointments", () => {
    const missed = recipientsFor("missed", null, members);
    expect(missed).toContain("son@example.com");
    expect(missed).not.toContain("quiet@example.com");
    expect(recipientsFor("appointment", null, members)).toHaveLength(3);
  });
});
