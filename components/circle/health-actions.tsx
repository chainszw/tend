"use client";

import { useState } from "react";
import { PencilLine, Watch } from "lucide-react";
import { ManualReadingForm } from "@/components/circle/manual-reading-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Two secondary actions for the Health page, each opening a dialog. */
export function HealthActions() {
  const [manualOpen, setManualOpen] = useState(false);
  const [watchOpen, setWatchOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="lg" onClick={() => setManualOpen(true)}>
        <PencilLine aria-hidden="true" />
        Enter a reading yourself
      </Button>
      <Button type="button" variant="quiet" size="lg" onClick={() => setWatchOpen(true)}>
        <Watch aria-hidden="true" />
        Smart watch
        <span className="rounded-full bg-amber-soft px-2.5 py-0.5 text-sm font-bold">Coming soon</span>
      </Button>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold">Enter a reading yourself</DialogTitle>
            <DialogDescription>
              Measured with your own blood pressure machine, oximeter, thermometer or scale? Type it in.
            </DialogDescription>
          </DialogHeader>
          <ManualReadingForm onSaved={() => setManualOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={watchOpen} onOpenChange={setWatchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold">Smart watch — coming soon</DialogTitle>
            <DialogDescription>
              In future, heart rate and other readings will arrive straight from a smart watch, with
              nothing to type. This is not available yet.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
