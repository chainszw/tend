"use client";

import { Languages } from "lucide-react";
import { setVoicePreferences, stopSpeaking, useVoicePreferences } from "@/components/voice/voice-store";
import { LANGUAGE_LABELS, VOICE_LANGUAGES } from "@/lib/voice/language";

/** Chooses the language for speaking, listening and answers. Remembered on every page. */
export function LanguageSelect() {
  const { language } = useVoicePreferences();

  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">Language for voice and answers</legend>
      <Languages aria-hidden="true" className="size-6 text-muted-foreground" />
      {VOICE_LANGUAGES.map((option) => (
        <label
          key={option}
          lang={option}
          className="flex min-h-12 cursor-pointer items-center rounded-full border-2 border-input bg-card px-5 text-lg font-bold transition-colors has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-4 has-focus-visible:ring-ring"
        >
          <input
            type="radio"
            name="voice-language"
            value={option}
            checked={language === option}
            onChange={() => {
              stopSpeaking();
              setVoicePreferences({ language: option });
            }}
            className="sr-only"
          />
          {LANGUAGE_LABELS[option]}
        </label>
      ))}
    </fieldset>
  );
}
