import { Wrench } from "lucide-react";
import { devSignInAction } from "@/app/actions/dev";
import { Button } from "@/components/ui/button";
import { devAccessEnabled } from "@/lib/dev";
import type { Role } from "@/lib/types";

const ROLES: { role: Role; label: string }[] = [
  { role: "elder", label: "As the elder" },
  { role: "family", label: "As family" },
  { role: "caretaker", label: "As a caretaker" },
];

/** Development-only shortcut into a ready-made demo circle. Renders nothing in production. */
export function DevAccess() {
  if (!devAccessEnabled()) return null;
  return (
    <aside
      aria-labelledby="dev-access-heading"
      className="mx-auto w-full max-w-6xl px-5 pb-8"
    >
      <div className="rounded-2xl border-2 border-dashed border-amber bg-amber-soft p-5">
        <h2 id="dev-access-heading" className="flex items-center gap-2 text-xl font-extrabold">
          <Wrench aria-hidden="true" className="size-5" />
          Developer shortcut
        </h2>
        <p className="mt-1 text-muted-foreground">
          Only shown while running <code>npm run dev</code>. Opens a demo circle with sample
          medicines and a visit, no code or passcode needed.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {ROLES.map(({ role, label }) => (
            <form key={role} action={devSignInAction.bind(null, role)}>
              <Button type="submit" variant="outline">
                {label}
              </Button>
            </form>
          ))}
        </div>
      </div>
    </aside>
  );
}
