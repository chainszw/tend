"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { SendHorizontal, X } from "lucide-react";
import { askCompanionAction } from "@/app/actions/ai";
import { ReadAloud } from "@/components/circle/read-aloud";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { LanguageSelect } from "@/components/voice/language-select";
import { MicButton } from "@/components/voice/mic-button";
import { useListening } from "@/components/voice/use-listening";
import { setVoicePreferences, speakText, stopSpeaking, useVoicePreferences } from "@/components/voice/voice-store";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY = 12;
const MAX_QUESTION = 2000;
const speechIdFor = (messageId: number) => `companion-answer-${messageId}`;

/** Chat with the Care Companion. Answers are announced to screen readers. */
export function CompanionChat({ suggestions }: { suggestions: string[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const nextId = useRef(0);
  const { language, autoRead } = useVoicePreferences();

  // What was heard goes into the question box to be checked and corrected. It is never sent by itself.
  const addHeard = useCallback((transcript: string) => {
    setDraft((current) => `${current.trimEnd()} ${transcript}`.trim().slice(0, MAX_QUESTION));
  }, []);
  const mic = useListening(addHeard);

  // Leaving the page stops any answer that is still being read.
  useEffect(() => stopSpeaking, []);

  function ask(question: string) {
    const content = question.trim();
    if (!content || pending) return;
    setError(undefined);
    setDraft("");
    mic.cancel();
    stopSpeaking();
    nextId.current += 1;
    const history = [...messages, { id: nextId.current, role: "user" as const, content }];
    setMessages(history);
    startTransition(async () => {
      const result = await askCompanionAction(
        history.slice(-MAX_HISTORY).map(({ role, content: text }) => ({ role, content: text })),
        language,
      );
      if (result.ok && result.reply) {
        nextId.current += 1;
        setMessages([...history, { id: nextId.current, role: "assistant", content: result.reply }]);
        // Only the new answer is read, never the whole conversation again.
        if (autoRead) speakText(speechIdFor(nextId.current), result.reply, language);
      } else {
        setError(result.message ?? "The Companion could not answer. Try again.");
      }
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(draft);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border-2 border-border bg-card px-4 py-3">
        <LanguageSelect />
        <label className="flex min-h-12 cursor-pointer items-center gap-3 text-lg font-bold">
          <input
            type="checkbox"
            checked={autoRead}
            onChange={(event) => {
              if (!event.target.checked) stopSpeaking();
              setVoicePreferences({ autoRead: event.target.checked });
            }}
            className="size-6 accent-primary"
          />
          Read answers aloud
        </label>
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className="font-bold">Try one of these:</p>
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <li key={suggestion}>
                <Button type="button" variant="outline" onClick={() => ask(suggestion)} className="h-auto whitespace-normal py-2 text-left">
                  {suggestion}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ol aria-live="polite" aria-label="Conversation" className="flex flex-col gap-4">
        {messages.map((message) =>
          message.role === "user" ? (
            <li key={message.id} className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-primary px-5 py-3 text-primary-foreground">
              <span className="sr-only">You asked: </span>
              {message.content}
            </li>
          ) : (
            <li key={message.id} className="flex max-w-[92%] flex-col gap-3 self-start rounded-2xl rounded-bl-md border-2 border-border bg-card px-5 py-4">
              <p lang={language} className="whitespace-pre-wrap text-lg">
                <span className="sr-only">Companion answered: </span>
                {message.content}
              </p>
              <div>
                <ReadAloud
                  variant="quiet"
                  label="Read this answer aloud"
                  text={message.content}
                  speechId={speechIdFor(message.id)}
                />
              </div>
            </li>
          ),
        )}
        {pending ? (
          <li className="self-start rounded-2xl border-2 border-dashed border-input bg-card px-5 py-3 text-muted-foreground">
            The Companion is writing an answer…
          </li>
        ) : null}
      </ol>

      <FormMessage message={error} />

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label htmlFor="companion-question" className="font-bold">
          Your question
        </label>
        <Textarea
          id="companion-question"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              ask(draft);
            }
          }}
          rows={2}
          maxLength={MAX_QUESTION}
          lang={language}
          aria-describedby="companion-voice-status"
          className="min-h-20"
        />
        <p id="companion-voice-status" role="status" aria-live="polite" className="min-h-7 text-muted-foreground">
          {mic.listening ? (
            <span lang={language}>
              <span className="font-bold text-foreground">Listening… </span>
              {mic.interim}
            </span>
          ) : mic.error ? (
            <span className="font-bold text-destructive">{mic.error}</span>
          ) : mic.canListen ? (
            "Press Speak and ask aloud. Your words appear here so you can check them before asking."
          ) : (
            "This browser cannot listen, so please type your question."
          )}
        </p>
        <div className="flex flex-wrap gap-3">
          {mic.canListen ? (
            <MicButton listening={mic.listening} onToggle={mic.toggle} disabled={pending} />
          ) : null}
          {mic.listening ? (
            <Button type="button" size="lg" variant="quiet" onClick={mic.cancel}>
              <X aria-hidden="true" />
              Cancel
            </Button>
          ) : null}
          <Button type="submit" size="lg" disabled={pending || mic.listening || draft.trim().length === 0}>
            <SendHorizontal aria-hidden="true" />
            Ask the Companion
          </Button>
        </div>
      </form>
    </div>
  );
}
