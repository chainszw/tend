import { escapeHtml } from "@/lib/html";
import { formatTime } from "@/lib/schedule";
import type { AppointmentReminder, DoseReminder } from "@/lib/reminders";

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

interface Layout {
  heading: string;
  intro: string;
  lines: string[];
  footer: string;
  appUrl: string;
}

function layout({ heading, intro, lines, footer, appUrl }: Layout): Pick<EmailContent, "text" | "html"> {
  const text = [heading, "", intro, "", ...lines.map((line) => `• ${line}`), "", footer, appUrl].join("\n");
  const items = lines
    .map((line) => `<li style="margin:0 0 10px;font-size:18px;line-height:1.5">${escapeHtml(line)}</li>`)
    .join("");
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#eef3ee;font-family:Verdana,Arial,sans-serif;color:#12261e">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
<div style="background:#ffffff;border-radius:16px;padding:28px;border:1px solid #cfdcd3">
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.3">${escapeHtml(heading)}</h1>
<p style="margin:0 0 18px;font-size:18px;line-height:1.5">${escapeHtml(intro)}</p>
<ul style="margin:0 0 22px;padding-left:22px">${items}</ul>
<a href="${escapeHtml(appUrl)}" style="display:inline-block;background:#17513c;color:#ffffff;text-decoration:none;font-size:18px;font-weight:bold;padding:14px 22px;border-radius:12px">Open Tend</a>
<p style="margin:22px 0 0;font-size:15px;line-height:1.5;color:#44584e">${escapeHtml(footer)}</p>
</div></div></body></html>`;
  return { text, html };
}

function doseLine(dose: DoseReminder): string {
  const details = [dose.dosage, dose.instructions].filter(Boolean).join(", ");
  return `${formatTime(dose.time)}: ${dose.medName}${details ? ` (${details})` : ""}`;
}

/** Email sent shortly before doses are due. */
export function upcomingDosesEmail(
  elderName: string,
  doses: readonly DoseReminder[],
  appUrl: string,
): EmailContent {
  const subject =
    doses.length === 1
      ? `Time for ${doses[0].medName} at ${formatTime(doses[0].time)}`
      : `${doses.length} medicines are due soon for ${elderName}`;
  return {
    subject,
    ...layout({
      heading: "Medicine time is coming up",
      intro: `These are due soon for ${elderName}:`,
      lines: doses.map(doseLine),
      footer: "Mark each dose as taken in Tend so the family knows.",
      appUrl,
    }),
  };
}

/** Email sent to the whole circle when doses were not logged in time. */
export function missedDosesEmail(
  elderName: string,
  doses: readonly DoseReminder[],
  appUrl: string,
): EmailContent {
  const subject =
    doses.length === 1
      ? `${elderName} may have missed ${doses[0].medName}`
      : `${elderName} may have missed ${doses.length} doses`;
  return {
    subject,
    ...layout({
      heading: "A dose has not been marked as taken",
      intro: `Nobody has logged these for ${elderName} yet. A quick call may help.`,
      lines: doses.map(doseLine),
      footer:
        "If the dose was taken, mark it in Tend. Do not double a dose without asking a doctor or pharmacist.",
      appUrl,
    }),
  };
}

/** Email sent the day before and shortly before a doctor appointment. */
export function appointmentEmail(
  elderName: string,
  reminder: AppointmentReminder,
  whenText: string,
  appUrl: string,
): EmailContent {
  const { appointment, soon } = reminder;
  const who = appointment.specialty
    ? `${appointment.doctor} (${appointment.specialty})`
    : appointment.doctor;
  const lines = [`When: ${whenText}`, `With: ${who}`];
  if (appointment.location) lines.push(`Where: ${appointment.location}`);
  return {
    subject: soon
      ? `Appointment with ${appointment.doctor} starts soon`
      : `Appointment with ${appointment.doctor} tomorrow`,
    ...layout({
      heading: soon ? "Appointment starting soon" : "Appointment coming up",
      intro: `${elderName} has a doctor appointment.`,
      lines,
      footer: "Open Tend to see the questions prepared for this visit.",
      appUrl,
    }),
  };
}
