/** Formats an instant as a readable date and time in a time zone. */
export function formatDateTime(iso: string, timeZone: string, locale = "en-IN"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Formats a `YYYY-MM-DD` date as, for example, "Sunday, 15 November". */
export function formatLongDate(date: string, locale = "en-IN"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** Short weekday name ("Mon") for a `YYYY-MM-DD` date. */
export function formatWeekday(date: string, locale = "en-IN"): string {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

/** "just now", "5 minutes ago", "yesterday" style description of a past instant. */
export function formatRelative(iso: string, now: Date): string {
  const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function compact(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, "");
}

/** Builds a prefilled "Add to Google Calendar" link for an appointment. */
export function googleCalendarUrl(event: {
  title: string;
  startsAt: string;
  durationMinutes?: number;
  location?: string;
  details?: string;
}): string {
  const start = new Date(event.startsAt);
  const end = new Date(start.getTime() + (event.durationMinutes ?? 45) * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${compact(start.toISOString())}/${compact(end.toISOString())}`,
  });
  if (event.location) params.set("location", event.location);
  if (event.details) params.set("details", event.details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
