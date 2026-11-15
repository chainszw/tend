"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_VOICE_LANGUAGE,
  LANGUAGE_TAGS,
  SPEECH_RATE,
  isVoiceLanguage,
  pickVoice,
  splitForSpeech,
  type VoiceLanguage,
} from "@/lib/voice/language";

/**
 * One voice for the whole app: the chosen language, the read-aloud setting and the
 * single speech channel live here, so the Ask page and the device stay in step and
 * two things can never talk over each other. Speech uses the browser's own voices;
 * no audio or text leaves the device for speaking.
 */

export interface VoicePreferences {
  language: VoiceLanguage;
  autoRead: boolean;
}

const STORAGE_KEY = "tend_voice";
const DEFAULTS: VoicePreferences = { language: DEFAULT_VOICE_LANGUAGE, autoRead: false };

let preferences: VoicePreferences | null = null;
let speakingId: string | null = null;
let utteranceRun = 0;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function loadPreferences(): VoicePreferences {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (stored && typeof stored === "object") {
      const { language, autoRead } = stored as Record<string, unknown>;
      return {
        language: isVoiceLanguage(language) ? language : DEFAULTS.language,
        autoRead: autoRead === true,
      };
    }
  } catch {
    // Private windows and blocked storage: fall back to the defaults.
  }
  return DEFAULTS;
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    preferences = loadPreferences();
    notify();
  };
  listeners.add(listener);
  // Chrome loads its voices in the background; asking early has them ready in time.
  if (canSpeak()) window.speechSynthesis.getVoices();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function currentPreferences(): VoicePreferences {
  preferences ??= loadPreferences();
  return preferences;
}

const serverPreferences = () => DEFAULTS;

export function setVoicePreferences(change: Partial<VoicePreferences>) {
  preferences = { ...currentPreferences(), ...change };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // The choice still applies for this visit.
  }
  notify();
}

/** The language and read-aloud choice, shared by every page and remembered. */
export function useVoicePreferences(): VoicePreferences {
  return useSyncExternalStore(subscribe, currentPreferences, serverPreferences);
}

const canSpeak = () => "speechSynthesis" in window;

/** Stops whatever is being spoken, at once. */
export function stopSpeaking() {
  utteranceRun += 1;
  if (canSpeak()) window.speechSynthesis.cancel();
  if (speakingId !== null) {
    speakingId = null;
    notify();
  }
}

/**
 * Speaks text in the chosen language with the most natural installed voice. Anything
 * already being spoken stops first. `id` names the speaker so its button can show Stop.
 */
export function speakText(id: string, text: string, language: VoiceLanguage) {
  stopSpeaking();
  if (!canSpeak()) return;
  const chunks = splitForSpeech(text);
  if (chunks.length === 0) return;

  const synth = window.speechSynthesis;
  const voice = pickVoice(synth.getVoices(), language);
  const run = utteranceRun;
  const finish = () => {
    // A stopped utterance reports its end late; it must not clear a newer one.
    if (utteranceRun !== run) return;
    speakingId = null;
    notify();
  };
  chunks.forEach((chunk, index) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = voice?.lang ?? LANGUAGE_TAGS[language];
    if (voice) utterance.voice = voice;
    utterance.rate = SPEECH_RATE[language];
    utterance.onerror = finish;
    if (index === chunks.length - 1) utterance.onend = finish;
    synth.speak(utterance);
  });
  speakingId = id;
  notify();
}

const currentSpeaker = () => speakingId;
const serverSpeaker = () => null;
const subscribeNever = () => () => {};
const notOnServer = () => false;

/** Speaking controls for one speaker (`id`), in the shared language. */
export function useSpeech(id: string) {
  const { language } = useVoicePreferences();
  const supported = useSyncExternalStore(subscribeNever, canSpeak, notOnServer);
  const speaking = useSyncExternalStore(subscribe, currentSpeaker, serverSpeaker) === id;
  const speak = useCallback((text: string) => speakText(id, text, language), [id, language]);
  return { supported, speaking, speak, stop: stopSpeaking };
}
