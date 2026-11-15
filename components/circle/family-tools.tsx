"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Copy, Eye, EyeOff, NotebookPen, Share2 } from "lucide-react";
import { toast } from "sonner";
import { writeDigestAction } from "@/app/actions/ai";
import {
  changePasscodeAction,
  revealPasscodeAction,
  setNotifyAction,
} from "@/app/actions/circle";
import { Disclosure } from "@/components/circle/disclosure";
import { ReadAloud } from "@/components/circle/read-aloud";
import { FormMessage } from "@/components/form-message";
import { PasscodeField } from "@/components/public/passcode-field";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/hooks/use-form-action";

const HIDDEN_PASSCODE = "••••••";

async function copyText(text: string, success: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(success);
    return true;
  } catch {
    toast.error("Copying is not available here. Write it down instead.");
    return false;
  }
}

/**
 * Everything needed to bring someone into the family: the code, the passcode
 * (fetched only when asked for), a ready-to-send invite, and a way to change
 * the passcode.
 */
export function InviteCard({ code, elderName }: { code: string; elderName: string }) {
  const [passcode, setPasscode] = useState<string>();
  const [visible, setVisible] = useState(false);
  const [needsReset, setNeedsReset] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const changeRef = useRef<HTMLDetailsElement>(null);
  const change = useFormAction(changePasscodeAction, (state) => {
    toast.success(state.message ?? "Passcode changed");
    setPasscode(undefined);
    setVisible(false);
    setNeedsReset(false);
    changeRef.current?.removeAttribute("open");
  });
  const changeErrors = change.state.fieldErrors ?? {};

  async function loadPasscode(): Promise<string | undefined> {
    if (passcode) return passcode;
    const result = await revealPasscodeAction();
    if (result.ok) {
      setPasscode(result.passcode);
      return result.passcode;
    }
    if (result.needsReset) {
      setNeedsReset(true);
      changeRef.current?.setAttribute("open", "");
    } else {
      toast.error(result.message);
    }
    return undefined;
  }

  function toggleVisible() {
    if (visible) {
      setVisible(false);
      return;
    }
    startTransition(async () => {
      if (await loadPasscode()) setVisible(true);
    });
  }

  async function copyCode() {
    if (await copyText(code, "Family code copied")) setCopied(true);
  }

  function shareInvite() {
    startTransition(async () => {
      const secret = await loadPasscode();
      if (!secret) return;
      const link = `${window.location.origin}/join?code=${encodeURIComponent(code)}`;
      const text = `Join ${elderName}'s family on Tend.\nOpen ${link}\nFamily code: ${code}\nPasscode: ${secret}`;
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title: "Join our family on Tend", text });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }
      await copyText(text, "Invite copied. Paste it into a message.");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="font-bold text-muted-foreground">Family code</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-3">
            <span className="well rounded-xl px-4 py-2 text-2xl font-extrabold tracking-wider">
              {code}
            </span>
            <Button type="button" variant="quiet" size="icon" onClick={copyCode} aria-label="Copy the family code">
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            </Button>
          </dd>
        </div>
        <div>
          <dt className="font-bold text-muted-foreground">Passcode</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-3">
            <span
              aria-live="polite"
              className="well rounded-xl px-4 py-2 text-2xl font-extrabold tracking-[0.3em] tabular-nums"
            >
              {visible && passcode ? passcode : (
                <>
                  <span aria-hidden="true">{HIDDEN_PASSCODE}</span>
                  <span className="sr-only">Hidden</span>
                </>
              )}
            </span>
            <Button
              type="button"
              variant="quiet"
              onClick={toggleVisible}
              disabled={pending}
              aria-pressed={visible}
            >
              {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              {visible ? "Hide" : "Show"}
            </Button>
          </dd>
        </div>
      </dl>

      {needsReset ? (
        <p role="status" className="rounded-xl bg-amber-soft p-3 font-bold">
          This family was set up before passcodes could be shown. Choose a new one below.
        </p>
      ) : null}

      <Button type="button" size="lg" onClick={shareInvite} disabled={pending} className="self-start">
        <Share2 aria-hidden="true" />
        Send an invite
      </Button>

      <Disclosure ref={changeRef} summary="Change the passcode">
        <form onSubmit={change.onSubmit} noValidate className="flex flex-col gap-4">
          <PasscodeField
            label="New 6-digit passcode"
            hint="Everyone who joins from now on needs the new passcode. People already signed in stay signed in."
            error={changeErrors.passcode}
            autoComplete="new-password"
          />
          <FormMessage message={change.state.ok ? undefined : change.state.message} />
          <Button type="submit" variant="outline" disabled={change.pending} className="self-start">
            {change.pending ? "Saving…" : "Save the new passcode"}
          </Button>
        </form>
      </Disclosure>
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
