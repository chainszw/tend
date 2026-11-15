import type { Metadata } from "next";
import { AddMedicationButton, MedicationControls } from "@/components/circle/medication-dialogs";
import { PrescriptionImport } from "@/components/circle/prescription-import";
import { listMedications } from "@/lib/data";
import { describeDays, formatTime, localDateString } from "@/lib/schedule";
import { requireSession } from "@/lib/session";
import { loadCircle } from "@/lib/snapshot";
import type { Medication } from "@/lib/types";

export const metadata: Metadata = { title: "Medicines" };

function MedicationItem({ medication, today }: { medication: Medication; today: string }) {
  return (
    <li
      className={`flex flex-col gap-4 rounded-2xl border-2 bg-card p-5 ${medication.active ? "border-border" : "border-dashed border-input"}`}
    >
      <div>
        <h3 className="text-2xl font-extrabold">
          {medication.name}
          {medication.active ? null : (
            <span className="ml-3 rounded-full bg-well px-3 py-1 align-middle text-[0.9rem] font-bold">
              Paused
            </span>
          )}
        </h3>
        {medication.dosage ? <p className="text-lg text-muted-foreground">{medication.dosage}</p> : null}
      </div>
      <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
        <div>
          <dt className="font-bold">Times</dt>
          <dd>{medication.times.map(formatTime).join(", ")}</dd>
        </div>
        <div>
          <dt className="font-bold">Days</dt>
          <dd>{describeDays(medication.days)}</dd>
        </div>
        {medication.instructions ? (
          <div>
            <dt className="font-bold">How to take it</dt>
            <dd>{medication.instructions}</dd>
          </div>
        ) : null}
        {medication.purpose ? (
          <div>
            <dt className="font-bold">What it is for</dt>
            <dd>{medication.purpose}</dd>
          </div>
        ) : null}
      </dl>
      <MedicationControls medication={medication} today={today} />
    </li>
  );
}

export default async function MedicationsPage() {
  const session = await requireSession();
  const [circle, medications] = await Promise.all([
    loadCircle(session.circleId),
    listMedications(session.circleId),
  ]);
  const today = localDateString(new Date(), circle.timezone);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold">Medicines</h1>
          <p className="mt-1 text-xl text-muted-foreground">
            Everything {circle.elder_name} takes, and when.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <PrescriptionImport today={today} />
          <AddMedicationButton today={today} />
        </div>
      </div>

      {medications.length === 0 ? (
        <section className="rounded-2xl border-2 border-dashed border-input bg-card p-8">
          <h2 className="text-2xl font-extrabold">No medicines yet</h2>
          <p className="mt-2 max-w-[38rem] text-muted-foreground">
            Choose “Read a prescription” to paste the text from a prescription, or “Add a
            medicine” to type one in.
          </p>
        </section>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {medications.map((medication) => (
            <MedicationItem key={medication.id} medication={medication} today={today} />
          ))}
        </ul>
      )}
    </div>
  );
}
