"use client";

import { useTransition } from "react";
import { Wrench } from "lucide-react";
import { devSignInAction, devSignOutAction } from "@/app/actions/dev";
import type { Role } from "@/lib/types";

const ROLES: { role: Role; label: string }[] = [
  { role: "elder", label: "Elder" },
  { role: "family", label: "Family" },
  { role: "caretaker", label: "Caretaker" },
];

/** Fixed bottom-right switch. On: signed into the demo circle. Off: signed out. */
export function DevModeToggle({ active, role }: { active: boolean; role: Role | null }) {
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<void>) => startTransition(() => void action());

  return (
    <div
      role="region"
      aria-label="Dev mode"
      className="fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 rounded-2xl border-2 border-amber bg-amber-soft p-3 shadow-lg"
    >
      <button
        type="button"
        role="switch"
        aria-checked={active}
        disabled={pending}
        onClick={() => run(active ? devSignOutAction : () => devSignInAction("family"))}
        className="flex min-h-12 items-center gap-3 rounded-xl px-2 font-bold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-60"
      >
        <Wrench aria-hidden="true" className="size-5" />
        Dev mode
        <span
          aria-hidden="true"
          className={`relative inline-block h-7 w-12 rounded-full border-2 border-foreground/40 transition-colors ${active ? "bg-primary" : "bg-card"}`}
        >
          <span
            className={`absolute top-0.5 size-5 rounded-full bg-foreground transition-all ${active ? "left-[1.35rem] bg-primary-foreground" : "left-0.5"}`}
          />
        </span>
        <span className="sr-only">{active ? "On" : "Off"}</span>
      </button>
      {active ? (
        <div role="group" aria-label="View the demo as" className="flex flex-wrap justify-end gap-1">
          {ROLES.map((option) => (
            <button
              key={option.role}
              type="button"
              disabled={pending}
              aria-pressed={role === option.role}
              onClick={() => run(() => devSignInAction(option.role))}
              className="min-h-10 rounded-lg border-2 border-input bg-card px-3 text-[0.95rem] font-bold aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-60"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="max-w-56 text-right text-[0.9rem] text-muted-foreground">
          Skip sign-up and explore a demo circle.
        </p>
      )}
    </div>
  );
}
