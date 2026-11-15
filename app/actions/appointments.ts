"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { suggestVisitQuestions } from "@/lib/ai";
import { adaptionConfigured } from "@/lib/adaption";
import {
  describeAdherence,
  describeAppointments,
  describeMedications,
} from "@/lib/care-record";
import { db } from "@/lib/db";
import { getAppointment, logActivity } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { createRateLimiter } from "@/lib/rate-limit";
import { zonedInstant } from "@/lib/schedule";
import { requireSession } from "@/lib/session";
import { loadCircle, loadSnapshot } from "@/lib/snapshot";
import type { ActionState } from "@/lib/types";
import { appointmentSchema, fieldErrors } from "@/lib/validation";

const allowAi = createRateLimiter(10, 5 * 60_000);

/** Adds a doctor appointment, or updates it when the form carries an id. */
export async function saveAppointmentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const parsed = appointmentSchema.safeParse({
    doctor: formData.get("doctor") ?? "",
    specialty: formData.get("specialty") ?? "",
    location: formData.get("location") ?? "",
    date: formData.get("date") ?? "",
    time: formData.get("time") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const { date, time, ...details } = parsed.data;
  const circle = await loadCircle(session.circleId);
  const startsAt = zonedInstant(date, time, circle.timezone).toISOString();

  const id = z.uuid().safeParse(formData.get("id"));
  const supabase = db();
  const { error } = id.success
    ? await supabase
        .from("appointments")
        .update({ ...details, starts_at: startsAt })
        .eq("id", id.data)
        .eq("circle_id", session.circleId)
    : await supabase.from("appointments").insert({
        ...details,
        starts_at: startsAt,
        circle_id: session.circleId,
        created_by: session.memberId,
      });
  if (error) {
    console.error("Save appointment failed:", error.message);
    return { ok: false, message: "We could not save this appointment. Try again." };
  }

  await logActivity(
    session,
    `${id.success ? "updated" : "added"} an appointment with ${details.doctor} on ${formatDateTime(startsAt, circle.timezone)}`,
  );
  revalidatePath("/circle", "layout");
  return { ok: true, message: "Appointment saved" };
}

export async function deleteAppointmentAction(appointmentId: string): Promise<ActionState> {
  const session = await requireSession();
  const appointment = await getAppointment(session.circleId, appointmentId);
  if (!appointment) return { ok: false, message: "That appointment no longer exists." };
  const { error } = await db()
    .from("appointments")
    .delete()
    .eq("id", appointment.id)
    .eq("circle_id", session.circleId);
  if (error) return { ok: false, message: "We could not remove this appointment. Try again." };
  await logActivity(session, `removed the appointment with ${appointment.doctor}`);
  revalidatePath("/circle", "layout");
  return { ok: true, message: "Appointment removed" };
}

/** Asks Adaption for questions to bring to the visit and saves them. */
export async function prepareVisitAction(appointmentId: string): Promise<ActionState> {
  const session = await requireSession();
  if (!adaptionConfigured()) {
    return { ok: false, message: "The AI helper is not set up yet." };
  }
  if (!allowAi(session.memberId)) {
    return { ok: false, message: "Please wait a few minutes before asking again." };
  }
  const appointment = await getAppointment(session.circleId, appointmentId);
  if (!appointment) return { ok: false, message: "That appointment no longer exists." };

  const snapshot = await loadSnapshot(session.circleId);
  const facts = [
    "Visit:",
    describeAppointments([
      { ...appointment, when: formatDateTime(appointment.starts_at, snapshot.circle.timezone) },
    ]),
    "",
    "Medicines:",
    describeMedications(snapshot.medications),
    "",
    describeAdherence(snapshot.adherence),
  ].join("\n");

  try {
    const questions = await suggestVisitQuestions(snapshot.circle.elder_name, facts);
    if (questions.length === 0) throw new Error("No questions returned");
    const { error } = await db()
      .from("appointments")
      .update({ prep_questions: questions })
      .eq("id", appointment.id)
      .eq("circle_id", session.circleId);
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error("Visit preparation failed:", error);
    return { ok: false, message: "The AI helper could not prepare questions just now. Try again." };
  }

  await logActivity(session, `prepared questions for the visit with ${appointment.doctor}`);
  revalidatePath("/circle", "layout");
  return { ok: true, message: "Questions ready" };
}
