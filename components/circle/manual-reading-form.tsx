"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { addManualReadingAction } from "@/app/actions/readings";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Field, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";
import { KIND_LABELS, READING_KINDS, type ReadingKind } from "@/lib/device/readings";

interface FieldSpec {
  name: string;
  label: string;
  hint?: string;
  inputMode: "numeric" | "decimal";
}

const PULSE: FieldSpec = { name: "pulse", label: "Pulse (beats a minute)", inputMode: "numeric" };

const FIELDS: Record<ReadingKind, FieldSpec[]> = {
  bp: [
    { name: "systolic", label: "Top number (mmHg)", hint: "For example 120", inputMode: "numeric" },
    { name: "diastolic", label: "Bottom number (mmHg)", hint: "For example 80", inputMode: "numeric" },
    PULSE,
  ],
  spo2: [{ name: "spo2", label: "Oxygen level (%)", hint: "For example 97", inputMode: "numeric" }, PULSE],
  temp: [{ name: "temperature_c", label: "Temperature (°C)", hint: "For example 36.8", inputMode: "decimal" }],
  weight: [{ name: "weight_kg", label: "Weight (kg)", hint: "For example 62.5", inputMode: "decimal" }],
};

/** Lets anyone in the circle type in a reading taken with their own equipment. */
export function ManualReadingForm({ onSaved }: { onSaved?: () => void }) {
  const [kind, setKind] = useState<ReadingKind>("bp");
  const formRef = useRef<HTMLFormElement>(null);
  const { state, pending, onSubmit } = useFormAction(addManualReadingAction, (result) => {
    toast.success(result.message ?? "Reading saved");
    formRef.current?.reset();
    onSaved?.();
  });
  const errors = state.fieldErrors ?? {};

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-bold">What did you measure?</legend>
        <div className="flex flex-wrap gap-2">
          {READING_KINDS.map((option) => (
            <label
              key={option}
              className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 border-input bg-card px-4 font-bold has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name="kind"
                value={option}
                checked={kind === option}
                onChange={() => setKind(option)}
                className="size-4 accent-primary"
              />
              {KIND_LABELS[option]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS[kind].map((field) => {
          const id = `manual-${kind}-${field.name}`;
          return (
            <Field key={id} htmlFor={id} label={field.label} hint={field.hint} error={errors[field.name]}>
              <Input
                id={id}
                name={field.name}
                inputMode={field.inputMode}
                autoComplete="off"
                required
                aria-invalid={errors[field.name] ? true : undefined}
                aria-describedby={describedBy(id, field.hint, errors[field.name])}
              />
            </Field>
          );
        })}
      </div>

      <FormMessage message={state.ok ? undefined : state.message} />
      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save reading"}
        </Button>
      </div>
    </form>
  );
}
