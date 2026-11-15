"use server";

import { DEFAULT_VOICE_LANGUAGE, isVoiceLanguage } from "@/lib/voice/language";
import { companionReply, extractMedications, transcribePrescriptionImage, writeDigest } from "@/lib/ai";
import { adaptionConfigured } from "@/lib/adaption";
import type { MedicationDraft } from "@/lib/ai-parse";
import {
  describeAdherence,
  describeReadings,
  describeAppointments,
  describeMedications,
  describeToday,
} from "@/lib/care-record";
import { formatDateTime } from "@/lib/format";
import { createRateLimiter } from "@/lib/rate-limit";
import { requireSession } from "@/lib/session";
import { loadSnapshot, readingFacts } from "@/lib/snapshot";
import { ROLE_LABELS } from "@/lib/types";
import { chatSchema, checkPrescriptionImage, prescriptionTextSchema } from "@/lib/validation";

const allowAi = createRateLimiter(20, 5 * 60_000);
const NOT_CONFIGURED = "The AI helper is not set up yet.";
const SLOW_DOWN = "That is a lot of questions at once. Please wait a few minutes.";

export interface ImportResult {
  ok: boolean;
  message?: string;
  drafts?: MedicationDraft[];
}

/** Reads pasted prescription text into medicine drafts for review. */
export async function importPrescriptionAction(text: string): Promise<ImportResult> {
  const session = await requireSession();
  if (!adaptionConfigured()) return { ok: false, message: NOT_CONFIGURED };
  if (!allowAi(session.memberId)) return { ok: false, message: SLOW_DOWN };
  const parsed = prescriptionTextSchema.safeParse({ text });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Paste the prescription text." };
  }
  try {
    const drafts = await extractMedications(parsed.data.text);
    if (drafts.length === 0) {
      return { ok: false, message: "No medicines were found in that text. Try pasting more of it, or add the medicine by hand." };
    }
    return { ok: true, drafts };
  } catch (error) {
    console.error("Prescription import failed:", error);
    return { ok: false, message: "The AI helper could not read that just now. Try again, or add the medicine by hand." };
  }
}

export interface ScanResult extends ImportResult {
  /** What was read from the photo, so it can be checked and corrected. */
  text?: string;
}

/** Reads a prescription photo and turns its text into medicine drafts, both with Adaption. */
export async function scanPrescriptionAction(formData: FormData): Promise<ScanResult> {
  const session = await requireSession();
  if (!adaptionConfigured()) return { ok: false, message: NOT_CONFIGURED };
  if (!allowAi(session.memberId)) return { ok: false, message: SLOW_DOWN };

  const photo = formData.get("photo");
  if (!(photo instanceof File)) return { ok: false, message: "Please take or choose a photo." };
  const problem = checkPrescriptionImage(photo);
  if (problem) return { ok: false, message: problem };

  let text: string;
  try {
    text = await transcribePrescriptionImage(new Uint8Array(await photo.arrayBuffer()), photo.type);
  } catch (error) {
    console.error("Prescription scan failed:", error);
    return { ok: false, message: "The photo could not be read just now. Try again, or type the prescription in." };
  }
  if (text.length < 10) {
    return {
      ok: false,
      message: "We could not read a prescription in that photo. Try again in good light, or type it in.",
    };
  }

  try {
    const drafts = await extractMedications(text);
    if (drafts.length === 0) {
      return {
        ok: false,
        text,
        message: "No medicines were found in that photo. Check the text below, or add the medicine by hand.",
      };
    }
    return { ok: true, text, drafts };
  } catch (error) {
    console.error("Prescription import failed:", error);
    return {
      ok: false,
      text,
      message: "The AI helper could not read that just now. Check the text below and try again.",
    };
  }
}

export interface CompanionResult {
  ok: boolean;
  reply?: string;
  message?: string;
}

/** Answers a Care Companion question using the family's own care record. */
export async function askCompanionAction(messages: unknown, language?: unknown): Promise<CompanionResult> {
  const session = await requireSession();
  if (!adaptionConfigured()) return { ok: false, message: NOT_CONFIGURED };
  if (!allowAi(session.memberId)) return { ok: false, message: SLOW_DOWN };
  const parsed = chatSchema.safeParse({ messages });
  if (!parsed.success) return { ok: false, message: "Type a question first." };

  const snapshot = await loadSnapshot(session.circleId);
  const { circle } = snapshot;
  const careRecord = [
    `Person cared for: ${circle.elder_name}`,
    "Medicines:",
    describeMedications(snapshot.medications),
    "Today's doses:",
    describeToday(snapshot.slots),
    describeAdherence(snapshot.adherence),
    "Health readings from the Tend device (simulated prototype):",
    describeReadings(readingFacts(snapshot)),
    "Upcoming appointments:",
    describeAppointments(
      snapshot.appointments.map((appointment) => ({
        ...appointment,
        when: formatDateTime(appointment.starts_at, circle.timezone),
      })),
    ),
  ].join("\n");

  try {
    const reply = await companionReply(
      {
        elderName: circle.elder_name,
        speakerName: session.name,
        speakerRole: session.role === "elder" ? "the person being cared for" : ROLE_LABELS[session.role],
        localTime: formatDateTime(snapshot.now.toISOString(), circle.timezone),
        careRecord,
        language: isVoiceLanguage(language) ? language : DEFAULT_VOICE_LANGUAGE,
      },
      parsed.data.messages,
    );
    return { ok: true, reply };
  } catch (error) {
    console.error("Companion failed:", error);
    return { ok: false, message: "The Companion could not answer just now. Try again in a moment." };
  }
}

export interface DigestResult {
  ok: boolean;
  text?: string;
  message?: string;
}

/** Writes a short weekly update for the family from computed adherence facts. */
export async function writeDigestAction(): Promise<DigestResult> {
  const session = await requireSession();
  if (!adaptionConfigured()) return { ok: false, message: NOT_CONFIGURED };
  if (!allowAi(session.memberId)) return { ok: false, message: SLOW_DOWN };
  const snapshot = await loadSnapshot(session.circleId);
  const facts = [
    describeAdherence(snapshot.adherence),
    "Health readings from the Tend device (simulated prototype):",
    describeReadings(readingFacts(snapshot)),
    "Medicines:",
    describeMedications(snapshot.medications),
    "Upcoming appointments:",
    describeAppointments(
      snapshot.appointments.map((appointment) => ({
        ...appointment,
        when: formatDateTime(appointment.starts_at, snapshot.circle.timezone),
      })),
    ),
  ].join("\n");
  try {
    return { ok: true, text: await writeDigest(snapshot.circle.elder_name, facts) };
  } catch (error) {
    console.error("Digest failed:", error);
    return { ok: false, message: "The weekly update could not be written just now. Try again." };
  }
}
