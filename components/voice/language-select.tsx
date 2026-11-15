"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLanguageAction } from "@/app/actions/circle";
import { useT } from "@/components/i18n/language-provider";
import {
  setVoicePreferences,
  stopSpeaking,
  useVoicePreferences,
} from "@/components/voice/voice-store";
import {
  LANGUAGE_LABELS,
  VOICE_LANGUAGES,
  type VoiceLanguage,
} from "@/lib/voice/language";

/**
 * Chooses the one app language: page words, speaking, listening and answers.
 * Remembered in a cookie, so every page and the voice stay in step.
 */
export function LanguageSelect({
  compact = false,
}: { compact?: boolean } = {}) {
  const { language } = useVoicePreferences();
  const t = useT();
  const router = useRouter();
  const [, startTransition] = useTransition();

  function choose(option: VoiceLanguage) {
    stopSpeaking();
    setVoicePreferences({ language: option });
    startTransition(async () => {
      await setLanguageAction(option);
      router.refresh();
    });
  }

  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">{t.languageLegend}</legend>
      {compact ? null : (
        <Languages
          aria-hidden="true"
          className="size-6 text-muted-foreground"
        />
      )}
      {VOICE_LANGUAGES.map((option) => (
        <label
          key={option}
          lang={option}
          className={`flex cursor-pointer items-center rounded-full border-2 border-input bg-card font-bold transition-colors ${compact ? "min-h-11 px-4 text-base" : "min-h-12 px-5 text-lg"} has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-4 has-focus-visible:ring-ring`}
        >
          <input
            type="radio"
            name="voice-language"
            value={option}
            checked={language === option}
            onChange={() => choose(option)}
            className="sr-only"
          />
          {LANGUAGE_LABELS[option]}
        </label>
      ))}
    </fieldset>
  );
}
