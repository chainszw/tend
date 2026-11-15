"use client";

import { useId } from "react";
import { Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeech } from "@/components/voice/voice-store";

interface ReadAloudProps {
  text: string;
  label?: string;
  variant?: "outline" | "quiet";
  /** Names this speaker, so speech started elsewhere (auto read-aloud) shows Stop here. */
  speechId?: string;
}

/** Reads text aloud in the chosen language with the shared voice. Hidden where unsupported. */
export function ReadAloud({ text, label = "Read this aloud", variant = "outline", speechId }: ReadAloudProps) {
  const ownId = useId();
  const { supported, speaking, speak, stop } = useSpeech(speechId ?? ownId);

  if (!supported) return null;

  return (
    <Button
      type="button"
      variant={speaking ? "amber" : variant}
      onClick={() => (speaking ? stop() : speak(text))}
      aria-pressed={speaking}
    >
      {speaking ? <Square aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
      {speaking ? "Stop reading" : label}
      {speaking ? (
        <span aria-hidden="true" className="ml-1 flex items-end gap-0.5">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-3 w-1 origin-bottom rounded-full bg-current motion-safe:animate-pulse"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      ) : null}
    </Button>
  );
}
