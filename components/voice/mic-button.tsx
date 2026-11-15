"use client";

import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MicButtonProps {
  listening: boolean;
  onToggle: () => void;
  disabled?: boolean;
  /** Label while idle. */
  label?: string;
}

/** The one microphone control used everywhere: press to speak, press again when finished. */
export function MicButton({ listening, onToggle, disabled, label = "Speak" }: MicButtonProps) {
  return (
    <Button
      type="button"
      size="lg"
      variant={listening ? "amber" : "outline"}
      aria-pressed={listening}
      disabled={disabled}
      onClick={onToggle}
      className="transition-colors"
    >
      {listening ? (
        <Square aria-hidden="true" />
      ) : (
        <Mic aria-hidden="true" />
      )}
      {listening ? "I have finished" : label}
      {listening ? (
        <span aria-hidden="true" className="relative ml-1 flex size-3">
          <span className="absolute inline-flex size-full rounded-full bg-destructive opacity-70 motion-safe:animate-ping" />
          <span className="relative inline-flex size-3 rounded-full bg-destructive" />
        </span>
      ) : null}
    </Button>
  );
}
