/** Languages the voice assistant can listen to and speak. Pure helpers, no browser APIs. */

export const VOICE_LANGUAGES = ["en", "hi"] as const;
export type VoiceLanguage = (typeof VOICE_LANGUAGES)[number];

export const DEFAULT_VOICE_LANGUAGE: VoiceLanguage = "en";

/** Each language named in its own script, so it can be recognised by its speakers. */
export const LANGUAGE_LABELS: Record<VoiceLanguage, string> = {
  en: "English",
  hi: "हिन्दी",
};

/** Indian locales, so recognition and pronunciation use an Indian accent. */
export const LANGUAGE_TAGS: Record<VoiceLanguage, string> = {
  en: "en-IN",
  hi: "hi-IN",
};

/** Slightly unhurried, but not slow. */
export const SPEECH_RATE: Record<VoiceLanguage, number> = {
  en: 0.95,
  hi: 0.9,
};

export function isVoiceLanguage(value: unknown): value is VoiceLanguage {
  return typeof value === "string" && (VOICE_LANGUAGES as readonly string[]).includes(value);
}

/** The part of a browser `SpeechSynthesisVoice` that voice selection needs. */
export interface VoiceOption {
  name: string;
  lang: string;
}

const NATURAL_VOICE = /natural|neural|online|enhanced|premium|siri/i;
const REGION_SCORE: Record<string, number> = { "en-in": 20, "en-gb": 10, "en-us": 5 };

function voiceScore(voice: VoiceOption, language: VoiceLanguage): number {
  const lang = voice.lang.replace("_", "-").toLowerCase();
  if (!lang.startsWith(language)) return -1;
  let score = REGION_SCORE[lang] ?? (lang === LANGUAGE_TAGS[language].toLowerCase() ? 20 : 0);
  if (NATURAL_VOICE.test(voice.name)) score += 40;
  if (/google/i.test(voice.name)) score += 30;
  if (/female/i.test(voice.name)) score += 2;
  return score;
}

/**
 * Chooses the most natural installed voice for a language: neural and Google voices
 * first, then an Indian accent, then anything that speaks the language. Null when
 * the browser has no voice for it.
 */
export function pickVoice<T extends VoiceOption>(voices: readonly T[], language: VoiceLanguage): T | null {
  let best: T | null = null;
  let bestScore = -1;
  for (const voice of voices) {
    const score = voiceScore(voice, language);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

/** Removes markdown and symbols that a voice would read out as noise. */
export function speakable(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/^\s*(?:[-*•]|#{1,6}|>|\d+[.)])\s+/gm, "")
    .replace(/[*_`~#|]/g, "")
    .replace(/\s*\n+\s*/g, ". ")
    .replace(/([.!?।:;,])\s*\.(?=\s|$)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const MAX_CHUNK = 220;

/**
 * Splits text at sentence ends into chunks of a comfortable length. Short sentences
 * stay together so there is no pause after every one, and no chunk is long enough
 * for a browser to cut it off part way.
 */
export function splitForSpeech(text: string): string[] {
  const sentences = speakable(text).match(/[^.!?।]+[.!?।]*\s*/g) ?? [];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > MAX_CHUNK) {
      chunks.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
