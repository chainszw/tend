import type { Metadata } from "next";
import Link from "next/link";
import {
  AlarmClock,
  CalendarDays,
  CircleCheck,
  TriangleAlert,
} from "lucide-react";
import { DoseCard } from "@/components/circle/dose-card";
import { ReadAloud } from "@/components/circle/read-aloud";
import { WeekStrip } from "@/components/circle/week-strip";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime, formatLongDate } from "@/lib/format";
import { dateLocale, messages, type Messages } from "@/lib/i18n";
import { pageLanguage } from "@/lib/i18n-server";
import { DAY_PARTS, dayPartOf, localTimeString } from "@/lib/schedule";
import { requireSession } from "@/lib/session";
import { loadSnapshot, type CareSnapshot } from "@/lib/snapshot";
import { spokenDaySummary } from "@/lib/speech";

export const metadata: Metadata = { title: "Today" };

function StatusBanner({
  slots,
  t,
}: {
  slots: CareSnapshot["slots"];
  t: Messages;
}) {
  const due = slots.filter((slot) => slot.status === "due");
  const missed = slots.filter((slot) => slot.status === "missed");
  if (missed.length > 0) {
    return (
      <p className="flex items-start gap-3 rounded-2xl bg-alarm-soft p-4 text-lg font-bold text-destructive">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
        {missed.length === 1
          ? t.missedOne(missed[0].med.name)
          : t.missedMany(missed.length)}
      </p>
    );
  }
  if (due.length > 0) {
    return (
      <p className="flex items-start gap-3 rounded-2xl bg-amber-soft p-4 text-lg font-bold">
        <AlarmClock aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
        {due.length === 1 ? t.dueOne(due[0].med.name) : t.dueMany(due.length)}
      </p>
    );
  }
  const done = slots.every(
    (slot) => slot.status === "taken" || slot.status === "skipped",
  );
  return (
    <p className="flex items-start gap-3 rounded-2xl bg-leaf-soft p-4 text-lg font-bold text-primary">
      <CircleCheck aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
      {done ? t.allDone : t.nothingDue}
    </p>
  );
}

export default async function TodayPage() {
  const session = await requireSession();
  const [snapshot, lang] = await Promise.all([
    loadSnapshot(session.circleId),
    pageLanguage(),
  ]);
  const t = messages(lang);
  const locale = dateLocale(lang);
  const { circle, slots, today, now } = snapshot;
  const isElder = session.role === "elder";
  const hour = Number(localTimeString(now, circle.timezone).slice(0, 2));
  const dateLabel = formatLongDate(today, locale);
  const nextVisit = snapshot.appointments[0];

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold">
            {isElder
              ? t.greeting(hour, session.name)
              : t.eldersDay(circle.elder_name)}
          </h1>
          <p className="mt-1 text-xl text-muted-foreground">{dateLabel}</p>
        </div>
        <ReadAloud
          text={spokenDaySummary(dateLabel, slots, lang)}
          label={t.readMyDay}
        />
      </div>

      {slots.length === 0 ? (
        <section className="rounded-2xl border-2 border-dashed border-input bg-card p-8">
          <h2 className="text-2xl font-extrabold">{t.noMedsTitle}</h2>
          <p className="mt-2 max-w-[38rem] text-muted-foreground">
            {t.noMedsBody}
          </p>
          <Link
            href="/circle/medications"
            className={buttonVariants({ className: "mt-5" })}
          >
            {t.addMedicines}
          </Link>
        </section>
      ) : (
        <>
          <div role="status">
            <StatusBanner slots={slots} t={t} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {DAY_PARTS.map((part) => {
              const doses = slots.filter(
                (slot) => dayPartOf(slot.time) === part,
              );
              return (
                <section
                  key={part}
                  aria-labelledby={`part-${part}`}
                  className="well flex flex-col gap-3 rounded-2xl p-3"
                >
                  <h2
                    id={`part-${part}`}
                    className="px-1 pt-1 text-xl font-extrabold"
                  >
                    {t.dayParts[part]}
                  </h2>
                  {doses.length === 0 ? (
                    <p className="px-1 pb-2 text-muted-foreground">
                      {t.nothingScheduled}
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {doses.map((slot) => (
                        <DoseCard
                          key={`${slot.med.id}-${slot.time}`}
                          medicationId={slot.med.id}
                          scheduledFor={slot.instant.toISOString()}
                          time={slot.time}
                          name={slot.med.name}
                          dosage={slot.med.dosage}
                          instructions={slot.med.instructions}
                          status={slot.status}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <WeekStrip summary={snapshot.adherence} today={today} lang={lang} />
        <section
          aria-labelledby="visit-heading"
          className="rounded-2xl border-2 border-border bg-card p-5"
        >
          <h2 id="visit-heading" className="text-2xl font-extrabold">
            {t.nextVisit}
          </h2>
          {nextVisit ? (
            <>
              <p className="mt-3 flex items-start gap-2 text-lg font-bold">
                <CalendarDays
                  aria-hidden="true"
                  className="mt-0.5 size-6 shrink-0 text-primary"
                />
                {formatDateTime(nextVisit.starts_at, circle.timezone, locale)}
              </p>
              <p className="mt-1 text-muted-foreground">
                {[nextVisit.doctor, nextVisit.specialty, nextVisit.location]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </>
          ) : (
            <p className="mt-3 text-muted-foreground">{t.noVisits}</p>
          )}
          <Link
            href="/circle/appointments"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "mt-4",
            })}
          >
            {nextVisit ? t.seeAllVisits : t.addVisit}
          </Link>
        </section>
      </div>
    </div>
  );
}
