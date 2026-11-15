import {
  DUE_WINDOW_MINUTES,
  MISSED_AFTER_MINUTES,
  doseKey,
  indexLogs,
  type LoggedDose,
} from "@/lib/adherence";
import {
  localTimeString,
  occurrencesBetween,
  type MedSchedule,
} from "@/lib/schedule";

/** How far back we still alert about a missed dose (avoids stale floods). */
export const MISSED_LOOKBACK_HOURS = 6;
export const APPOINTMENT_DAY_HOURS = 24;
export const APPOINTMENT_SOON_HOURS = 2;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export interface ReminderMed extends MedSchedule {
  name: string;
  dosage: string;
  instructions: string;
}

export interface ReminderAppointment {
  id: string;
  doctor: string;
  specialty: string;
  location: string;
  starts_at: string;
}

export interface DoseReminder {
  kind: "upcoming" | "missed";
  refKey: string;
  medName: string;
  dosage: string;
  instructions: string;
  time: string;
  instant: Date;
}

export interface AppointmentReminder {
  kind: "appointment";
  refKey: string;
  soon: boolean;
  appointment: ReminderAppointment;
}

export type Reminder = DoseReminder | AppointmentReminder;

export interface ReminderInput {
  meds: readonly ReminderMed[];
  logs: readonly LoggedDose[];
  appointments: readonly ReminderAppointment[];
  timeZone: string;
  now: Date;
}

/**
 * Decides which reminders are due right now. Pure: the caller removes ones
 * already sent (by `refKey`) and delivers the rest.
 */
export function selectReminders(input: ReminderInput): Reminder[] {
  const { meds, logs, appointments, timeZone, now } = input;
  const logIndex = indexLogs(logs);
  const reminders: Reminder[] = [];
  const nowMs = now.getTime();

  const toDoseReminder = (
    kind: DoseReminder["kind"],
    med: ReminderMed,
    instant: Date,
  ): DoseReminder => ({
    kind,
    refKey: `${kind}:${doseKey(med.id, instant)}`,
    medName: med.name,
    dosage: med.dosage,
    instructions: med.instructions,
    time: localTimeString(instant, timeZone),
    instant,
  });

  for (const med of meds) {
    const unlogged = (instant: Date) => !logIndex.has(doseKey(med.id, instant));

    const upcoming = occurrencesBetween(
      med,
      now,
      new Date(nowMs + DUE_WINDOW_MINUTES * MINUTE),
      timeZone,
    );
    for (const instant of upcoming.filter(unlogged)) {
      reminders.push(toDoseReminder("upcoming", med, instant));
    }

    const missed = occurrencesBetween(
      med,
      new Date(nowMs - MISSED_LOOKBACK_HOURS * HOUR),
      new Date(nowMs - MISSED_AFTER_MINUTES * MINUTE),
      timeZone,
    );
    for (const instant of missed.filter(unlogged)) {
      reminders.push(toDoseReminder("missed", med, instant));
    }
  }

  for (const appointment of appointments) {
    const untilMs = new Date(appointment.starts_at).getTime() - nowMs;
    if (untilMs <= 0 || untilMs > APPOINTMENT_DAY_HOURS * HOUR) continue;
    const soon = untilMs <= APPOINTMENT_SOON_HOURS * HOUR;
    reminders.push({
      kind: "appointment",
      refKey: `appointment:${soon ? "soon" : "day"}:${appointment.id}`,
      soon,
      appointment,
    });
  }

  return reminders;
}

export interface Recipient {
  email: string | null;
  role: "elder" | "family" | "caretaker";
  notify: boolean;
}

/**
 * Who hears about a reminder. The elder is always told first; family and
 * caretakers are brought in for missed doses and appointments.
 */
export function recipientsFor(
  kind: Reminder["kind"],
  elderEmail: string | null,
  members: readonly Recipient[],
): string[] {
  const emails = new Set<string>();
  if (elderEmail) emails.add(elderEmail.toLowerCase());
  for (const member of members) {
    if (!member.email || !member.notify) continue;
    const included =
      member.role === "elder" || member.role === "caretaker" || kind !== "upcoming";
    if (included) emails.add(member.email.toLowerCase());
  }
  return [...emails];
}
