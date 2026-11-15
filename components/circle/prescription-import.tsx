"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { Camera, ScanText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { importPrescriptionAction, scanPrescriptionAction } from "@/app/actions/ai";
import { saveImportedMedicationsAction } from "@/app/actions/medications";
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
import { Input, Textarea } from "@/components/ui/input";
import type { MedicationDraft } from "@/lib/ai-parse";
import { shrinkImage } from "@/lib/image-resize";

const EXAMPLE = `Tab. Metformin 500 mg, 1 tablet twice daily after food
Tab. Amlodipine 5 mg, once daily in the morning for blood pressure
Tab. Atorvastatin 10 mg at bedtime`;

interface Draft extends MedicationDraft {
  key: number;
}

/**
 * Scan or paste a prescription, let Adaption read it into medicines, then review and
 * correct every line before anything is saved. Nothing is added automatically.
 */
export function PrescriptionImport({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [error, setError] = useState<string>();
  const [scanning, setScanning] = useState(false);
  const [pending, startTransition] = useTransition();
  const photoInput = useRef<HTMLInputElement>(null);

  function reset() {
    setText("");
    setDrafts(null);
    setError(undefined);
  }

  function read() {
    setError(undefined);
    startTransition(async () => {
      const result = await importPrescriptionAction(text);
      if (result.ok && result.drafts) {
        setDrafts(result.drafts.map((draft, index) => ({ ...draft, key: index })));
      } else {
        setError(result.message);
      }
    });
  }

  function scan(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clear the input so the same photo can be picked again after a retry.
    event.target.value = "";
    if (!file) return;
    setError(undefined);
    setScanning(true);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("photo", await shrinkImage(file), file.name || "prescription.jpg");
        const result = await scanPrescriptionAction(formData);
        if (result.text) setText(result.text);
        if (result.ok && result.drafts) {
          setDrafts(result.drafts.map((draft, index) => ({ ...draft, key: index })));
        } else {
          setError(result.message);
        }
      } catch {
        setError("The photo could not be sent. Check your connection and try again.");
      } finally {
        setScanning(false);
      }
    });
  }

  function update(key: number, patch: Partial<MedicationDraft>) {
    setDrafts((current) =>
      current ? current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)) : current,
    );
  }

  function save() {
    if (!drafts) return;
    setError(undefined);
    startTransition(async () => {
      const result = await saveImportedMedicationsAction(
        drafts.map(({ name, dosage, instructions, purpose, times }) => ({
          name,
          dosage,
          instructions,
          purpose,
          times,
          days: [0, 1, 2, 3, 4, 5, 6],
          startDate: today,
          endDate: "",
        })),
      );
      if (result.ok) {
        toast.success(result.message ?? "Medicines saved");
        setOpen(false);
        reset();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <ScanText aria-hidden="true" />
        Read a prescription
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{drafts ? "Check what was read" : "Read a prescription"}</DialogTitle>
          <DialogDescription>
            {drafts
              ? "Compare each line with the prescription and fix anything that is wrong. Nothing is saved until you choose Save."
              : "Take a photo of a prescription or medicine label, or type the text. Tend turns it into a schedule for you to check."}
          </DialogDescription>
        </DialogHeader>

        {drafts ? (
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-4">
              {drafts.map((draft, index) => (
                <li key={draft.key} className="well flex flex-col gap-3 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-extrabold">Medicine {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Leave out ${draft.name || `medicine ${index + 1}`}`}
                      onClick={() => setDrafts(drafts.filter((item) => item.key !== draft.key))}
                    >
                      <Trash2 aria-hidden="true" />
                      Leave out
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 font-bold">
                      Name
                      <Input value={draft.name} onChange={(event) => update(draft.key, { name: event.target.value })} />
                    </label>
                    <label className="flex flex-col gap-1 font-bold">
                      Dose
                      <Input value={draft.dosage} onChange={(event) => update(draft.key, { dosage: event.target.value })} />
                    </label>
                    <label className="flex flex-col gap-1 font-bold">
                      Times (24-hour, separated by commas)
                      <Input
                        value={draft.times.join(", ")}
                        onChange={(event) =>
                          update(draft.key, {
                            times: event.target.value.split(",").map((time) => time.trim()).filter(Boolean),
                          })
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 font-bold">
                      How to take it
                      <Input
                        value={draft.instructions}
                        onChange={(event) => update(draft.key, { instructions: event.target.value })}
                      />
                    </label>
                  </div>
                </li>
              ))}
            </ul>
            <FormMessage message={error} />
            <div className="flex flex-wrap gap-3">
              <Button type="button" disabled={pending || drafts.length === 0} onClick={save}>
                {pending ? "Saving…" : `Save ${drafts.length} medicine${drafts.length === 1 ? "" : "s"}`}
              </Button>
              <Button type="button" variant="quiet" disabled={pending} onClick={() => setDrafts(null)}>
                Back to the text
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={scan}
            />
            <Button
              type="button"
              size="lg"
              disabled={pending}
              onClick={() => photoInput.current?.click()}
            >
              <Camera aria-hidden="true" />
              {scanning ? "Reading the photo…" : "Scan with camera"}
            </Button>
            <p className="-mt-2 text-[0.95rem] text-muted-foreground">
              On a computer this lets you choose a photo instead.
            </p>
            <label htmlFor="prescription-text" className="font-bold">
              Or type or paste the text
            </label>
            <Textarea
              id="prescription-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={6}
              maxLength={4000}
              placeholder={EXAMPLE}
            />
            <FormMessage message={error} />
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" disabled={pending || text.trim().length < 10} onClick={read}>
                {pending && !scanning ? "Reading…" : "Read the text"}
              </Button>
              <Button type="button" variant="quiet" disabled={pending} onClick={() => setText(EXAMPLE)}>
                Use an example
              </Button>
            </div>
            <p aria-live="polite" className="text-[0.95rem] text-muted-foreground">
              {scanning
                ? "Reading the photo. This can take up to half a minute."
                : pending
                  ? "Reading the text. This can take a few seconds."
                  : "Read by Adaption AI. Always check the result against the prescription."}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
