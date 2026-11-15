import {
  addDays,
  localDateString,
  localTimeString,
  occurrencesOnDate,
  type MedSchedule,
} from "@/lib/schedule";
import type { LoggedStatus } from "@/lib/types";

/** A dose becomes "due" this many minutes before its scheduled time. */
export const DUE_WINDOW_MINUTES = 30;
/** An unlogged dose counts as missed this many minutes after its time. */
export const MISSED_AFTER_MINUTES = 60;

export type DoseStatus = "taken" | "skipped" | "missed" | "due" | "later";

export interface LoggedDose {
  medication_id: string;
  scheduled_for: string;
  status: LoggedStatus;
}

export interface DoseSlot<M extends MedSchedule = MedSchedule> {
  med: M;
  instant: Date;
  time: string;
  status: DoseStatus;
}

export interface DayAdherence {
  date: string;
  expected: number;
  taken: number;
  skipped: number;
  missed: number;
}

export interface AdherenceSummary {
  days: DayAdherence[];
  expected: number;
  taken: number;
  /** Whole-number percentage of due doses taken, or null when nothing was due. */
  percent: number | null;
  /** Consecutive days, counting back from today, with every due dose taken. */
  streak: number;
}

/** Stable key identifying one dose of one medication. */
export function doseKey(medicationId: string, instant: Date | string): string {
  const iso = typeof instant === "string" ? new Date(instant).toISOString() : instant.toISOString();
  return `${medicationId}|${iso}`;
}

/** Indexes logs by dose key for constant-time lookup. */
export function indexLogs(logs: readonly LoggedDose[]): Map<string, LoggedStatus> {
  const index = new Map<string, LoggedStatus>();
  for (const log of logs) {
    index.set(doseKey(log.medication_id, log.scheduled_for), log.status);
  }
  return index;
}

/** Status of a dose given the current time and any log recorded for it. */
export function doseStatus(
  instant: Date,
  now: Date,
  logged: LoggedStatus | undefined,
): DoseStatus {
  if (logged) return logged;
  const minutesPast = (now.getTime() - instant.getTime()) / 60_000;
  if (minutesPast > MISSED_AFTER_MINUTES) return "missed";
  if (minutesPast >= -DUE_WINDOW_MINUTES) return "due";
  return "later";
}

/** Every dose scheduled on one local date, in time order, with its status. */
export function buildDay<M extends MedSchedule>(
  meds: readonly M[],
  logIndex: ReadonlyMap<string, LoggedStatus>,
  date: string,
  timeZone: string,
  now: Date,
): DoseSlot<M>[] {
  const slots: DoseSlot<M>[] = [];
  for (const med of meds) {
    for (const instant of occurrencesOnDate(med, date, timeZone)) {
      slots.push({
        med,
        instant,
        time: localTimeString(instant, timeZone),
        status: doseStatus(instant, now, logIndex.get(doseKey(med.id, instant))),
      });
    }
  }
  return slots.sort((a, b) => a.instant.getTime() - b.instant.getTime());
}

function tallyDay(slots: readonly DoseSlot[], date: string): DayAdherence {
  const day: DayAdherence = { date, expected: 0, taken: 0, skipped: 0, missed: 0 };
  for (const slot of slots) {
    if (slot.status === "later" || slot.status === "due") continue;
    day.expected += 1;
    day[slot.status] += 1;
  }
  return day;
}

/** Adherence over the last `dayCount` local days, ending today. */
export function summariseAdherence(
  meds: readonly MedSchedule[],
  logs: readonly LoggedDose[],
  timeZone: string,
  now: Date,
  dayCount = 7,
): AdherenceSummary {
  const logIndex = indexLogs(logs);
  const today = localDateString(now, timeZone);
  const days: DayAdherence[] = [];
  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset);
    days.push(tallyDay(buildDay(meds, logIndex, date, timeZone, now), date));
  }

  const expected = days.reduce((sum, day) => sum + day.expected, 0);
  const taken = days.reduce((sum, day) => sum + day.taken, 0);

  let streak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const day = days[index];
    if (day.expected === 0) continue; // nothing due: neither breaks nor extends
    if (day.taken < day.expected) break;
    streak += 1;
  }

  return {
    days,
    expected,
    taken,
    percent: expected === 0 ? null : Math.round((taken / expected) * 100),
    streak,
  };
}
