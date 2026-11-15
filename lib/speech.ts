import type { DoseSlot } from "@/lib/adherence";
import { formatTime } from "@/lib/schedule";

type NamedSlot = DoseSlot<DoseSlot["med"] & { name: string; dosage: string }>;

function list(slots: readonly NamedSlot[]): string {
  return slots
    .map((slot) => `${slot.med.name}${slot.med.dosage ? `, ${slot.med.dosage}` : ""}, at ${formatTime(slot.time)}`)
    .join(". ");
}

/** A short spoken summary of the day, for the read-aloud button. */
export function spokenDaySummary(dateLabel: string, slots: readonly NamedSlot[]): string {
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
