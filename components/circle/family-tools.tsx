"use client";

import { useState, useTransition } from "react";
import { BellRing, Check, Copy, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { writeDigestAction } from "@/app/actions/ai";
import { runRemindersNowAction, setNotifyAction } from "@/app/actions/circle";
import { ReadAloud } from "@/components/circle/read-aloud";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";

/** Shows the circle code with a copy button. */
export function CircleCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Circle code copied");
    } catch {
      toast.error("Copying is not available. Write the code down instead.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <p className="well rounded-xl px-5 py-3 text-3xl font-extrabold tracking-wider">{code}</p>
      <Button type="button" variant="outline" onClick={copy}>
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? "Copied" : "Copy the code"}
      </Button>
    </div>
  );
}

/** Lets the signed-in member turn their own email reminders on or off. */
export function NotifyToggle({ enabled, hasEmail }: { enabled: boolean; hasEmail: boolean }) {
  const [pending, startTransition] = useTransition();

  function toggle(next: boolean) {
    startTransition(async () => {
      const result = await setNotifyAction(next);
      if (result.ok) toast.success(result.message ?? "Saved");
      else toast.error(result.message ?? "That did not work. Try again.");
    });
  }

  if (!hasEmail) {
    return (
      <p className="text-muted-foreground">
        You joined without an email address, so reminders cannot reach you. Join again with your
        email to receive them.
      </p>
    );
  }

  return (
    <label className="flex w-fit cursor-pointer items-center gap-3 text-lg font-bold">
      <input
        type="checkbox"
        checked={enabled}
        disabled={pending}
        onChange={(event) => toggle(event.target.checked)}
        className="size-6 accent-primary"
      />
      Email me reminders and missed-dose alerts
    </label>
  );
}

/** Runs the reminder check on demand instead of waiting for the schedule. */
export function RunRemindersButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();

  function run() {
    startTransition(async () => {
      const result = await runRemindersNowAction();
      setMessage(result.message);
      if (!result.ok) toast.error(result.message ?? "The check failed. Try again.");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Button type="button" variant="outline" disabled={pending} onClick={run} className="self-start">
        <BellRing aria-hidden="true" />
        {pending ? "Checking…" : "Check for reminders now"}
      </Button>
      <p role="status" className="text-muted-foreground">
        {message}
      </p>
    </div>
  );
}

/** Asks Adaption to write this week's short update for the family. */
export function WeeklyDigest() {
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState<string>();
  const [error, setError] = useState<string>();

  function write() {
    setError(undefined);
    startTransition(async () => {
      const result = await writeDigestAction();
      if (result.ok) setText(result.text);
      else setError(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div aria-live="polite">
        {text ? <p className="well whitespace-pre-wrap rounded-xl p-4 text-lg">{text}</p> : null}
      </div>
      <FormMessage message={error} />
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" disabled={pending} onClick={write}>
          <NotebookPen aria-hidden="true" />
          {pending ? "Writing…" : text ? "Write it again" : "Write this week's update"}
        </Button>
        {text ? <ReadAloud variant="quiet" text={text} label="Read the update aloud" /> : null}
      </div>
    </div>
  );
}
