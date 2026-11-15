"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { setVoicePreferences } from "@/components/voice/voice-store";
import { messages, type Messages } from "@/lib/i18n";
import { DEFAULT_VOICE_LANGUAGE, type VoiceLanguage } from "@/lib/voice/language";

const LanguageContext = createContext<VoiceLanguage>(DEFAULT_VOICE_LANGUAGE);

/**
 * The page language for client components. It also sets the voice language, so speaking,
 * listening and the Companion's answers always match the page.
 */
export function LanguageProvider({ lang, children }: { lang: VoiceLanguage; children: ReactNode }) {
  useEffect(() => {
    setVoicePreferences({ language: lang });
  }, [lang]);
  return <LanguageContext.Provider value={lang}>{children}</LanguageContext.Provider>;
}

export function useLang(): VoiceLanguage {
  return useContext(LanguageContext);
}

export function useT(): Messages {
  return messages(useContext(LanguageContext));
}
