import type { Metadata } from "next";
import Link from "next/link";
import { Activity } from "lucide-react";
import { HealthActions } from "@/components/circle/health-actions";
import { buttonVariants } from "@/components/ui/button";
import { listReadings } from "@/lib/data";
import {
  KIND_LABELS,
  READING_KINDS,
  assessReading,
  displayReading,
  latestByKind,
  type ReadingLevel,
} from "@/lib/device/readings";
import { formatDateTime } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { loadCircle } from "@/lib/snapshot";

export const metadata: Metadata = { title: "Health readings" };

const LEVEL_STYLES: Record<ReadingLevel, string> = {
  ok: "bg-leaf-soft",
  watch: "bg-amber-soft",
  alert: "bg-alarm-soft text-destructive",
};

export default async function HealthPage() {
  const session = await requireSession();
  const [circle, readings] = await Promise.all([
    loadCircle(session.circleId),
    listReadings(session.circleId, 40),
  ]);
  const latest = latestByKind(readings);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[40rem]">
          <h1 className="text-4xl font-extrabold">Health readings</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Readings {circle.elder_name} takes appear here for the whole circle. Use the Tend Home
            Station, or type a reading in yourself. In this prototype the device is a simulation.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto">
          <Link href="/device" className={buttonVariants({ size: "lg" })}>
            <Activity aria-hidden="true" />
            Open the Tend device
          </Link>
          <HealthActions />
        </div>
      </div>

      <section aria-labelledby="latest-heading">
        <h2 id="latest-heading" className="text-2xl font-extrabold">
          Latest
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {READING_KINDS.map((kind) => {
            const reading = latest[kind];
            const shown = reading ? displayReading(reading) : null;
            const assessment = reading ? assessReading(reading) : null;
            return (
              <li key={kind} className="flex flex-col gap-1 rounded-2xl border-2 border-border bg-card p-5">
                <h3 className="font-extrabold">{KIND_LABELS[kind]}</h3>
                {reading && shown && assessment ? (
                  <>
                    <p className="text-4xl font-extrabold tabular-nums">
                      {shown.value} <span className="text-lg font-bold text-muted-foreground">{shown.unit}</span>
                    </p>
                    {shown.detail ? <p>{shown.detail}</p> : null}
                    <p className={`mt-1 rounded-lg px-3 py-1.5 font-bold ${LEVEL_STYLES[assessment.level]}`}>
                      {assessment.message}
                    </p>
                    <p className="mt-1 text-[0.95rem] text-muted-foreground">
                      {formatDateTime(reading.taken_at, circle.timezone)}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">No reading yet.</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="text-2xl font-extrabold">
          Recent readings
        </h2>
        {readings.length === 0 ? (
          <p className="mt-3 text-lg text-muted-foreground">
            Nothing has been recorded yet. Open the Tend device and press Save, or enter a reading above.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {readings.map((reading) => {
              const shown = displayReading(reading);
              return (
                <li
                  key={reading.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl border-2 border-border bg-card px-5 py-3"
                >
                  <p>
                    <span className="font-extrabold">{KIND_LABELS[reading.kind]}: </span>
                    <span className="font-bold tabular-nums">
                      {shown.value} {shown.unit}
                    </span>
                    {shown.detail ? <span className="text-muted-foreground">, {shown.detail.toLowerCase()}</span> : null}
                  </p>
                  <p className="text-[0.95rem] text-muted-foreground">
                    {formatDateTime(reading.taken_at, circle.timezone)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 text-[0.95rem] text-muted-foreground">
          These notes are general guidance, not a diagnosis. Share worrying readings with a doctor.
        </p>
      </section>
    </div>
  );
}
