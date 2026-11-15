import { z } from "zod";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const name = z.string().trim().min(1, "Enter a name").max(80, "Keep it under 80 characters");
const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .transform((value) => (value === "" ? null : value.toLowerCase()))
  .refine((value) => value === null || z.email().safeParse(value).success, {
    message: "Enter a valid email address",
  });
const passcode = z.string().regex(/^\d{6}$/, "Use exactly 6 digits");
const role = z.enum(["elder", "family", "caretaker"]);

/** True when the runtime recognises the IANA time zone name. */
export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export const createCircleSchema = z.object({
  elderName: name,
  elderEmail: optionalEmail,
  yourName: name,
  yourEmail: optionalEmail,
  role,
  passcode,
  timezone: z.string().refine(isValidTimeZone, "Unknown time zone"),
});

export const joinCircleSchema = z.object({
  code: z.string().trim().min(4, "Enter the circle code").max(20),
  passcode,
  yourName: name,
  yourEmail: optionalEmail,
  role,
});

export const medicationSchema = z.object({
  name: z.string().trim().min(1, "Enter the medicine name").max(120),
  dosage: z.string().trim().max(80).default(""),
  instructions: z.string().trim().max(300).default(""),
  purpose: z.string().trim().max(200).default(""),
  times: z
    .array(z.string().regex(TIME_PATTERN, "Use 24-hour HH:MM times"))
    .min(1, "Add at least one time")
    .max(8, "Up to 8 times a day")
    .transform((times) => [...new Set(times)].sort()),
  days: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Pick at least one day")
    .transform((days) => [...new Set(days)].sort()),
  startDate: z.string().regex(DATE_PATTERN, "Pick a start date"),
  endDate: z
    .string()
    .transform((value) => (value === "" ? null : value))
    .refine((value) => value === null || DATE_PATTERN.test(value), "Pick a valid end date"),
});
export type MedicationInput = z.infer<typeof medicationSchema>;

export const appointmentSchema = z.object({
  doctor: z.string().trim().min(1, "Enter the doctor or clinic").max(120),
  specialty: z.string().trim().max(80).default(""),
  location: z.string().trim().max(200).default(""),
  date: z.string().regex(DATE_PATTERN, "Pick a date"),
  time: z.string().regex(TIME_PATTERN, "Pick a time"),
  notes: z.string().trim().max(600).default(""),
});

export const doseLogSchema = z.object({
  medicationId: z.uuid(),
  scheduledFor: z.iso.datetime({ offset: true }),
  status: z.enum(["taken", "skipped", "clear"]),
});

export const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20),
});

export const prescriptionTextSchema = z.object({
  text: z.string().trim().min(10, "Paste the prescription or label text").max(4000),
});

/** Flattens a zod error into one message per field for form display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}
