"use client";

import { useState, useTransition } from "react";
import { Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMedicationAction, setMedicationActiveAction } from "@/app/actions/medications";
import { ConfirmButton } from "@/components/circle/confirm-button";
import { MedicationForm } from "@/components/circle/medication-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Medication } from "@/lib/types";

/** "Add a medicine" button that opens the medicine form. */
export function AddMedicationButton({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" />}>
        <Plus aria-hidden="true" />
        Add a medicine
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a medicine</DialogTitle>
          <DialogDescription>Copy the details from the label or prescription.</DialogDescription>
        </DialogHeader>
        <MedicationForm today={today} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

/** Edit, pause/resume and remove controls for one medicine. */
export function MedicationControls({ medication, today }: { medication: Medication; today: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggleActive() {
    startTransition(async () => {
      const result = await setMedicationActiveAction(medication.id, !medication.active);
      if (result.ok) toast.success(result.message ?? "Saved");
      else toast.error(result.message ?? "That did not work. Try again.");
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={<Button type="button" variant="outline" size="sm" aria-label={`Edit ${medication.name}`} />}
        >
          <Pencil aria-hidden="true" />
          Edit
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {medication.name}</DialogTitle>
            <DialogDescription>Changes show up for everyone in the family.</DialogDescription>
          </DialogHeader>
          <MedicationForm medication={medication} today={today} onSaved={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
      <Button
        type="button"
        variant="quiet"
        size="sm"
        disabled={pending}
        onClick={toggleActive}
        aria-label={`${medication.active ? "Pause" : "Resume"} ${medication.name}`}
      >
        {medication.active ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        {medication.active ? "Pause" : "Resume"}
      </Button>
      <ConfirmButton
        trigger={
          <>
            <Trash2 aria-hidden="true" />
            Remove
          </>
        }
        triggerLabel={`Remove ${medication.name}`}
        title={`Remove ${medication.name}?`}
        description="This also removes its history of taken and missed doses. To stop it for a while and keep the history, use Pause."
        confirmLabel="Remove medicine"
        action={() => deleteMedicationAction(medication.id)}
      />
    </div>
  );
}
