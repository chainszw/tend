"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/** The small part of the Web Speech recognition API this app uses. */
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
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

/**
 * The device's voice: speaks guidance with the browser's built-in voice and,
 * where the browser supports it, listens for one spoken command at a time.
 */
export function useVoice(onHeard: (transcript: string) => void) {
  const canListen = useSyncExternalStore(subscribeNever, canListenNow, notOnServer);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const heardHandler = useRef(onHeard);

  useEffect(() => {
    heardHandler.current = onHeard;
  }, [onHeard]);

  useEffect(
    () => () => {
      recognition.current?.abort();
      window.speechSynthesis?.cancel();
    },
    [],
  );

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, []);

  const silence = useCallback(() => window.speechSynthesis?.cancel(), []);

  const toggleListening = useCallback(() => {
    if (recognition.current) {
      recognition.current.abort();
      return;
    }
    const Constructor = recognitionConstructor();
    if (!Constructor) return;
    const session = new Constructor();
    session.lang = "en-IN";
    session.interimResults = false;
    session.maxAlternatives = 1;
    session.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setHeard(transcript);
      heardHandler.current(transcript);
    };
    const finish = () => {
      recognition.current = null;
      setListening(false);
    };
    session.onend = finish;
    session.onerror = finish;
    recognition.current = session;
    window.speechSynthesis?.cancel();
    try {
      session.start();
      setListening(true);
    } catch {
      finish();
    }
  }, []);

  return { canListen, listening, heard, speak, silence, toggleListening };
}
