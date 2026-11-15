"use client";

import { useState } from "react";
import { joinCircleAction } from "@/app/actions/auth";
import { FormMessage } from "@/components/form-message";
import { PasscodeField } from "@/components/public/passcode-field";
import { RolePicker } from "@/components/public/role-picker";
import { Button } from "@/components/ui/button";
import { Field, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";
import type { Role } from "@/lib/types";

const CODE_HINT = "It looks like MAPLE-4821. Whoever set up the circle can tell you.";
const EMAIL_HINT = "Use the same email each time so we recognise you. You can leave it empty.";

export function JoinForm({ defaultCode }: { defaultCode?: string }) {
  const [role, setRole] = useState<Role>("family");
  const { state, pending, onSubmit } = useFormAction(joinCircleAction);
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <Field htmlFor="code" label="Circle code" hint={CODE_HINT} error={errors.code}>
        <Input
          id="code"
          name="code"
          required
          defaultValue={defaultCode}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={errors.code ? true : undefined}
          aria-describedby={describedBy("code", CODE_HINT, errors.code)}
          className="max-w-72 text-xl font-bold uppercase tracking-wider"
        />
      </Field>
      <PasscodeField
        label="Passcode"
        hint="The 6 digits chosen when the circle was set up."
        error={errors.passcode}
        autoComplete="current-password"
        autoFocus={Boolean(defaultCode)}
      />
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
      <RolePicker legend="Who are you in this circle?" value={role} onChange={setRole} />

      <FormMessage message={state.ok ? undefined : state.message} />
      <Button type="submit" size="lg" disabled={pending} className="self-start">
        {pending ? "Opening the circle…" : "Open the care circle"}
      </Button>
    </form>
  );
}
