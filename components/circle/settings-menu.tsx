"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Settings } from "lucide-react";
import { setTextSizeAction } from "@/app/actions/circle";
import { useT } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import { LanguageSelect } from "@/components/voice/language-select";
import {
  TEXT_SIZE_DEFAULT,
  TEXT_SIZE_MAX,
  TEXT_SIZE_MIN,
  TEXT_SIZE_STEP,
} from "@/lib/preferences";

/**
 * The "Settings" button: text size (the page resizes live) and the app language.
 * Both choices are remembered.
 */
export function SettingsMenu({ initial }: { initial: number }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(initial);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  function apply(next: number) {
    setSize(next);
    document.documentElement.style.fontSize = `${next}%`;
  }

  function save(next: number) {
    void setTextSizeAction(next);
  }

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="quiet"
        size="sm"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Settings aria-hidden="true" />
        {t.settings}
      </Button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={t.settings}
          className="absolute left-0 z-30 sm:right-0 sm:left-auto mt-2 flex w-80 max-w-[calc(100vw-2.5rem)] flex-col gap-4 rounded-xl border-2 border-border bg-card p-4 shadow-lg"
        >
          <section aria-labelledby={`${panelId}-size`}>
            <h2 id={`${panelId}-size`} className="mb-1 font-bold">
              {t.textSize}
            </h2>
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="text-sm font-bold">
                A
              </span>
              <input
                type="range"
                aria-label={t.textSize}
                aria-valuetext={t.textSizeValue(Math.round(size))}
                min={TEXT_SIZE_MIN}
                max={TEXT_SIZE_MAX}
                step={TEXT_SIZE_STEP}
                value={size}
                onChange={(event) => apply(Number(event.target.value))}
                onPointerUp={(event) => save(Number(event.currentTarget.value))}
                onKeyUp={(event) => save(Number(event.currentTarget.value))}
                className="h-11 w-full cursor-pointer accent-primary"
              />
              <span aria-hidden="true" className="text-2xl font-bold">
                A
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 w-full"
              onClick={() => {
                apply(TEXT_SIZE_DEFAULT);
                save(TEXT_SIZE_DEFAULT);
              }}
            >
              {t.resetTextSize}
            </Button>
          </section>
          <section
            aria-labelledby={`${panelId}-lang`}
            className="border-t-2 border-border pt-4"
          >
            <h2 id={`${panelId}-lang`} className="mb-2 font-bold">
              {t.language}
            </h2>
            <LanguageSelect compact />
            <p className="mt-2 text-[0.9rem] text-muted-foreground">
              {t.hindiBetaNote}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
