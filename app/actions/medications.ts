"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getMedication, logActivity } from "@/lib/data";
import { formatTime } from "@/lib/schedule";
import { requireSession } from "@/lib/session";
import type { ActionState } from "@/lib/types";
import {
  doseLogSchema,
  fieldErrors,
  medicationSchema,
  type MedicationInput,
} from "@/lib/validation";

function toRow(input: MedicationInput) {
  return {
    name: input.name,
    dosage: input.dosage,
    instructions: input.instructions,
    purpose: input.purpose,
    times: input.times,
    days: input.days,
    start_date: input.startDate,
    end_date: input.endDate,
  };
}

/** Adds a medicine, or updates it when the form carries an id. */
export async function saveMedicationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const parsed = medicationSchema.safeParse({
    name: formData.get("name") ?? "",
    dosage: formData.get("dosage") ?? "",
    instructions: formData.get("instructions") ?? "",
    purpose: formData.get("purpose") ?? "",
    times: formData.getAll("times").map(String).filter(Boolean),
    days: formData.getAll("days").map(Number),
    startDate: formData.get("startDate") ?? "",
    endDate: formData.get("endDate") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  const id = z.uuid().safeParse(formData.get("id"));
  const supabase = db();
  const row = toRow(parsed.data);
  const { error } = id.success
    ? await supabase
        .from("medications")
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq("id", id.data)
        .eq("circle_id", session.circleId)
    : await supabase
        .from("medications")
        .insert({ ...row, circle_id: session.circleId, created_by: session.memberId });
  if (error) {
    console.error("Save medication failed:", error.message);
    return { ok: false, message: "We could not save this medicine. Try again." };
  }

  const times = parsed.data.times.map(formatTime).join(", ");
  await logActivity(
    session,
    `${id.success ? "updated" : "added"} ${parsed.data.name} (${times})`,
  );
  revalidatePath("/circle", "layout");
  return { ok: true, message: `${parsed.data.name} saved` };
}

const draftListSchema = z.array(medicationSchema).min(1).max(12);

/** Saves medicines the family reviewed after an AI prescription import. */
export async function saveImportedMedicationsAction(
  drafts: unknown,
): Promise<ActionState> {
  const session = await requireSession();
  const parsed = draftListSchema.safeParse(drafts);
  if (!parsed.success) {
    return { ok: false, message: "Some medicines are missing a name or time. Fix them and save again." };
  }
  const { error } = await db()
    .from("medications")
    .insert(
      parsed.data.map((input) => ({
        ...toRow(input),
        circle_id: session.circleId,
        created_by: session.memberId,
      })),
    );
  if (error) {
    console.error("Import medications failed:", error.message);
    return { ok: false, message: "We could not save these medicines. Try again." };
  }
  const names = parsed.data.map((input) => input.name).join(", ");
  await logActivity(session, `added ${names} from a prescription`);
  revalidatePath("/circle", "layout");
  return { ok: true, message: `${parsed.data.length} medicine${parsed.data.length === 1 ? "" : "s"} saved` };
}

/** Pauses or resumes a medicine without losing its history. */
export async function setMedicationActiveAction(
  medicationId: string,
  active: boolean,
): Promise<ActionState> {
  const session = await requireSession();
  const med = await getMedication(session.circleId, medicationId);
  if (!med) return { ok: false, message: "That medicine no longer exists." };
  const { error } = await db()
    .from("medications")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", med.id)
    .eq("circle_id", session.circleId);
  if (error) return { ok: false, message: "We could not update this medicine. Try again." };
  await logActivity(session, `${active ? "resumed" : "paused"} ${med.name}`);
  revalidatePath("/circle", "layout");
  return { ok: true, message: `${med.name} ${active ? "resumed" : "paused"}` };
}

/** Permanently removes a medicine and its dose history. */
export async function deleteMedicationAction(medicationId: string): Promise<ActionState> {
  const session = await requireSession();
  const med = await getMedication(session.circleId, medicationId);
  if (!med) return { ok: false, message: "That medicine no longer exists." };
  const { error } = await db()
    .from("medications")
    .delete()
    .eq("id", med.id)
    .eq("circle_id", session.circleId);
  if (error) return { ok: false, message: "We could not remove this medicine. Try again." };
  await logActivity(session, `removed ${med.name}`);
  revalidatePath("/circle", "layout");
  return { ok: true, message: `${med.name} removed` };
}

/** Marks one dose as taken or skipped, or clears the mark ("clear"). */
export async function logDoseAction(input: {
  medicationId: string;
  scheduledFor: string;
  status: "taken" | "skipped" | "clear";
}): Promise<ActionState> {
  const session = await requireSession();
  const parsed = doseLogSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That dose could not be updated." };
  const { medicationId, status } = parsed.data;
  const scheduledFor = new Date(parsed.data.scheduledFor).toISOString();

  const med = await getMedication(session.circleId, medicationId);
  if (!med) return { ok: false, message: "That medicine no longer exists." };

  const supabase = db();
  const { error } =
    status === "clear"
      ? await supabase
          .from("dose_logs")
          .delete()
          .eq("medication_id", med.id)
          .eq("scheduled_for", scheduledFor)
      : await supabase.from("dose_logs").upsert(
          {
            circle_id: session.circleId,
            medication_id: med.id,
            scheduled_for: scheduledFor,
            status,
            logged_by: session.memberId,
            logged_at: new Date().toISOString(),
          },
          { onConflict: "medication_id,scheduled_for" },
        );
  if (error) {
    console.error("Log dose failed:", error.message);
    return { ok: false, message: "We could not save that. Try again." };
  }

  if (status !== "clear") {
    await logActivity(session, `marked ${med.name} as ${status}`);
  }
  revalidatePath("/circle", "layout");
  const messages = { taken: "Marked as taken", skipped: "Marked as skipped", clear: "Mark removed" };
  return { ok: true, message: messages[status] };
}
