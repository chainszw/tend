import type { Metadata } from "next";
import { CalendarPlus, MapPin } from "lucide-react";
import {
  AddAppointmentButton,
  AppointmentControls,
} from "@/components/circle/appointment-controls";
import { ReadAloud } from "@/components/circle/read-aloud";
import { buttonVariants } from "@/components/ui/button";
import { listAppointments } from "@/lib/data";
import { formatDateTime, googleCalendarUrl } from "@/lib/format";
import { localDateString, localTimeString } from "@/lib/schedule";
import { requireSession } from "@/lib/session";
import { loadCircle } from "@/lib/snapshot";
import type { Appointment } from "@/lib/types";

export const metadata: Metadata = { title: "Doctor visits" };

interface VisitItemProps {
  appointment: Appointment;
  timeZone: string;
  today: string;
  upcoming: boolean;
  elderName: string;
}

function VisitItem({ appointment, timeZone, today, upcoming, elderName }: VisitItemProps) {
  const start = new Date(appointment.starts_at);
  const who = appointment.specialty
    ? `${appointment.doctor} (${appointment.specialty})`
    : appointment.doctor;
  const calendarUrl = googleCalendarUrl({
    title: `${elderName}: visit with ${appointment.doctor}`,
    startsAt: appointment.starts_at,
    location: appointment.location,
    details: [appointment.notes, ...appointment.prep_questions.map((q) => `• ${q}`)]
      .filter(Boolean)
      .join("\n"),
  });

  return (
    <li className="flex flex-col gap-4 rounded-2xl border-2 border-border bg-card p-5">
      <div>
        <h3 className="text-2xl font-extrabold">{formatDateTime(appointment.starts_at, timeZone)}</h3>
        <p className="text-lg">{who}</p>
        {appointment.location ? (
          <p className="mt-1 flex items-start gap-2 text-muted-foreground">
            <MapPin aria-hidden="true" className="mt-1 size-5 shrink-0" />
            {appointment.location}
          </p>
        ) : null}
        {appointment.notes ? <p className="mt-2">{appointment.notes}</p> : null}
      </div>

      {appointment.prep_questions.length > 0 ? (
        <div className="well rounded-xl p-4">
          <h4 className="font-extrabold">Questions to ask the doctor</h4>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-6">
            {appointment.prep_questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
          <div className="mt-3">
            <ReadAloud
              variant="quiet"
              label="Read the questions aloud"
              text={appointment.prep_questions.join(" ")}
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {upcoming ? (
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <CalendarPlus aria-hidden="true" />
            Add to Google Calendar
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
      </div>
      <AppointmentControls
        appointment={{
          id: appointment.id,
          doctor: appointment.doctor,
          specialty: appointment.specialty,
          location: appointment.location,
          notes: appointment.notes,
          date: localDateString(start, timeZone),
          time: localTimeString(start, timeZone),
        }}
        today={today}
        hasQuestions={appointment.prep_questions.length > 0}
        upcoming={upcoming}
      />
    </li>
  );
}

export default async function AppointmentsPage() {
  const session = await requireSession();
  const [circle, appointments] = await Promise.all([
    loadCircle(session.circleId),
    listAppointments(session.circleId),
  ]);
  const now = new Date();
  const today = localDateString(now, circle.timezone);
  const upcoming = appointments.filter((appointment) => new Date(appointment.starts_at) >= now);
  const past = appointments.filter((appointment) => new Date(appointment.starts_at) < now).reverse();
  const shared = { timeZone: circle.timezone, today, elderName: circle.elder_name };

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold">Doctor visits</h1>
          <p className="mt-1 text-xl text-muted-foreground">
            Upcoming appointments for {circle.elder_name}.
          </p>
        </div>
        <AddAppointmentButton today={today} />
      </div>

      <section aria-labelledby="upcoming-heading" className="flex flex-col gap-4">
        <h2 id="upcoming-heading" className="text-2xl font-extrabold">
          Coming up
        </h2>
        {upcoming.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-input bg-card p-6 text-muted-foreground">
            No visits are booked. Choose “Add a visit” when the next one is arranged.
          </p>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {upcoming.map((appointment) => (
              <VisitItem key={appointment.id} appointment={appointment} upcoming {...shared} />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 ? (
        <section aria-labelledby="past-heading" className="flex flex-col gap-4">
          <h2 id="past-heading" className="text-2xl font-extrabold">
            Earlier visits
          </h2>
          <ul className="grid gap-4 lg:grid-cols-2">
            {past.slice(0, 6).map((appointment) => (
              <VisitItem key={appointment.id} appointment={appointment} upcoming={false} {...shared} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
