import type { AdherenceSummary, DoseSlot } from "@/lib/adherence";
import { formatTime } from "@/lib/schedule";

interface RecordMedication {
  name: string;
  dosage: string;
  instructions: string;
  purpose: string;
  times: string[];
}

interface RecordAppointment {
  doctor: string;
  specialty: string;
  location: string;
  notes: string;
  when: string;
}

const STATUS_WORDS: Record<DoseSlot["status"], string> = {
  taken: "taken",
  skipped: "skipped",
  missed: "missed (not logged)",
  due: "due now",
  later: "later today",
};

/** One line per medicine, for AI prompts. */
export function describeMedications(meds: readonly RecordMedication[]): string {
  if (meds.length === 0) return "No medicines are on the schedule.";
  return meds
    .map((med) => {
      const parts = [
        `${med.name}${med.dosage ? ` ${med.dosage}` : ""}`,
        `at ${med.times.map(formatTime).join(", ")}`,
      ];
      if (med.instructions) parts.push(`how: ${med.instructions}`);
      if (med.purpose) parts.push(`for: ${med.purpose}`);
      return `- ${parts.join("; ")}`;
    })
    .join("\n");
}

/** Today's doses with their status, for AI prompts. */
export function describeToday(slots: readonly DoseSlot<{ name: string } & DoseSlot["med"]>[]): string {
  if (slots.length === 0) return "No doses are scheduled today.";
  return slots
    .map((slot) => `- ${formatTime(slot.time)} ${slot.med.name}: ${STATUS_WORDS[slot.status]}`)
    .join("\n");
}

/** Adherence over the period in a sentence or two, for AI prompts. */
export function describeAdherence(summary: AdherenceSummary): string {
  if (summary.percent === null) return "No doses were due in the last 7 days.";
  const missedDays = summary.days.filter((day) => day.missed > 0).length;
  return [
    `Last 7 days: ${summary.taken} of ${summary.expected} due doses taken (${summary.percent}%).`,
    `Days with at least one missed dose: ${missedDays}.`,
    `Current streak of fully taken days: ${summary.streak}.`,
  ].join(" ");
}

/** Upcoming appointments, for AI prompts. */
export function describeAppointments(appointments: readonly RecordAppointment[]): string {
  if (appointments.length === 0) return "No upcoming appointments.";
  return appointments
    .map((appointment) => {
      const who = appointment.specialty
        ? `${appointment.doctor} (${appointment.specialty})`
        : appointment.doctor;
      const extras = [appointment.location, appointment.notes].filter(Boolean).join("; ");
      return `- ${appointment.when}: ${who}${extras ? `; ${extras}` : ""}`;
    })
    .join("\n");
}
