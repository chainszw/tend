"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { stopSpeaking, useVoicePreferences } from "@/components/voice/voice-store";
import { LANGUAGE_TAGS, listeningError } from "@/lib/voice/language";

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

/** Set once the browser's speech service has failed, so the mic stops promising it. */
let serviceFailed = false;
const failureListeners = new Set<() => void>();
function markServiceFailed() {
  serviceFailed = true;
  failureListeners.forEach((listener) => listener());
}
const subscribeFailure = (listener: () => void) => {
  failureListeners.add(listener);
  return () => {
    failureListeners.delete(listener);
  };
};
const canListenNow = () => recognitionConstructor() !== null && !serviceFailed;
const notOnServer = () => false;

/**
 * Listens for one spoken sentence in the shared language. Words appear live in
 * `interim`; the finished sentence goes to `onHeard`, which decides what to do with
 * it. Nothing is recorded or kept: the browser's speech recognition does the work.
 */
export function useListening(onHeard: (transcript: string) => void) {
  const { language } = useVoicePreferences();
  const canListen = useSyncExternalStore(subscribeFailure, canListenNow, notOnServer);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [heard, setHeard] = useState("");
  const [error, setError] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const heardHandler = useRef(onHeard);
  const retried = useRef(false);
  const retryPending = useRef(false);
  const startRef = useRef<() => void>(() => {});

  useEffect(() => {
    heardHandler.current = onHeard;
  }, [onHeard]);

  useEffect(() => () => recognition.current?.abort(), []);

  /** Stops listening and throws away what was heard so far. */
  const cancel = useCallback(() => recognition.current?.abort(), []);

  const start = useCallback(() => {
    if (recognition.current) return;
    if (!retryPending.current) retried.current = false;
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
    session.onerror = (event) => {
      if (event.error === "network" && !retried.current) {
        // One quiet retry: the speech service sometimes fails on the first try.
        retried.current = true;
        retryPending.current = true;
        return;
      }
      if (event.error === "network") markServiceFailed();
      setError(listeningError(event.error));
    };
    session.onend = () => {
      recognition.current = null;
      setListening(false);
      setInterim("");
      if (retryPending.current) {
        retryPending.current = false;
        startRef.current();
      }
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

  useEffect(() => {
    startRef.current = start;
  }, [start]);

  /** Finishes the sentence: what was heard so far is kept. */
  const finish = useCallback(() => recognition.current?.stop(), []);

  const toggle = useCallback(() => {
    if (recognition.current) finish();
    else start();
  }, [finish, start]);

  return { canListen, listening, interim, heard, error, start, finish, cancel, toggle };
}
