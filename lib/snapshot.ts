import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import {
  buildDay,
  indexLogs,
  summariseAdherence,
  type AdherenceSummary,
  type DoseSlot,
} from "@/lib/adherence";
import {
  getCircle,
  listAppointments,
  listDoseLogs,
  listMedications,
  listReadings,
} from "@/lib/data";
import { describeReading, type StoredReading } from "@/lib/device/readings";
import { formatDateTime } from "@/lib/format";
import { localDateString } from "@/lib/schedule";
import type { Appointment, Circle, Medication } from "@/lib/types";

const DAY_MS = 86_400_000;
const HISTORY_DAYS = 7;

export interface CareSnapshot {
  circle: Circle;
  now: Date;
  today: string;
  medications: Medication[];
  slots: DoseSlot<Medication>[];
  adherence: AdherenceSummary;
  appointments: Appointment[];
  readings: StoredReading[];
}

/** Loads the circle or signs the visitor out if it no longer exists. */
export const loadCircle = cache(async (circleId: string): Promise<Circle> => {
  const circle = await getCircle(circleId);
  if (!circle) redirect("/join");
  return circle;
});

/**
 * Everything the Today view, Companion and digest need, loaded in parallel
 * and de-duplicated per request with React `cache`.
 */
export const loadSnapshot = cache(async (circleId: string): Promise<CareSnapshot> => {
  const now = new Date();
  const [circle, medications, logs, appointments, readings] = await Promise.all([
    loadCircle(circleId),
    listMedications(circleId, { activeOnly: true }),
    listDoseLogs(circleId, new Date(now.getTime() - (HISTORY_DAYS + 1) * DAY_MS)),
    listAppointments(circleId, { from: now, limit: 5 }),
    listReadings(circleId, 12),
  ]);
  const today = localDateString(now, circle.timezone);
  return {
    circle,
    now,
    today,
    medications,
    slots: buildDay(medications, indexLogs(logs), today, circle.timezone, now),
    adherence: summariseAdherence(medications, logs, circle.timezone, now, HISTORY_DAYS),
    appointments,
    readings,
  };
});

/** The snapshot's device readings as dated lines for `describeReadings`. */
export function readingFacts(snapshot: CareSnapshot): { text: string; when: string }[] {
  return snapshot.readings.map((reading) => ({
    text: describeReading(reading),
    when: formatDateTime(reading.taken_at, snapshot.circle.timezone),
  }));
}
