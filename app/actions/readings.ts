"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/data";
import {
  describeReading,
  readingFromRow,
  readingSchema,
  type ReadingRow,
  type StoredReading,
} from "@/lib/device/readings";
import { createRateLimiter } from "@/lib/rate-limit";
import { requireSession } from "@/lib/session";

const allowSave = createRateLimiter(30, 5 * 60_000);
const COLUMNS =
  "id, kind, systolic, diastolic, pulse, spo2, temperature_c, weight_kg, irregular, taken_at";

export interface SaveReadingResult {
  ok: boolean;
  message: string;
  reading?: StoredReading;
}

/** Saves a reading confirmed on the Home Station to the signed-in member's circle. */
export async function saveReadingAction(input: unknown): Promise<SaveReadingResult> {
  const session = await requireSession();
  if (!allowSave(session.memberId)) {
    return { ok: false, message: "Too many readings at once. Wait a few minutes and try again." };
  }
  const parsed = readingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That reading does not look right. Measure again." };

  const { kind, ...values } = parsed.data;
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

  await logActivity(
    session,
    `recorded ${describeReading(parsed.data).toLowerCase()} with the Tend device`,
  );
  revalidatePath("/circle", "layout");
  return { ok: true, message: "Reading saved", reading };
}
