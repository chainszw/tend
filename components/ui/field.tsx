import * as React from "react";
import { cn } from "cn";

interface FieldProps {
  /** id of the control this field labels. */
  htmlFor: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

/** ids to pass to a control's aria-describedby for this field. */
export function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

/** A labelled form field with an optional hint and an announced error. */
export function Field({ htmlFor, label, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="font-bold">
        {label}
      </label>
      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-[0.95rem] text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="font-bold text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
