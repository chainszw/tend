import { TZDate } from "@date-fns/tz";

/** The parts of a medication that determine when doses fall due. */
export interface MedSchedule {
  id: string;
  times: string[];
  days: number[];
  start_date: string;
  end_date: string | null;
  active: boolean;
  created_at?: string;
}

export type DayPart = "morning" | "afternoon" | "evening" | "night";

export const DAY_PARTS: readonly DayPart[] = [
  "morning",
  "afternoon",
  "evening",
  "night",
];

export const DAY_PART_LABELS: Record<DayPart, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function dateFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = dateFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dateFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Calendar date (`YYYY-MM-DD`) of an instant as seen in the given time zone. */
export function localDateString(instant: Date, timeZone: string): string {
  return dateFormatter(timeZone).format(instant);
}

/** Wall-clock time (`HH:MM`, 24-hour) of an instant in the given time zone. */
export function localTimeString(instant: Date, timeZone: string): string {
  const zoned = new TZDate(instant.getTime(), timeZone);
  const hours = String(zoned.getHours()).padStart(2, "0");
  const minutes = String(zoned.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function parseDate(date: string): [number, number, number] {
  const [year, month, day] = date.split("-").map(Number);
  return [year, month, day];
}

/** Adds whole days to a `YYYY-MM-DD` date string. */
export function addDays(date: string, amount: number): string {
  const [year, month, day] = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day + amount))
    .toISOString()
    .slice(0, 10);
}

/** Day of the week for a `YYYY-MM-DD` date, 0 = Sunday. */
export function weekdayOf(date: string): number {
  const [year, month, day] = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** The instant at which a local date + `HH:MM` time occurs in a time zone. */
export function zonedInstant(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = parseDate(date);
  const [hours, minutes] = time.split(":").map(Number);
  const zoned = new TZDate(year, month - 1, day, hours, minutes, 0, timeZone);
  return new Date(zoned.getTime());
}

/** Whether a medication is scheduled at all on the given local date. */
export function isScheduledOn(med: MedSchedule, date: string): boolean {
  if (!med.active) return false;
  if (date < med.start_date) return false;
  if (med.end_date !== null && date > med.end_date) return false;
  return med.days.includes(weekdayOf(date));
}

/** Dose instants for one medication on one local date, in time order. */
export function occurrencesOnDate(
  med: MedSchedule,
  date: string,
  timeZone: string,
): Date[] {
  if (!isScheduledOn(med, date)) return [];
  const createdAt = med.created_at ? new Date(med.created_at).getTime() : 0;
  return [...med.times]
    .sort()
    .map((time) => zonedInstant(date, time, timeZone))
    .filter((instant) => instant.getTime() >= createdAt);
}

/** Dose instants with `from < instant <= to` across however many days that spans. */
export function occurrencesBetween(
  med: MedSchedule,
  from: Date,
  to: Date,
  timeZone: string,
): Date[] {
  if (to <= from) return [];
  const lastDate = localDateString(to, timeZone);
  const result: Date[] = [];
  let date = localDateString(from, timeZone);
  while (date <= lastDate) {
    for (const instant of occurrencesOnDate(med, date, timeZone)) {
      if (instant > from && instant <= to) result.push(instant);
    }
    date = addDays(date, 1);
  }
  return result;
}

/** Which compartment of the daily organiser a `HH:MM` time belongs to. */
export function dayPartOf(time: string): DayPart {
  const hour = Number(time.slice(0, 2));
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/** Formats `HH:MM` as a friendly 12-hour time such as "8:30 am". */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours < 12 ? "am" : "pm";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEKDAY_LONG_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

/** "Every day" or a short list such as "Mon, Wed, Fri". */
export function describeDays(days: readonly number[]): string {
  const unique = [...new Set(days)].sort();
  if (unique.length === 7) return "Every day";
  return unique.map((day) => WEEKDAY_NAMES[day]).join(", ");
}
