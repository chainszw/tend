"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createRateLimiter } from "@/lib/rate-limit";
import { runReminders } from "@/lib/reminder-run";
import { requireSession } from "@/lib/session";
import { TEXT_SIZE_COOKIE } from "@/lib/preferences";
import type { ActionState } from "@/lib/types";

const allowRun = createRateLimiter(6, 60_000);

/** Runs the reminder check for this circle right away (same logic as the schedule). */
export async function runRemindersNowAction(): Promise<ActionState> {
  const session = await requireSession();
  if (!allowRun(session.circleId)) {
    return { ok: false, message: "Reminders were just checked. Try again in a minute." };
  }
  try {
    const result = await runReminders(session.circleId);
    if (!result.emailConfigured) {
      return { ok: false, message: "Email is not set up yet, so no reminders can be sent." };
    }
    if (result.remindersSent === 0) {
      return { ok: true, message: "Nothing is due right now. No emails were needed." };
    }
    return {
      ok: true,
      message: `Sent ${result.emailsSent} email${result.emailsSent === 1 ? "" : "s"} covering ${result.remindersSent} reminder${result.remindersSent === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    console.error("Manual reminder run failed:", error);
    return { ok: false, message: "The reminder check failed. Try again." };
  }
}

/** Turns the signed-in member's own email reminders on or off. */
export async function setNotifyAction(notify: boolean): Promise<ActionState> {
  const session = await requireSession();
  const { error } = await db()
    .from("members")
    .update({ notify })
    .eq("id", session.memberId)
    .eq("circle_id", session.circleId);
  if (error) return { ok: false, message: "We could not change that setting. Try again." };
  revalidatePath("/circle/family");
  return { ok: true, message: notify ? "Email reminders turned on" : "Email reminders turned off" };
}

/** Remembers the reader's text-size choice for a year. */
export async function setTextSizeAction(size: "normal" | "large"): Promise<void> {
  await requireSession();
  (await cookies()).set(TEXT_SIZE_COOKIE, size === "large" ? "large" : "normal", {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  revalidatePath("/circle", "layout");
}
