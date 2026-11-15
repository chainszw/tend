import { DEVICE_PARTS, formatInr, partsTotal } from "@/lib/device/parts";

/** The parts list shown beside the opened-up device: what each part is made of and why. */
export function InsidePanel() {
  return (
    <section aria-labelledby="inside-heading" className="rounded-2xl border-2 border-border bg-card p-5">
      <h2 id="inside-heading" className="text-2xl font-extrabold">
        What is inside, and why
      </h2>
      <p className="mt-2 max-w-[48rem] text-muted-foreground">
        Every part is a common, low-cost component that is easy to source in India. The numbers
        match the labels on the opened device above. Costs are rough estimates for a concept
        design, not a quote: this device has not been manufactured or clinically tested.
      </p>
      <ol className="mt-5 grid gap-3 md:grid-cols-2">
        {DEVICE_PARTS.map((part, index) => (
          <li key={part.id} className="well flex gap-3 rounded-xl p-4">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-extrabold text-primary-foreground"
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h3 className="text-lg font-extrabold">
                  {part.name}
                  {part.optional ? <span className="font-bold text-muted-foreground"> (optional)</span> : null}
                </h3>
                <p className="font-bold tabular-nums">about {formatInr(part.costInr)}</p>
              </div>
              <p className="text-[0.95rem] text-muted-foreground">
                {part.where === "main unit" ? "Inside the main unit" : "Separate accessory"}
              </p>
              <p className="mt-1.5">
                <span className="font-bold">Made of: </span>
                {part.material}.
              </p>
              <p className="mt-1">
                <span className="font-bold">What it does: </span>
                {part.role}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-leaf-soft p-4">
          <dt className="font-bold">Estimated parts cost, station with cuff, finger clip and thermometer</dt>
          <dd className="text-3xl font-extrabold tabular-nums">about {formatInr(partsTotal(DEVICE_PARTS, false))}</dd>
        </div>
        <div className="rounded-xl bg-amber-soft p-4">
          <dt className="font-bold">With the optional weighing scale</dt>
          <dd className="text-3xl font-extrabold tabular-nums">about {formatInr(partsTotal(DEVICE_PARTS, true))}</dd>
        </div>
      </dl>
    </section>
  );
}
