"use client";

import { useState } from "react";
import { Field, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface PasscodeFieldProps {
  label: string;
  hint: string;
  error?: string;
  autoComplete: "new-password" | "current-password";
  autoFocus?: boolean;
}

/** Six-digit passcode input with a show/hide option for easier typing. */
export function PasscodeField({ label, hint, error, autoComplete, autoFocus }: PasscodeFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Field htmlFor="passcode" label={label} hint={hint} error={error}>
      <Input
        id="passcode"
        name="passcode"
        type={visible ? "text" : "password"}
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        required
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy("passcode", hint, error)}
        className="max-w-56 text-2xl font-bold tracking-[0.3em]"
      />
      <label className="mt-1 flex w-fit cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={visible}
          onChange={(event) => setVisible(event.target.checked)}
          className="size-5 accent-primary"
        />
        Show the passcode
      </label>
    </Field>
  );
}
