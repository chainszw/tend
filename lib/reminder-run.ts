import "server-only";
import { db } from "@/lib/db";
import { emailConfigured, sendEmail } from "@/lib/email";
import {
  appointmentEmail,
  missedDosesEmail,
  upcomingDosesEmail,
  type EmailContent,
} from "@/lib/email-templates";
import { optionalEnv } from "@/lib/env";
import type { LoggedDose } from "@/lib/adherence";
import {
  APPOINTMENT_DAY_HOURS,
  MISSED_LOOKBACK_HOURS,
  recipientsFor,
  selectReminders,
  type DoseReminder,
  type Recipient,
  type Reminder,
  type ReminderAppointment,
  type ReminderMed,
} from "@/lib/reminders";

const HOUR = 3_600_000;

interface CircleRow {
  id: string;
  elder_name: string;
  elder_email: string | null;
  timezone: string;
}

export interface ReminderRunResult {
  circlesChecked: number;
  emailsSent: number;
  remindersSent: number;
  emailConfigured: boolean;
}

interface Outgoing {
  refKeys: string[];
  to: string[];
  content: EmailContent;
}

function groupBy<T extends { circle_id: string }>(rows: readonly T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const group = groups.get(row.circle_id);
    if (group) group.push(row);
    else groups.set(row.circle_id, [row]);
  }
  return groups;
}

function formatWhen(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function buildEmails(
  circle: CircleRow,
  reminders: readonly Reminder[],
  members: readonly Recipient[],
  appUrl: string,
): Outgoing[] {
  const outgoing: Outgoing[] = [];
  const doses = (kind: DoseReminder["kind"]) =>
    reminders.filter((r): r is DoseReminder => r.kind === kind);

  const upcoming = doses("upcoming");
  if (upcoming.length > 0) {
    outgoing.push({
      refKeys: upcoming.map((r) => r.refKey),
      to: recipientsFor("upcoming", circle.elder_email, members),
      content: upcomingDosesEmail(circle.elder_name, upcoming, appUrl),
    });
  }

  const missed = doses("missed");
  if (missed.length > 0) {
    outgoing.push({
      refKeys: missed.map((r) => r.refKey),
      to: recipientsFor("missed", circle.elder_email, members),
      content: missedDosesEmail(circle.elder_name, missed, appUrl),
    });
  }

  for (const reminder of reminders) {
    if (reminder.kind !== "appointment") continue;
    outgoing.push({
      refKeys: [reminder.refKey],
      to: recipientsFor("appointment", circle.elder_email, members),
      content: appointmentEmail(
        circle.elder_name,
        reminder,
        formatWhen(reminder.appointment.starts_at, circle.timezone),
        appUrl,
      ),
    });
  }
  return outgoing.filter((email) => email.to.length > 0);
}

/**
 * Finds reminders that are due and emails them. Safe to call repeatedly:
 * each reminder is claimed in `notifications_sent` (unique key) before
 * sending, so overlapping runs never send the same reminder twice.
 *
 * Uses a fixed number of queries regardless of how many circles exist.
 */
export async function runReminders(onlyCircleId?: string): Promise<ReminderRunResult> {
  const now = new Date();
  const supabase = db();

  let circleQuery = supabase.from("circles").select("id, elder_name, elder_email, timezone");
  if (onlyCircleId) circleQuery = circleQuery.eq("id", onlyCircleId);
  const { data: circles, error } = await circleQuery;
  if (error) throw new Error(`Database error: ${error.message}`);

  const result: ReminderRunResult = {
    circlesChecked: circles.length,
    emailsSent: 0,
    remindersSent: 0,
    emailConfigured: emailConfigured(),
  };
  if (circles.length === 0 || !result.emailConfigured) return result;

  const circleIds = circles.map((circle) => circle.id);
  const logsSince = new Date(now.getTime() - (MISSED_LOOKBACK_HOURS + 1) * HOUR);
  const appointmentsUntil = new Date(now.getTime() + APPOINTMENT_DAY_HOURS * HOUR);

  const [meds, logs, appointments, members] = await Promise.all([
    supabase
      .from("medications")
      .select("id, circle_id, name, dosage, instructions, times, days, start_date, end_date, active, created_at")
      .in("circle_id", circleIds)
      .eq("active", true),
    supabase
      .from("dose_logs")
      .select("circle_id, medication_id, scheduled_for, status")
      .in("circle_id", circleIds)
      .gte("scheduled_for", logsSince.toISOString()),
    supabase
      .from("appointments")
      .select("id, circle_id, doctor, specialty, location, starts_at")
      .in("circle_id", circleIds)
      .gt("starts_at", now.toISOString())
      .lte("starts_at", appointmentsUntil.toISOString()),
    supabase
      .from("members")
      .select("circle_id, email, role, notify")
      .in("circle_id", circleIds),
  ]);
  for (const query of [meds, logs, appointments, members]) {
    if (query.error) throw new Error(`Database error: ${query.error.message}`);
  }

  type Scoped<T> = T & { circle_id: string };
  const medsByCircle = groupBy((meds.data ?? []) as Scoped<ReminderMed>[]);
  const logsByCircle = groupBy((logs.data ?? []) as Scoped<LoggedDose>[]);
  const appointmentsByCircle = groupBy((appointments.data ?? []) as Scoped<ReminderAppointment>[]);
  const membersByCircle = groupBy((members.data ?? []) as Scoped<Recipient>[]);
  // On Vercel the production domain is known without any configuration.
  const vercelHost = optionalEnv("VERCEL_PROJECT_PRODUCTION_URL");
  const appUrl =
    optionalEnv("APP_URL") ?? (vercelHost ? `https://${vercelHost}` : "http://localhost:3000");

  for (const circle of circles as CircleRow[]) {
    const due = selectReminders({
      meds: medsByCircle.get(circle.id) ?? [],
      logs: logsByCircle.get(circle.id) ?? [],
      appointments: appointmentsByCircle.get(circle.id) ?? [],
      timeZone: circle.timezone,
      now,
    });
    if (due.length === 0) continue;

    // Claim reminders first; only rows that were newly inserted are ours to send.
    const { data: claimed, error: claimError } = await supabase
      .from("notifications_sent")
      .upsert(
        due.map((reminder) => ({
          circle_id: circle.id,
          ref_key: reminder.refKey,
          kind: reminder.kind,
        })),
        { onConflict: "ref_key", ignoreDuplicates: true },
      )
      .select("ref_key");
    if (claimError) throw new Error(`Database error: ${claimError.message}`);

    const claimedKeys = new Set((claimed ?? []).map((row) => row.ref_key as string));
    const fresh = due.filter((reminder) => claimedKeys.has(reminder.refKey));
    const emails = buildEmails(circle, fresh, membersByCircle.get(circle.id) ?? [], appUrl);

    for (const email of emails) {
      try {
        await sendEmail(email.to, email.content);
        result.emailsSent += 1;
        result.remindersSent += email.refKeys.length;
      } catch (sendError) {
        console.error("Reminder email failed; will retry next run.", sendError);
        await supabase.from("notifications_sent").delete().in("ref_key", email.refKeys);
      }
    }
  }

  return result;
}
