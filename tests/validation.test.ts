import { describe, expect, it } from "vitest";
import {
  appointmentSchema,
  chatSchema,
  createCircleSchema,
  doseLogSchema,
  fieldErrors,
  isValidTimeZone,
  joinCircleSchema,
  medicationSchema,
  prescriptionTextSchema,
} from "@/lib/validation";

const circle = {
  elderName: "Asha Rao",
  elderEmail: "",
  yourName: "Priya",
  yourEmail: " Priya@Example.com ",
  role: "family",
  passcode: "482913",
  timezone: "Asia/Kolkata",
};

describe("createCircleSchema", () => {
  it("accepts valid input and normalises emails", () => {
    const parsed = createCircleSchema.parse(circle);
    expect(parsed.yourEmail).toBe("priya@example.com");
    expect(parsed.elderEmail).toBeNull();
  });

  it("rejects weak passcodes, bad emails, roles and time zones", () => {
    for (const bad of [
      { passcode: "12345" },
      { passcode: "12345a" },
      { yourEmail: "not-an-email" },
      { role: "admin" },
      { timezone: "Mars/Olympus" },
      { yourName: "   " },
    ]) {
      expect(createCircleSchema.safeParse({ ...circle, ...bad }).success).toBe(false);
    }
  });

  it("reports one message per field", () => {
    const result = createCircleSchema.safeParse({ ...circle, passcode: "1", yourName: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(errors.passcode).toBe("Use exactly 6 digits");
      expect(errors.yourName).toBe("Enter a name");
    }
  });
});

describe("joinCircleSchema", () => {
  it("requires a code and a 6-digit passcode", () => {
    const base = { code: "MAPLE-4821", passcode: "482913", yourName: "Ravi", yourEmail: "", role: "caretaker" };
    expect(joinCircleSchema.safeParse(base).success).toBe(true);
    expect(joinCircleSchema.safeParse({ ...base, code: "" }).success).toBe(false);
    expect(joinCircleSchema.safeParse({ ...base, passcode: "abcdef" }).success).toBe(false);
  });
});

describe("medicationSchema", () => {
  const med = {
    name: "Metformin",
    dosage: "500 mg",
    instructions: "",
    purpose: "",
    times: ["20:00", "08:00", "08:00"],
    days: [1, 0, 1],
    startDate: "2026-11-15",
    endDate: "",
  };

  it("sorts and de-duplicates times and days", () => {
    const parsed = medicationSchema.parse(med);
    expect(parsed.times).toEqual(["08:00", "20:00"]);
    expect(parsed.days).toEqual([0, 1]);
    expect(parsed.endDate).toBeNull();
  });

  it("rejects missing or malformed schedule data", () => {
    expect(medicationSchema.safeParse({ ...med, times: [] }).success).toBe(false);
    expect(medicationSchema.safeParse({ ...med, times: ["8am"] }).success).toBe(false);
    expect(medicationSchema.safeParse({ ...med, times: ["24:00"] }).success).toBe(false);
    expect(medicationSchema.safeParse({ ...med, days: [] }).success).toBe(false);
    expect(medicationSchema.safeParse({ ...med, days: [7] }).success).toBe(false);
    expect(medicationSchema.safeParse({ ...med, name: "" }).success).toBe(false);
    expect(medicationSchema.safeParse({ ...med, startDate: "15/11/2026" }).success).toBe(false);
    expect(medicationSchema.safeParse({ ...med, name: "x".repeat(121) }).success).toBe(false);
  });
});

describe("other schemas", () => {
  it("validates appointments", () => {
    const visit = { doctor: "Dr. Rao", specialty: "", location: "", date: "2026-11-20", time: "10:30", notes: "" };
    expect(appointmentSchema.safeParse(visit).success).toBe(true);
    expect(appointmentSchema.safeParse({ ...visit, doctor: "" }).success).toBe(false);
    expect(appointmentSchema.safeParse({ ...visit, time: "10.30" }).success).toBe(false);
  });

  it("validates dose logs", () => {
    const log = {
      medicationId: "550e8400-e29b-41d4-a716-446655440000",
      scheduledFor: "2026-11-15T02:30:00.000Z",
      status: "taken",
    };
    expect(doseLogSchema.safeParse(log).success).toBe(true);
    expect(doseLogSchema.safeParse({ ...log, medicationId: "1" }).success).toBe(false);
    expect(doseLogSchema.safeParse({ ...log, scheduledFor: "today" }).success).toBe(false);
    expect(doseLogSchema.safeParse({ ...log, status: "eaten" }).success).toBe(false);
  });

  it("limits chat and prescription input size", () => {
    expect(chatSchema.safeParse({ messages: [{ role: "user", content: "Hello" }] }).success).toBe(true);
    expect(chatSchema.safeParse({ messages: [] }).success).toBe(false);
    expect(chatSchema.safeParse({ messages: [{ role: "system", content: "x" }] }).success).toBe(false);
    expect(
      chatSchema.safeParse({ messages: [{ role: "user", content: "x".repeat(2001) }] }).success,
    ).toBe(false);
    expect(prescriptionTextSchema.safeParse({ text: "short" }).success).toBe(false);
    expect(prescriptionTextSchema.safeParse({ text: "x".repeat(4001) }).success).toBe(false);
  });

  it("recognises real time zones", () => {
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("Nowhere/Land")).toBe(false);
  });
});
