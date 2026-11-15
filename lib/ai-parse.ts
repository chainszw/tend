import { z } from "zod";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Removes reasoning blocks and markdown code fences some models emit. */
export function cleanModelText(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json)?/gi, "")
    .trim();
}

/** Reply the model is told to give when a photo holds no readable prescription. */
export const NO_TEXT = "NO_TEXT";

/** Longest transcription we pass on (matches `prescriptionTextSchema`). */
export const MAX_TRANSCRIPTION_CHARS = 4000;

/** Cleans a photo transcription. Returns "" when nothing readable was found. */
export function cleanTranscription(modelText: string): string {
  const text = cleanModelText(modelText);
  if (!text || text === NO_TEXT) return "";
  return text.slice(0, MAX_TRANSCRIPTION_CHARS).trim();
}

/**
 * Pulls the first JSON object or array out of model output. Models have no
 * strict JSON mode here, so we tolerate prose around the JSON.
 */
export function extractJson(text: string): unknown {
  const cleaned = cleanModelText(text);
  const start = cleaned.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in model output");
  const open = cleaned[start];
  const close = open === "{" ? "}" : "]";
  const end = cleaned.lastIndexOf(close);
  if (end <= start) throw new Error("Incomplete JSON in model output");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normaliseTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2})[:.](\d{2})$/.exec(value.trim());
  if (!match) return null;
  const time = `${match[1].padStart(2, "0")}:${match[2]}`;
  return TIME_PATTERN.test(time) ? time : null;
}

const text = (max: number) =>
  z
    .string()
    .nullish()
    .transform((value) => (value ?? "").trim().slice(0, max));

const medicationDraftSchema = z.object({
  name: z.string().trim().min(1).max(120),
  dosage: text(80),
  instructions: text(300),
  purpose: text(200),
  times: z
    .array(z.unknown())
    .transform((values) =>
      [...new Set(values.map(normaliseTime).filter((v): v is string => v !== null))].sort(),
    ),
});

export type MedicationDraft = z.infer<typeof medicationDraftSchema>;

/** Parses model output into medication drafts, dropping unusable entries. */
export function parseMedicationDrafts(modelText: string): MedicationDraft[] {
  const json = extractJson(modelText);
  const list = Array.isArray(json)
    ? json
    : (json as { medications?: unknown }).medications;
  if (!Array.isArray(list)) throw new Error("Model output has no medication list");
  const drafts: MedicationDraft[] = [];
  for (const item of list.slice(0, 12)) {
    const parsed = medicationDraftSchema.safeParse(item);
    if (!parsed.success) continue;
    const draft = parsed.data;
    drafts.push(draft.times.length > 0 ? draft : { ...draft, times: ["08:00"] });
  }
  return drafts;
}

/** Parses model output into a short list of plain-text questions. */
export function parseQuestions(modelText: string): string[] {
  const json = extractJson(modelText);
  const list = Array.isArray(json) ? json : (json as { questions?: unknown }).questions;
  if (!Array.isArray(list)) throw new Error("Model output has no question list");
  return list
    .filter((item): item is string => typeof item === "string")
    .map((question) => question.trim().slice(0, 240))
    .filter((question) => question.length > 0)
    .slice(0, 6);
}
