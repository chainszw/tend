"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const subscribeNever = () => () => {};
const speechSupported = () => "speechSynthesis" in window;
const notOnServer = () => false;

interface ReadAloudProps {
  text: string;
  label?: string;
  variant?: "outline" | "quiet";
}

/** Reads text aloud with the browser's built-in voice. Hidden where unsupported. */
export function ReadAloud({ text, label = "Read this aloud", variant = "outline" }: ReadAloudProps) {
  const supported = useSyncExternalStore(subscribeNever, speechSupported, notOnServer);
  const [speaking, setSpeaking] = useState(false);

  // Stop any speech when leaving the page.
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  if (!supported) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utterance);
    setSpeaking(true);
  }

  return (
    <Button type="button" variant={variant} onClick={toggle} aria-pressed={speaking}>
      {speaking ? <Square aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
      {speaking ? "Stop reading" : label}
    </Button>
  );
}
