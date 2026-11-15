import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, resolveLanguage } from "@/lib/preferences";
import type { VoiceLanguage } from "@/lib/voice/language";

/** The reader's page language, from their cookie. Server components only. */
export async function pageLanguage(): Promise<VoiceLanguage> {
  return resolveLanguage((await cookies()).get(LANGUAGE_COOKIE)?.value);
}
