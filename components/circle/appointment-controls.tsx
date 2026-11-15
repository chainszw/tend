"use client";

import { useState, useTransition } from "react";
import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteAppointmentAction,
  prepareVisitAction,
  saveAppointmentAction,
} from "@/app/actions/appointments";
import { ConfirmButton } from "@/components/circle/confirm-button";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, describedBy } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";

export interface AppointmentFormValues {
  id: string;
  doctor: string;
  specialty: string;
  location: string;
  notes: string;
  /** Local date and time in the family's time zone. */
  date: string;
  time: string;
}

interface AppointmentFormProps {
  appointment?: AppointmentFormValues;
  today: string;
  onSaved: () => void;
}

const NOTES_HINT = "The reason for the visit, or what to bring.";

function AppointmentForm({ appointment, today, onSaved }: AppointmentFormProps) {
  const { state, pending, onSubmit } = useFormAction(saveAppointmentAction, (result) => {
    toast.success(result.message ?? "Appointment saved");
    onSaved();
  });
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {appointment ? <input type="hidden" name="id" value={appointment.id} /> : null}
      <Field htmlFor="visit-doctor" label="Doctor or clinic" error={errors.doctor}>
        <Input
          id="visit-doctor"
          name="doctor"
          required
          defaultValue={appointment?.doctor}
          aria-invalid={errors.doctor ? true : undefined}
          aria-describedby={describedBy("visit-doctor", undefined, errors.doctor)}
        />
      </Field>
      <Field htmlFor="visit-specialty" label="Kind of doctor" hint="For example: heart, eyes, general">
        <Input
          id="visit-specialty"
          name="specialty"
          defaultValue={appointment?.specialty}
          aria-describedby="visit-specialty-hint"
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor="visit-date" label="Date" error={errors.date}>
          <Input
            id="visit-date"
            name="date"
            type="date"
            required
            min={appointment ? undefined : today}
            defaultValue={appointment?.date ?? today}
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={describedBy("visit-date", undefined, errors.date)}
          />
        </Field>
        <Field htmlFor="visit-time" label="Time" error={errors.time}>
          <Input
            id="visit-time"
            name="time"
            type="time"
            required
            defaultValue={appointment?.time ?? "10:00"}
            aria-invalid={errors.time ? true : undefined}
            aria-describedby={describedBy("visit-time", undefined, errors.time)}
          />
        </Field>
      </div>
      <Field htmlFor="visit-location" label="Where">
        <Input id="visit-location" name="location" defaultValue={appointment?.location} />
      </Field>
      <Field htmlFor="visit-notes" label="Notes" hint={NOTES_HINT}>
        <Textarea
          id="visit-notes"
          name="notes"
          rows={3}
          defaultValue={appointment?.notes}
          aria-describedby="visit-notes-hint"
        />
      </Field>
      <FormMessage message={state.ok ? undefined : state.message} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save visit"}
      </Button>
    </form>
  );
}

/** "Add a visit" button that opens the appointment form. */
export function AddAppointmentButton({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" />}>
        <Plus aria-hidden="true" />
        Add a visit
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a doctor visit</DialogTitle>
          <DialogDescription>
            Everyone in the family gets an email the day before and again shortly before.
          </DialogDescription>
        </DialogHeader>
        <AppointmentForm today={today} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

interface AppointmentControlsProps {
  appointment: AppointmentFormValues;
  today: string;
  hasQuestions: boolean;
  upcoming: boolean;
}

/** Prepare-questions, edit and remove controls for one appointment. */
export function AppointmentControls(props: AppointmentControlsProps) {
  const { appointment, today, hasQuestions, upcoming } = props;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function prepare() {
    startTransition(async () => {
      const result = await prepareVisitAction(appointment.id);
      if (result.ok) toast.success(result.message ?? "Questions ready");
      else toast.error(result.message ?? "That did not work. Try again.");
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {upcoming ? (
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={prepare}>
          <ListChecks aria-hidden="true" />
          {pending
            ? "Preparing questions…"
            : hasQuestions
              ? "Prepare new questions"
              : "Prepare questions to ask"}
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="quiet"
              size="sm"
              aria-label={`Edit the visit with ${appointment.doctor}`}
            />
          }
        >
          <Pencil aria-hidden="true" />
          Edit
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit visit</DialogTitle>
            <DialogDescription>Changes show up for everyone in the family.</DialogDescription>
          </DialogHeader>
          <AppointmentForm appointment={appointment} today={today} onSaved={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
      <ConfirmButton
        trigger={
          <>
            <Trash2 aria-hidden="true" />
            Remove
          </>
        }
        triggerLabel={`Remove the visit with ${appointment.doctor}`}
        title={`Remove the visit with ${appointment.doctor}?`}
        description="Reminder emails for this visit will stop."
        confirmLabel="Remove visit"
        action={() => deleteAppointmentAction(appointment.id)}
      />
    </div>
  );
}
