"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/data";
import {
  describeReading,
  readingFromRow,
  readingFromTyped,
  readingSchema,
  type ReadingInput,
  type ReadingRow,
  type StoredReading,
} from "@/lib/device/readings";
import { createRateLimiter } from "@/lib/rate-limit";
import { requireSession, type Session } from "@/lib/session";
import type { ActionState } from "@/lib/types";

const allowSave = createRateLimiter(30, 5 * 60_000);
const COLUMNS =
  "id, kind, systolic, diastolic, pulse, spo2, temperature_c, weight_kg, irregular, taken_at";

export interface SaveReadingResult {
  ok: boolean;
  message: string;
  reading?: StoredReading;
}

async function insertReading(
  session: Session,
  input: ReadingInput,
  source: string,
): Promise<SaveReadingResult> {
  const { kind, ...values } = input;
  const { data, error } = await db()
    .from("readings")
    .insert({ ...values, kind, circle_id: session.circleId, logged_by: session.memberId })
    .select(COLUMNS)
    .single();
  const reading = data ? readingFromRow(data as ReadingRow) : null;
  if (error || !reading) {
    console.error("Save reading failed:", error?.message);
    return { ok: false, message: "We could not save this reading. Try again." };
  }

  await logActivity(session, `recorded ${describeReading(input).toLowerCase()} ${source}`);
  revalidatePath("/circle", "layout");
  return { ok: true, message: "Reading saved", reading };
}

/** Saves a reading confirmed on the Home Station to the signed-in member's family. */
export async function saveReadingAction(input: unknown): Promise<SaveReadingResult> {
  const session = await requireSession();
  if (!allowSave(session.memberId)) {
    return { ok: false, message: "Too many readings at once. Wait a few minutes and try again." };
  }
  const parsed = readingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That reading does not look right. Measure again." };
  return insertReading(session, parsed.data, "with the Tend device");
}

/** Saves a reading someone typed in by hand. */
export async function addManualReadingAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  if (!allowSave(session.memberId)) {
    return { ok: false, message: "Too many readings at once. Wait a few minutes and try again." };
  }
  const typed: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") typed[key] = value;
  }
  const result = readingFromTyped(typed.kind ?? "", typed);
  if (!result.ok) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors: result.fieldErrors };
  }
  const saved = await insertReading(session, result.reading, "by hand");
  return { ok: saved.ok, message: saved.message };
}
