import "server-only";
import { db } from "@/lib/db";
import { readingFromRow, type ReadingRow, type StoredReading } from "@/lib/device/readings";
import type { Session } from "@/lib/session";
import type {
  ActivityEntry,
  Appointment,
  Circle,
  DoseLog,
  Medication,
  Member,
} from "@/lib/types";

const CIRCLE_COLUMNS = "id, code, elder_name, elder_email, timezone, created_at";
const MEDICATION_COLUMNS =
  "id, circle_id, name, dosage, instructions, purpose, times, days, start_date, end_date, active, created_at";
const APPOINTMENT_COLUMNS =
  "id, circle_id, doctor, specialty, location, starts_at, notes, prep_questions";

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(`Database error: ${result.error.message}`);
  return result.data as T;
}

/** Every query below is scoped by circle id taken from the verified session. */

export async function getCircle(circleId: string): Promise<Circle | null> {
  const result = await db()
    .from("circles")
    .select(CIRCLE_COLUMNS)
    .eq("id", circleId)
    .maybeSingle();
  return unwrap<Circle | null>(result);
}

export async function listMembers(circleId: string): Promise<Member[]> {
  const result = await db()
    .from("members")
    .select("id, circle_id, name, email, role, notify, created_at")
    .eq("circle_id", circleId)
    .order("created_at");
  return unwrap<Member[]>(result);
}

export async function listMedications(
  circleId: string,
  options: { activeOnly?: boolean } = {},
): Promise<Medication[]> {
  let query = db()
    .from("medications")
    .select(MEDICATION_COLUMNS)
    .eq("circle_id", circleId)
    .order("name");
  if (options.activeOnly) query = query.eq("active", true);
  return unwrap<Medication[]>(await query);
}

export async function getMedication(
  circleId: string,
  medicationId: string,
): Promise<Medication | null> {
  const result = await db()
    .from("medications")
    .select(MEDICATION_COLUMNS)
    .eq("circle_id", circleId)
    .eq("id", medicationId)
    .maybeSingle();
  return unwrap<Medication | null>(result);
}

export async function listDoseLogs(circleId: string, since: Date): Promise<DoseLog[]> {
  const result = await db()
    .from("dose_logs")
    .select("medication_id, scheduled_for, status, logged_at")
    .eq("circle_id", circleId)
    .gte("scheduled_for", since.toISOString());
  return unwrap<DoseLog[]>(result);
}

export async function listAppointments(
  circleId: string,
  options: { from?: Date; limit?: number } = {},
): Promise<Appointment[]> {
  let query = db()
    .from("appointments")
    .select(APPOINTMENT_COLUMNS)
    .eq("circle_id", circleId)
    .order("starts_at");
  if (options.from) query = query.gte("starts_at", options.from.toISOString());
  if (options.limit) query = query.limit(options.limit);
  return unwrap<Appointment[]>(await query);
}

export async function getAppointment(
  circleId: string,
  appointmentId: string,
): Promise<Appointment | null> {
  const result = await db()
    .from("appointments")
    .select(APPOINTMENT_COLUMNS)
    .eq("circle_id", circleId)
    .eq("id", appointmentId)
    .maybeSingle();
  return unwrap<Appointment | null>(result);
}

export async function listActivity(circleId: string, limit = 20): Promise<ActivityEntry[]> {
  const result = await db()
    .from("activity")
    .select("id, member_name, member_role, summary, created_at")
    .eq("circle_id", circleId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return unwrap<ActivityEntry[]>(result);
}

/** Records who did what, so everyone in the circle can see changes. */
export async function logActivity(session: Session, summary: string): Promise<void> {
  const { error } = await db().from("activity").insert({
    circle_id: session.circleId,
    member_name: session.name,
    member_role: session.role,
    summary: summary.slice(0, 300),
  });
  if (error) console.error("Could not record activity:", error.message);
}

const READING_COLUMNS =
  "id, kind, systolic, diastolic, pulse, spo2, temperature_c, weight_kg, irregular, taken_at";

/**
 * Newest device readings first. Returns an empty list (instead of failing the
 * page) if the `readings` table has not been created yet.
 */
export async function listReadings(circleId: string, limit = 30): Promise<StoredReading[]> {
  const { data, error } = await db()
    .from("readings")
    .select(READING_COLUMNS)
    .eq("circle_id", circleId)
    .order("taken_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("Could not load readings:", error.message);
    return [];
  }
  return ((data ?? []) as ReadingRow[])
    .map(readingFromRow)
    .filter((reading): reading is StoredReading => reading !== null);
}
