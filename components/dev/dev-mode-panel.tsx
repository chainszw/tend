"use client";

import { useEffect, useId, useSyncExternalStore, useTransition } from "react";
import { LogOut, Wrench, X } from "lucide-react";
import { LanguageSelect } from "@/components/voice/language-select";
import { devOpenAction, devSignOutAction } from "@/app/actions/dev";
import { DEV_ROLES, DEV_SCREENS } from "@/lib/dev-mode";
import type { Role } from "@/lib/types";

const OPEN_KEY = "tend_dev_open";
const ROLE_KEY = "tend_dev_role";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Kept for the browser tab, so the panel stays open while jumping from screen to screen. */
function write(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Private windows may refuse storage; the panel then simply closes after a jump.
  }
  for (const listener of listeners) listener();
}

const FOCUS = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring";

/**
 * Fixed corner button. Open it to jump straight to any screen of the demo family,
 * including the 3D device, without a family code or passcode.
 */
export function DevModePanel() {
  const open = useSyncExternalStore(subscribe, () => read(OPEN_KEY) === "1", () => false);
  const storedRole = useSyncExternalStore(subscribe, () => read(ROLE_KEY), () => null);
  const role: Role = DEV_ROLES.find((option) => option.role === storedRole)?.role ?? "family";
  const setOpen = (value: boolean) => write(OPEN_KEY, value ? "1" : "0");
  const [pending, startTransition] = useTransition();
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="fixed right-4 bottom-24 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 md:bottom-4">
      {open ? (
        <section
          id={panelId}
          aria-label="Dev mode shortcuts"
          className="w-80 max-w-full rounded-2xl border-2 border-amber bg-card p-4 shadow-lg"
        >
          <h2 className="text-lg font-extrabold">Dev mode</h2>
          <p className="mt-1 text-[0.9rem] text-muted-foreground">
            Open any screen of a ready-made demo family. No sign-in needed.
          </p>

          <fieldset className="mt-3">
            <legend className="mb-1 text-[0.9rem] font-bold">View as</legend>
            <div className="flex gap-1">
              {DEV_ROLES.map((option) => (
                <label
                  key={option.role}
                  className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg border-2 border-input bg-card px-2 text-[0.95rem] font-bold has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-4 has-focus-visible:ring-ring"
                >
                  <input
                    type="radio"
                    name="dev-role"
                    value={option.role}
                    checked={role === option.role}
                    onChange={() => write(ROLE_KEY, option.role)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-3">
            <p className="mb-1 text-[0.9rem] font-bold">Language</p>
            <LanguageSelect compact name="dev-language" />
          </div>

          <ul aria-label="Screens" className="mt-3 grid grid-cols-2 gap-2">
            {DEV_SCREENS.map((screen) => (
              <li key={screen.href} className="last:col-span-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(() => devOpenAction(role, screen.href))}
                  className={`min-h-12 w-full rounded-lg border-2 border-input bg-amber-soft px-3 font-bold hover:border-primary disabled:opacity-60 ${FOCUS}`}
                >
                  {screen.label}
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => devSignOutAction())}
            className={`mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg text-[0.95rem] font-bold text-muted-foreground hover:text-foreground disabled:opacity-60 ${FOCUS}`}
          >
            <LogOut aria-hidden="true" className="size-4" />
            Leave the demo
          </button>
          <p role="status" aria-live="polite" className="sr-only">
            {pending ? "Opening…" : ""}
          </p>
        </section>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className={`flex min-h-12 items-center gap-2 rounded-full border-2 border-amber bg-amber-soft px-4 font-bold shadow-lg ${FOCUS}`}
      >
        {open ? <X aria-hidden="true" className="size-5" /> : <Wrench aria-hidden="true" className="size-5" />}
        Dev mode
      </button>
    </div>
  );
}
