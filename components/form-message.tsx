import { CircleAlert } from "lucide-react";

/** Announces a form-level error to sighted and screen-reader users alike. */
export function FormMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl bg-alarm-soft px-4 py-3 font-bold text-destructive"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      {message}
    </p>
  );
}
