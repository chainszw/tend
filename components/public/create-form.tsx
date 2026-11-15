"use client";

import { useState, useSyncExternalStore } from "react";
import { createCircleAction } from "@/app/actions/auth";
import { FormMessage } from "@/components/form-message";
import { PasscodeField } from "@/components/public/passcode-field";
import { RolePicker } from "@/components/public/role-picker";
import { Button } from "@/components/ui/button";
import { Field, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";
import type { Role } from "@/lib/types";

const EMAIL_HINT = "Reminders are sent here. You can leave it empty.";
const ELDER_EMAIL_HINT = "So they get their own medicine reminders. You can leave it empty.";

const subscribeNever = () => () => {};
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverTimeZone = () => "UTC";

export function CreateForm() {
  const [role, setRole] = useState<Role>("family");
  const { state, pending, onSubmit } = useFormAction(createCircleAction);
  const errors = state.fieldErrors ?? {};
  // Reminder times follow the time zone of the device that sets up the circle.
  const timezone = useSyncExternalStore(subscribeNever, browserTimeZone, serverTimeZone);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="timezone" value={timezone} />
      <RolePicker legend="Who are you setting this up for?" value={role} onChange={setRole} />

      <Field htmlFor="yourName" label="Your name" error={errors.yourName}>
        <Input
          id="yourName"
          name="yourName"
          autoComplete="name"
          required
          aria-invalid={errors.yourName ? true : undefined}
          aria-describedby={describedBy("yourName", undefined, errors.yourName)}
        />
      </Field>
      <Field htmlFor="yourEmail" label="Your email" hint={EMAIL_HINT} error={errors.yourEmail}>
        <Input
          id="yourEmail"
          name="yourEmail"
          type="email"
          autoComplete="email"
          aria-invalid={errors.yourEmail ? true : undefined}
          aria-describedby={describedBy("yourEmail", EMAIL_HINT, errors.yourEmail)}
        />
      </Field>

      {role === "elder" ? (
        <input type="hidden" name="elderName" value="self" />
      ) : (
        <>
          <Field
            htmlFor="elderName"
            label="Name of the person you care for"
            error={errors.elderName}
          >
            <Input
              id="elderName"
              name="elderName"
              required
              aria-invalid={errors.elderName ? true : undefined}
              aria-describedby={describedBy("elderName", undefined, errors.elderName)}
            />
          </Field>
          <Field
            htmlFor="elderEmail"
            label="Their email"
            hint={ELDER_EMAIL_HINT}
            error={errors.elderEmail}
          >
            <Input
              id="elderEmail"
              name="elderEmail"
              type="email"
              aria-invalid={errors.elderEmail ? true : undefined}
              aria-describedby={describedBy("elderEmail", ELDER_EMAIL_HINT, errors.elderEmail)}
            />
          </Field>
        </>
      )}

      <PasscodeField
        label="Choose a 6-digit passcode"
        hint="Everyone in the circle uses this passcode to get in. Share it only with people you trust."
        error={errors.passcode}
        autoComplete="new-password"
      />

      <FormMessage message={state.ok ? undefined : state.message} />
      <Button type="submit" size="lg" disabled={pending} className="self-start">
        {pending ? "Creating the circle…" : "Create the care circle"}
      </Button>
    </form>
  );
}
