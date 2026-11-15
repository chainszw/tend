"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { logActivity } from "@/lib/data";
import { db } from "@/lib/db";
import { hashPasscode } from "@/lib/passcode";
import { openPasscode, sealPasscode } from "@/lib/passcode-vault";
import { createRateLimiter } from "@/lib/rate-limit";
import { requireSession } from "@/lib/session";
import { LANGUAGE_COOKIE, TEXT_SIZE_COOKIE, clampTextSize } from "@/lib/preferences";
import { isVoiceLanguage } from "@/lib/voice/language";
import type { ActionState } from "@/lib/types";
import { changePasscodeSchema, fieldErrors } from "@/lib/validation";

const allowReveal = createRateLimiter(20, 60_000);
const allowChange = createRateLimiter(5, 60_000);

export type RevealResult =
  | { ok: true; passcode: string }
  | { ok: false; needsReset?: boolean; message: string };

/** Shows the family passcode to a signed-in member so they can invite someone. */
export async function revealPasscodeAction(): Promise<RevealResult> {
  const session = await requireSession();
  if (!allowReveal(session.memberId)) {
    return { ok: false, message: "Too many tries. Wait a minute and try again." };
  }
  const { data, error } = await db()
    .from("circles")
    .select("passcode_enc")
    .eq("id", session.circleId)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("Reveal passcode failed:", error.message);
    return { ok: false, message: "We could not load the passcode. Try again." };
  }
  const passcode = data.passcode_enc ? openPasscode(data.passcode_enc) : null;
  if (!passcode) {
    return {
      ok: false,
      needsReset: true,
      message: "This family was set up before passcodes could be shown. Choose a new one below.",
    };
  }
  return { ok: true, passcode };
}

/** Sets a new family passcode. Everyone already signed in stays signed in. */
export async function changePasscodeAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  if (!allowChange(session.memberId)) {
    return { ok: false, message: "Too many changes. Wait a minute and try again." };
  }
  const parsed = changePasscodeSchema.safeParse({ passcode: String(formData.get("passcode") ?? "") });
  if (!parsed.success) {
    return { ok: false, message: "Check the passcode.", fieldErrors: fieldErrors(parsed.error) };
  }
  const { passcode } = parsed.data;
  const { error } = await db()
    .from("circles")
    .update({
      passcode_hash: await hashPasscode(passcode),
      passcode_enc: sealPasscode(passcode),
      failed_attempts: 0,
      locked_until: null,
    })
    .eq("id", session.circleId);
  if (error) {
    console.error("Change passcode failed:", error.message);
    return { ok: false, message: "We could not change the passcode. Try again." };
  }
  await logActivity(session, "changed the family passcode");
  revalidatePath("/circle/family");
  return { ok: true, message: "Passcode changed. Share the new one with your family." };
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

/** Remembers the reader's text-size choice (percent) for a year. */
export async function setTextSizeAction(size: number): Promise<void> {
  await requireSession();
  (await cookies()).set(TEXT_SIZE_COOKIE, String(clampTextSize(Number(size) || 0)), {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * Remembers the page language for a year. A harmless display preference, so it needs no
 * session: the public Home Station page uses the same switch.
 */
export async function setLanguageAction(language: string): Promise<void> {
  if (!isVoiceLanguage(language)) return;
  (await cookies()).set(LANGUAGE_COOKIE, language, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
