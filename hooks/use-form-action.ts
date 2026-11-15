"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { ActionState } from "@/lib/types";

type FormAction = (previous: ActionState, formData: FormData) => Promise<ActionState>;

const INITIAL: ActionState = { ok: false };

/**
 * Submits a form to a server action without clearing what the person typed
 * when validation fails, and reports the result through `onSuccess`.
 */
export function useFormAction(action: FormAction, onSuccess?: (state: ActionState) => void) {
  const [state, setState] = useState<ActionState>(INITIAL);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await action(INITIAL, formData);
      // A redirecting action never returns; guard for that case.
      if (!result) return;
      setState(result);
      if (result.ok) onSuccess?.(result);
    });
  }

  return { state, pending, onSubmit };
}
