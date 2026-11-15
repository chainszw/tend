"use client";

import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MicButtonProps {
  listening: boolean;
  onToggle: () => void;
  disabled?: boolean;
  /** Label while idle. */
  label?: string;
  /** Label while listening. */
  listeningLabel?: string;
  /** Icon-only round button (the label becomes its accessible name). */
  compact?: boolean;
}

/** The one microphone control used everywhere: press to speak, press again when finished. */
export function MicButton({
  listening,
  onToggle,
  disabled,
  label = "Speak",
  listeningLabel = "I have finished",
  compact = false,
}: MicButtonProps) {
  const text = listening ? listeningLabel : label;
  return (
    <Button
      type="button"
      size={compact ? "icon" : "lg"}
      variant={listening ? "amber" : compact ? "quiet" : "outline"}
      aria-pressed={listening}
      aria-label={compact ? text : undefined}
      disabled={disabled}
      onClick={onToggle}
      className={compact ? "relative rounded-full transition-colors" : "transition-colors"}
    >
      {listening ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" className={compact ? "size-6" : undefined} />}
      {compact ? null : text}
      {listening ? (
        <span aria-hidden="true" className={compact ? "absolute -top-0.5 -right-0.5 flex size-3" : "relative ml-1 flex size-3"}>
          <span className="absolute inline-flex size-full rounded-full bg-destructive opacity-70 motion-safe:animate-ping" />
          <span className="relative inline-flex size-3 rounded-full bg-destructive" />
        </span>
      ) : null}
    </Button>
  );
}
