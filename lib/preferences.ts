import type { Role } from "@/lib/types";
import { DEFAULT_VOICE_LANGUAGE, isVoiceLanguage, type VoiceLanguage } from "@/lib/voice/language";

export const TEXT_SIZE_COOKIE = "tend_text";

/** Text size as a percentage of the browser's 16px default. */
export const TEXT_SIZE_MIN = 90;
export const TEXT_SIZE_MAX = 160;
export const TEXT_SIZE_STEP = 5;
export const TEXT_SIZE_DEFAULT = 110;
export const TEXT_SIZE_ELDER_DEFAULT = 130;

/** Rounds to the slider step and keeps the value inside the allowed range. */
export function clampTextSize(value: number): number {
  const stepped = Math.round(value / TEXT_SIZE_STEP) * TEXT_SIZE_STEP;
  return Math.min(TEXT_SIZE_MAX, Math.max(TEXT_SIZE_MIN, stepped));
}

/**
 * Chosen text size in percent. Understands the older "large"/"normal" cookie values,
 * and defaults to larger text for the person being cared for.
 */
export function resolveTextSize(cookieValue: string | undefined, role: Role): number {
  if (cookieValue === "large") return TEXT_SIZE_ELDER_DEFAULT;
  if (cookieValue === "normal") return TEXT_SIZE_DEFAULT;
  const parsed = Number(cookieValue);
  if (cookieValue && Number.isFinite(parsed)) return clampTextSize(parsed);
  return role === "elder" ? TEXT_SIZE_ELDER_DEFAULT : TEXT_SIZE_DEFAULT;
}

export const LANGUAGE_COOKIE = "tend_lang";

/** The page language from its cookie; anything unknown falls back to English. */
export function resolveLanguage(cookieValue: string | undefined): VoiceLanguage {
  return isVoiceLanguage(cookieValue) ? cookieValue : DEFAULT_VOICE_LANGUAGE;
}
