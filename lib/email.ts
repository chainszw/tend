import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { optionalEnv } from "@/lib/env";
import type { EmailContent } from "@/lib/email-templates";

let transporter: Transporter | undefined;

/** True when Gmail SMTP credentials are configured. */
export function emailConfigured(): boolean {
  return Boolean(optionalEnv("GMAIL_USER") && optionalEnv("GMAIL_APP_PASSWORD"));
}

function transport(): Transporter {
  transporter ??= nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: optionalEnv("GMAIL_USER"),
      pass: optionalEnv("GMAIL_APP_PASSWORD")?.replace(/\s+/g, ""),
    },
  });
  return transporter;
}

/**
 * Sends one email to several people. Recipients go in BCC so circle members
 * never see each other's addresses in the headers.
 */
export async function sendEmail(to: readonly string[], content: EmailContent): Promise<void> {
  if (to.length === 0) return;
  const from = optionalEnv("GMAIL_USER");
  await transport().sendMail({
    from: `Tend care reminders <${from}>`,
    to: from,
    bcc: [...to],
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}
