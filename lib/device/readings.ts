import { z } from "zod";

/**
 * Readings taken with the Tend Home Station. In this prototype the values are
 * simulated; the shapes, limits and wording are what a real device would use.
 */

export const READING_KINDS = ["bp", "spo2", "temp", "weight"] as const;
export type ReadingKind = (typeof READING_KINDS)[number];

export const readingSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("bp"),
    systolic: z.number().int().min(60).max(260),
    diastolic: z.number().int().min(30).max(160),
    pulse: z.number().int().min(30).max(220),
    irregular: z.boolean(),
  }),
  z.object({
    kind: z.literal("spo2"),
    spo2: z.number().int().min(50).max(100),
    pulse: z.number().int().min(30).max(220),
  }),
  z.object({ kind: z.literal("temp"), temperature_c: z.number().min(30).max(45) }),
  z.object({ kind: z.literal("weight"), weight_kg: z.number().min(20).max(250) }),
]);

export type ReadingInput = z.infer<typeof readingSchema>;
export type StoredReading = ReadingInput & { id: string; taken_at: string };

export const KIND_LABELS: Record<ReadingKind, string> = {
  bp: "Blood pressure",
  spo2: "Blood oxygen",
  temp: "Temperature",
  weight: "Weight",
};

/** Which connected accessory takes each reading. */
export const KIND_ACCESSORY: Record<ReadingKind, string> = {
  bp: "arm cuff",
  spo2: "finger clip",
  temp: "thermometer",
  weight: "weighing scale",
};

export const PREPARE_STEPS: Record<ReadingKind, string[]> = {
  bp: ["Sit down and rest your arm on a table.", "Wrap the cuff around your upper arm.", "Stay still and do not talk."],
  spo2: ["Warm your hand if it is cold.", "Put the clip on your first finger.", "Keep your hand still."],
  temp: ["Take the thermometer from its holder.", "Place the tip under your tongue.", "Close your mouth and wait."],
  weight: ["Put the scale on a hard, flat floor.", "Step on with bare feet.", "Stand still and look ahead."],
};

/** How long the simulated measurement runs. */
export const MEASURE_MS: Record<ReadingKind, number> = {
  bp: 9000,
  spo2: 7000,
  temp: 5000,
  weight: 4500,
};

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Produces a believable reading. `random` is injectable so tests are exact. */
export function simulateReading(
  kind: ReadingKind,
  random: () => number = Math.random,
  previousWeight?: number,
): ReadingInput {
  switch (kind) {
    case "bp": {
      const systolic = Math.round(110 + random() * 36);
      const diastolic = Math.round(systolic * 0.62 + (random() - 0.5) * 8);
      return {
        kind,
        systolic,
        diastolic,
        pulse: Math.round(62 + random() * 26),
        irregular: random() < 0.08,
      };
    }
    case "spo2":
      return { kind, spo2: Math.round(95 + random() * 4), pulse: Math.round(62 + random() * 26) };
    case "temp":
      return { kind, temperature_c: round1(36.2 + random() * 1.3) };
    case "weight":
      return { kind, weight_kg: round1((previousWeight ?? 61.5) + (random() - 0.5) * 0.8) };
  }
}

export type ReadingLevel = "ok" | "watch" | "alert";

export interface ReadingAssessment {
  level: ReadingLevel;
  message: string;
}

const OK: ReadingAssessment = { level: "ok", message: "In the usual range." };

/** Plain-word guidance for a reading. General guidance only, never a diagnosis. */
export function assessReading(reading: ReadingInput): ReadingAssessment {
  switch (reading.kind) {
    case "bp":
      if (reading.systolic >= 180 || reading.diastolic >= 120) {
        return { level: "alert", message: "Very high. Rest, measure again, and call your doctor." };
      }
      if (reading.systolic >= 140 || reading.diastolic >= 90) {
        return { level: "watch", message: "Higher than usual. Tell your family or doctor." };
      }
      if (reading.systolic < 90 || reading.diastolic < 60) {
        return { level: "watch", message: "Lower than usual. Tell your family or doctor." };
      }
      if (reading.irregular) {
        return { level: "watch", message: "Uneven heartbeat noticed. Mention it to your doctor." };
      }
      return OK;
    case "spo2":
      if (reading.spo2 < 90) return { level: "alert", message: "Very low. Call your doctor now." };
      if (reading.spo2 < 94) return { level: "watch", message: "Lower than usual. Rest and measure again." };
      return OK;
    case "temp":
      if (reading.temperature_c >= 39.5) return { level: "alert", message: "High fever. Call your doctor." };
      if (reading.temperature_c >= 38) return { level: "watch", message: "Fever. Rest, drink water, tell your family." };
      if (reading.temperature_c < 35.5) return { level: "watch", message: "Lower than usual. Measure again." };
      return OK;
    case "weight":
      return { level: "ok", message: "Weight recorded." };
  }
}

export interface ReadingDisplay {
  value: string;
  unit: string;
  detail: string;
}

/** The big number, its unit and a secondary line, for screens and lists. */
export function displayReading(reading: ReadingInput): ReadingDisplay {
  switch (reading.kind) {
    case "bp":
      return {
        value: `${reading.systolic}/${reading.diastolic}`,
        unit: "mmHg",
        detail: `Pulse ${reading.pulse} beats a minute${reading.irregular ? ", uneven heartbeat" : ""}`,
      };
    case "spo2":
      return { value: `${reading.spo2}`, unit: "%", detail: `Pulse ${reading.pulse} beats a minute` };
    case "temp":
      return { value: reading.temperature_c.toFixed(1), unit: "°C", detail: "" };
    case "weight":
      return { value: reading.weight_kg.toFixed(1), unit: "kg", detail: "" };
  }
}

/** One line such as "Blood pressure 128/82 mmHg, pulse 72 beats a minute". */
export function describeReading(reading: ReadingInput): string {
  const { value, unit, detail } = displayReading(reading);
  const spacer = unit === "%" ? "" : " ";
  return `${KIND_LABELS[reading.kind]} ${value}${spacer}${unit}${detail ? `, ${detail.toLowerCase()}` : ""}`;
}

/** A sentence for the voice assistant to say when a result appears. */
export function spokenReading(reading: ReadingInput): string {
  const said =
    reading.kind === "bp"
      ? `Your blood pressure is ${reading.systolic} over ${reading.diastolic}. Pulse ${reading.pulse}.`
      : reading.kind === "spo2"
        ? `Your blood oxygen is ${reading.spo2} percent. Pulse ${reading.pulse}.`
        : reading.kind === "temp"
          ? `Your temperature is ${reading.temperature_c.toFixed(1)} degrees Celsius.`
          : `Your weight is ${reading.weight_kg.toFixed(1)} kilograms.`;
  return `${said} ${assessReading(reading).message}`;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Cuff pressure in mmHg while measuring: pumps up past systolic, then lets down slowly. */
export function cuffPressure(progress: number, systolic: number, diastolic: number): number {
  const p = clamp01(progress);
  const peak = systolic + 30;
  if (p < 0.4) return Math.round((p / 0.4) * peak);
  return Math.round(peak - ((p - 0.4) / 0.6) * (peak - (diastolic - 12)));
}

/** The number shown on the screen while a measurement is still running. */
export function liveValue(reading: ReadingInput, progress: number): string {
  const p = clamp01(progress);
  // Starts off-target and settles on the final value, like a real sensor.
  const settle = (target: number, startOffset: number) =>
    target + startOffset * (1 - p) * Math.cos(p * 9);
  switch (reading.kind) {
    case "bp":
      return `${cuffPressure(p, reading.systolic, reading.diastolic)}`;
    case "spo2":
      return p < 0.2 ? "--" : `${Math.min(100, Math.round(settle(reading.spo2, -4)))}`;
    case "temp":
      return settle(reading.temperature_c, -3.5).toFixed(1);
    case "weight":
      return Math.max(0, settle(reading.weight_kg, -18)).toFixed(1);
  }
}

/** A row from the `readings` table (every measurement column is nullable). */
export interface ReadingRow {
  id: string;
  kind: string;
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  spo2: number | null;
  temperature_c: number | null;
  weight_kg: number | null;
  irregular: boolean | null;
  taken_at: string;
}

/** Turns a database row into a validated reading, or null if it is malformed. */
export function readingFromRow(row: ReadingRow): StoredReading | null {
  const parsed = readingSchema.safeParse({
    kind: row.kind,
    systolic: row.systolic ?? undefined,
    diastolic: row.diastolic ?? undefined,
    pulse: row.pulse ?? undefined,
    spo2: row.spo2 ?? undefined,
    temperature_c: row.temperature_c === null ? undefined : Number(row.temperature_c),
    weight_kg: row.weight_kg === null ? undefined : Number(row.weight_kg),
    irregular: row.irregular ?? false,
  });
  return parsed.success ? { ...parsed.data, id: row.id, taken_at: row.taken_at } : null;
}

/** The newest reading of each kind, from a newest-first list. */
export function latestByKind(
  readings: readonly StoredReading[],
): Partial<Record<ReadingKind, StoredReading>> {
  const latest: Partial<Record<ReadingKind, StoredReading>> = {};
  for (const reading of readings) latest[reading.kind] ??= reading;
  return latest;
}
