import type { DoseSlot } from "@/lib/adherence";
import { formatTime, formatTimeIn } from "@/lib/schedule";
import type { VoiceLanguage } from "@/lib/voice/language";

type NamedSlot = DoseSlot<DoseSlot["med"] & { name: string; dosage: string }>;

function list(slots: readonly NamedSlot[], lang: VoiceLanguage = "en"): string {
  return slots
    .map((slot) => {
      const name = `${slot.med.name}${slot.med.dosage ? `, ${slot.med.dosage}` : ""}`;
      return lang === "hi" ? `${name}, ${formatTimeIn(slot.time, "hi")}` : `${name}, at ${formatTime(slot.time)}`;
    })
    .join(". ");
}

/** The same summary in Hindi. Medicine names stay as written. */
function hindiDaySummary(dateLabel: string, slots: readonly NamedSlot[]): string {
  if (slots.length === 0) return `आज ${dateLabel} है। आज कोई दवा तय नहीं है।`;
  const by = (status: DoseSlot["status"]) => slots.filter((slot) => slot.status === status);
  const sentences = [`आज ${dateLabel} है।`];
  const due = by("due");
  const missed = by("missed");
  const later = by("later");
  const taken = by("taken");
  if (due.length > 0) sentences.push(`अभी लेनी है: ${list(due, "hi")}।`);
  if (missed.length > 0) sentences.push(`अभी तक ली हुई नहीं लिखी गई: ${list(missed, "hi")}।`);
  if (later.length > 0) sentences.push(`आज बाद में: ${list(later, "hi")}।`);
  if (taken.length > 0) sentences.push(`${taken.length} खुराक ली जा चुकी है।`);
  if (due.length === 0 && missed.length === 0 && later.length === 0) {
    sentences.push("आज का सब काम हो गया।");
  }
  return sentences.join(" ");
}

/** A short spoken summary of the day, for the read-aloud button. */
export function spokenDaySummary(
  dateLabel: string,
  slots: readonly NamedSlot[],
  lang: VoiceLanguage = "en",
): string {
  if (lang === "hi") return hindiDaySummary(dateLabel, slots);
  if (slots.length === 0) return `Today is ${dateLabel}. There are no medicines scheduled today.`;
  const by = (status: DoseSlot["status"]) => slots.filter((slot) => slot.status === status);
  const sentences = [`Today is ${dateLabel}.`];
  const due = by("due");
  const missed = by("missed");
  const later = by("later");
  const taken = by("taken");
  if (due.length > 0) sentences.push(`Due now: ${list(due)}.`);
  if (missed.length > 0) sentences.push(`Not yet marked as taken: ${list(missed)}.`);
  if (later.length > 0) sentences.push(`Later today: ${list(later)}.`);
  if (taken.length > 0) {
    sentences.push(`Already taken: ${taken.length} dose${taken.length === 1 ? "" : "s"}.`);
  }
  if (due.length === 0 && missed.length === 0 && later.length === 0) {
    sentences.push("Everything for today is done.");
  }
  return sentences.join(" ");
}
