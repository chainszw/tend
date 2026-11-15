import { Check, Minus } from "lucide-react";
import type { AdherenceSummary, DayAdherence } from "@/lib/adherence";
import { formatLongDate, formatWeekday } from "@/lib/format";

function describe(day: DayAdherence): string {
  if (day.expected === 0) return "no doses due";
  return `${day.taken} of ${day.expected} doses taken`;
}

/** The last seven days as a row of pill-box lids, filled by how much was taken. */
export function WeekStrip({ summary, today }: { summary: AdherenceSummary; today: string }) {
  const headline =
    summary.percent === null
      ? "No doses were due in the last 7 days."
      : `${summary.taken} of ${summary.expected} doses taken in the last 7 days (${summary.percent}%).`;

  return (
    <section aria-labelledby="week-heading" className="rounded-2xl border-2 border-border bg-card p-5">
      <h2 id="week-heading" className="text-2xl font-extrabold">
        This week
      </h2>
      <p className="mt-1 text-muted-foreground">
        {headline}
        {summary.streak > 1 ? ` ${summary.streak} days in a row with every dose taken.` : ""}
      </p>
      <ol className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-3">
        {summary.days.map((day) => {
          const ratio = day.expected === 0 ? 0 : day.taken / day.expected;
          const complete = day.expected > 0 && day.taken === day.expected;
          return (
            <li key={day.date} className="flex flex-col items-center gap-1.5">
              <span
                className={`text-[0.85rem] font-bold ${day.date === today ? "text-primary" : "text-muted-foreground"}`}
              >
                <span aria-hidden="true">{day.date === today ? "Today" : formatWeekday(day.date)}</span>
                <span className="sr-only">
                  {formatLongDate(day.date)}: {describe(day)}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="well relative flex aspect-square w-full max-w-20 items-center justify-center overflow-hidden rounded-xl"
              >
                <span
                  className="absolute inset-x-0 bottom-0 bg-primary"
                  style={{ height: `${Math.round(ratio * 100)}%` }}
                />
                <span
                  className={`relative text-[0.9rem] font-extrabold ${ratio >= 0.5 ? "text-primary-foreground" : "text-foreground"}`}
                >
                  {day.expected === 0 ? (
                    <Minus className="size-5" />
                  ) : complete ? (
                    <Check className="size-6" strokeWidth={3} />
                  ) : (
                    `${day.taken}/${day.expected}`
                  )}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
