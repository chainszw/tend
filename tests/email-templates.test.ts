import { describe, expect, it } from "vitest";
import {
  appointmentEmail,
  missedDosesEmail,
  upcomingDosesEmail,
} from "@/lib/email-templates";
import { escapeHtml } from "@/lib/html";
import type { DoseReminder } from "@/lib/reminders";

const dose = (overrides: Partial<DoseReminder> = {}): DoseReminder => ({
  kind: "upcoming",
  refKey: "upcoming:med-1|x",
  medName: "Metformin",
  dosage: "500 mg",
  instructions: "After food",
  time: "08:00",
  instant: new Date("2026-11-15T02:30:00Z"),
  ...overrides,
});
const URL = "https://tend.example";

describe("escapeHtml", () => {
  it("escapes characters that could inject markup", () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe(
      "&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;",
    );
  });
});

describe("dose emails", () => {
  it("names the medicine and time for a single upcoming dose", () => {
    const email = upcomingDosesEmail("Asha", [dose()], URL);
    expect(email.subject).toBe("Time for Metformin at 8:00 am");
    expect(email.text).toContain("8:00 am: Metformin (500 mg, After food)");
    expect(email.html).toContain(URL);
  });

  it("summarises several doses", () => {
    const email = upcomingDosesEmail("Asha", [dose(), dose({ medName: "Amlodipine" })], URL);
    expect(email.subject).toBe("2 medicines are due soon for Asha");
  });

  it("warns against doubling a missed dose", () => {
    const email = missedDosesEmail("Asha", [dose({ kind: "missed" })], URL);
    expect(email.subject).toBe("Asha may have missed Metformin");
    expect(email.text).toContain("Do not double a dose");
  });

  it("escapes user-entered text in the HTML body", () => {
    const email = missedDosesEmail("Asha", [dose({ medName: "<script>x</script>" })], URL);
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});

describe("appointmentEmail", () => {
  const appointment = {
    id: "a1",
    doctor: "Dr. Rao",
    specialty: "Cardiology",
    location: "City Clinic",
    starts_at: "2026-11-16T05:00:00Z",
  };

  it("distinguishes day-before and starting-soon reminders", () => {
    const day = appointmentEmail(
      "Asha",
      { kind: "appointment", refKey: "k", soon: false, appointment },
      "Monday 10:30 am",
      URL,
    );
    const soon = appointmentEmail(
      "Asha",
      { kind: "appointment", refKey: "k", soon: true, appointment },
      "Monday 10:30 am",
      URL,
    );
    expect(day.subject).toContain("tomorrow");
    expect(soon.subject).toContain("starts soon");
    expect(day.text).toContain("With: Dr. Rao (Cardiology)");
    expect(day.text).toContain("Where: City Clinic");
  });
});
