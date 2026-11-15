"use client";

import { useTransition } from "react";
import { AlarmClock, Check, CircleSlash, Clock3, TriangleAlert, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { logDoseAction } from "@/app/actions/medications";
import { Button } from "@/components/ui/button";
import type { DoseStatus } from "@/lib/adherence";
import { useLang, useT } from "@/components/i18n/language-provider";
import { formatTimeIn } from "@/lib/schedule";

export interface DoseCardProps {
  medicationId: string;
  scheduledFor: string;
  time: string;
  name: string;
  dosage: string;
  instructions: string;
  status: DoseStatus;
}

const STATUS = {
  taken: { icon: Check, chip: "bg-primary text-primary-foreground", card: "border-primary bg-leaf-soft" },
  skipped: { icon: CircleSlash, chip: "bg-well text-foreground", card: "border-border bg-card" },
  missed: { icon: TriangleAlert, chip: "bg-destructive text-white", card: "border-destructive bg-card" },
  due: { icon: AlarmClock, chip: "bg-amber text-foreground", card: "border-amber bg-amber-soft" },
  later: { icon: Clock3, chip: "bg-well text-foreground", card: "border-border bg-card" },
} as const;

/** One dose in the organiser, with large Taken / Skip buttons. */
export function DoseCard(props: DoseCardProps) {
  const { medicationId, scheduledFor, time, name, dosage, instructions, status } = props;
  const [pending, startTransition] = useTransition();
  const t = useT();
  const { icon: StatusIcon, chip, card } = STATUS[status];
  const label = t.status[status];
  const when = formatTimeIn(time, useLang());
  const logged = status === "taken" || status === "skipped";

  function log(next: "taken" | "skipped" | "clear") {
    startTransition(async () => {
      const result = await logDoseAction({ medicationId, scheduledFor, status: next });
      if (result.ok) toast.success(`${name}: ${t.doseSaved[next]}`);
      else toast.error(t.doseFailed);
    });
  }

  return (
    <li className={`flex flex-col gap-3 rounded-2xl border-2 p-4 ${card}`} aria-busy={pending}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-lg font-extrabold">{when}</p>
        <p className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.9rem] font-bold ${chip}`}>
          <StatusIcon aria-hidden="true" className="size-4" strokeWidth={2.5} />
          {label}
        </p>
      </div>
      <div>
        <h3 className="text-xl font-extrabold">{name}</h3>
        {dosage || instructions ? (
          <p className="text-muted-foreground">{[dosage, instructions].filter(Boolean).join(", ")}</p>
        ) : null}
      </div>
      {logged ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => log("clear")}
          aria-label={t.undoLabel(name, when)}
          className="self-start"
        >
          <Undo2 aria-hidden="true" />
          {t.undo}
        </Button>
      ) : (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() => log("taken")}
            aria-label={t.markTaken(name, when)}
          >
            <Check aria-hidden="true" strokeWidth={3} />
            {t.taken}
          </Button>
          <Button
            type="button"
            variant="quiet"
            disabled={pending}
            onClick={() => log("skipped")}
            aria-label={t.markSkipped(name, when)}
          >
            {t.skip}
          </Button>
        </div>
      )}
    </li>
  );
}
