"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { stopSpeaking, useVoicePreferences } from "@/components/voice/voice-store";
import { LANGUAGE_TAGS } from "@/lib/voice/language";

/** The small part of the Web Speech recognition API this app uses. */
interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | null {
  const speechWindow = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

const subscribeNever = () => () => {};
const canListenNow = () => recognitionConstructor() !== null;
const notOnServer = () => false;

/** Plain words for why listening stopped. Empty = nothing to tell the person. */
export function listeningError(code: string | undefined): string {
  switch (code) {
    case "aborted":
      return "";
    case "not-allowed":
    case "service-not-allowed":
      return "The microphone is blocked. Allow it in your browser settings, or carry on without it.";
    case "no-speech":
      return "I did not hear anything. Press the microphone and try again.";
    case "audio-capture":
      return "No microphone was found. You can carry on without it.";
    case "network":
      return "Listening needs an internet connection. Try again, or carry on without it.";
    default:
      return "I could not hear that. Try again, or carry on without it.";
  }
}

/**
 * Listens for one spoken sentence in the shared language. Words appear live in
 * `interim`; the finished sentence goes to `onHeard`, which decides what to do with
 * it. Nothing is recorded or kept: the browser's speech recognition does the work.
 */
export function useListening(onHeard: (transcript: string) => void) {
  const { language } = useVoicePreferences();
  const canListen = useSyncExternalStore(subscribeNever, canListenNow, notOnServer);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [heard, setHeard] = useState("");
  const [error, setError] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const heardHandler = useRef(onHeard);

  useEffect(() => {
    heardHandler.current = onHeard;
  }, [onHeard]);

  useEffect(() => () => recognition.current?.abort(), []);

  /** Stops listening and throws away what was heard so far. */
  const cancel = useCallback(() => recognition.current?.abort(), []);

  const start = useCallback(() => {
    if (recognition.current) return;
    const Constructor = recognitionConstructor();
    if (!Constructor) return;
    const session = new Constructor();
    session.lang = LANGUAGE_TAGS[language];
    session.interimResults = true;
    session.maxAlternatives = 1;
    session.onresult = (event) => {
      const results = Array.from(event.results);
      const transcript = results.map((result) => result[0]?.transcript ?? "").join(" ").trim();
      if (results.length > 0 && results.every((result) => result.isFinal)) {
        setInterim("");
        setHeard(transcript);
        if (transcript) heardHandler.current(transcript);
      } else {
        setInterim(transcript);
      }
    };
    session.onerror = (event) => setError(listeningError(event.error));
    session.onend = () => {
      recognition.current = null;
      setListening(false);
      setInterim("");
    };
    recognition.current = session;
    stopSpeaking();
    setError("");
    setInterim("");
    try {
      session.start();
      setListening(true);
    } catch {
      recognition.current = null;
      setError(listeningError(undefined));
    }
  }, [language]);

  /** Finishes the sentence: what was heard so far is kept. */
  const finish = useCallback(() => recognition.current?.stop(), []);

  const toggle = useCallback(() => {
    if (recognition.current) finish();
    else start();
  }, [finish, start]);

  return { canListen, listening, interim, heard, error, start, finish, cancel, toggle };
}
