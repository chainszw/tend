"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveMedicationAction } from "@/app/actions/medications";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Field, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";
import { WEEKDAY_LONG_NAMES } from "@/lib/schedule";
import type { Medication } from "@/lib/types";

interface MedicationFormProps {
  medication?: Medication;
  /** Today's date in the circle's time zone (`YYYY-MM-DD`). */
  today: string;
  onSaved: () => void;
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const MAX_TIMES = 8;

let nextKey = 0;
const keyed = (value: string) => ({ key: (nextKey += 1), value });

export function MedicationForm({ medication, today, onSaved }: MedicationFormProps) {
  const [times, setTimes] = useState(() => (medication?.times ?? ["08:00"]).map(keyed));
  const { state, pending, onSubmit } = useFormAction(saveMedicationAction, (result) => {
    toast.success(result.message ?? "Medicine saved");
    onSaved();
  });
  const errors = state.fieldErrors ?? {};
  const days = medication?.days ?? ALL_DAYS;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {medication ? <input type="hidden" name="id" value={medication.id} /> : null}

      <Field htmlFor="med-name" label="Medicine name" error={errors.name}>
        <Input
          id="med-name"
          name="name"
          required
          defaultValue={medication?.name}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy("med-name", undefined, errors.name)}
        />
      </Field>
      <Field htmlFor="med-dosage" label="Dose" hint="For example: 500 mg, 1 tablet">
        <Input
          id="med-dosage"
          name="dosage"
          defaultValue={medication?.dosage}
          aria-describedby="med-dosage-hint"
        />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-bold">Times of day</legend>
        {times.map((time, index) => (
          <div key={time.key} className="flex items-center gap-2">
            <Input
              type="time"
              name="times"
              required
              defaultValue={time.value}
              aria-label={`Time ${index + 1}`}
              className="max-w-44"
            />
            {times.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove time ${index + 1}`}
                onClick={() => setTimes(times.filter((item) => item.key !== time.key))}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        ))}
        {times.length < MAX_TIMES ? (
          <Button
            type="button"
            variant="quiet"
            size="sm"
            className="self-start"
            onClick={() => setTimes([...times, keyed("20:00")])}
          >
            <Plus aria-hidden="true" />
            Add another time
          </Button>
        ) : null}
        {errors.times ? (
          <p role="alert" className="font-bold text-destructive">
            {errors.times}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-bold">Days</legend>
        <div className="flex flex-wrap gap-2">
          {ALL_DAYS.map((day) => (
            <label
              key={day}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 border-input bg-card px-4 font-bold has-checked:border-primary has-checked:bg-leaf-soft has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-ring"
            >
              <input
                type="checkbox"
                name="days"
                value={day}
                defaultChecked={days.includes(day)}
                className="size-5 accent-primary"
              />
              {WEEKDAY_LONG_NAMES[day]}
            </label>
          ))}
        </div>
        {errors.days ? (
          <p role="alert" className="font-bold text-destructive">
            {errors.days}
          </p>
        ) : null}
      </fieldset>

      <Field htmlFor="med-instructions" label="How to take it" hint="For example: after food, with water">
        <Input
          id="med-instructions"
          name="instructions"
          defaultValue={medication?.instructions}
          aria-describedby="med-instructions-hint"
        />
      </Field>
      <Field htmlFor="med-purpose" label="What it is for" hint="For example: blood pressure">
        <Input
          id="med-purpose"
          name="purpose"
          defaultValue={medication?.purpose}
          aria-describedby="med-purpose-hint"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor="med-start" label="Start date" error={errors.startDate}>
          <Input
            id="med-start"
            name="startDate"
            type="date"
            required
            defaultValue={medication?.start_date ?? today}
            aria-invalid={errors.startDate ? true : undefined}
            aria-describedby={describedBy("med-start", undefined, errors.startDate)}
          />
        </Field>
        <Field htmlFor="med-end" label="End date" hint="Leave empty if it is ongoing" error={errors.endDate}>
          <Input
            id="med-end"
            name="endDate"
            type="date"
            defaultValue={medication?.end_date ?? ""}
            aria-invalid={errors.endDate ? true : undefined}
            aria-describedby={describedBy("med-end", "hint", errors.endDate)}
          />
        </Field>
      </div>

      <FormMessage message={state.ok ? undefined : state.message} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save medicine"}
      </Button>
    </form>
  );
}
