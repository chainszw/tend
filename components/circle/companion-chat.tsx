"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { SendHorizontal } from "lucide-react";
import { askCompanionAction } from "@/app/actions/ai";
import { ReadAloud } from "@/components/circle/read-aloud";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY = 12;

/** Chat with the Care Companion. Answers are announced to screen readers. */
export function CompanionChat({ suggestions }: { suggestions: string[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const nextId = useRef(0);

  function ask(question: string) {
    const content = question.trim();
    if (!content || pending) return;
    setError(undefined);
    setDraft("");
    nextId.current += 1;
    const history = [...messages, { id: nextId.current, role: "user" as const, content }];
    setMessages(history);
    startTransition(async () => {
      const result = await askCompanionAction(
        history.slice(-MAX_HISTORY).map(({ role, content: text }) => ({ role, content: text })),
      );
      if (result.ok && result.reply) {
        nextId.current += 1;
        setMessages([...history, { id: nextId.current, role: "assistant", content: result.reply }]);
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
              <p className="whitespace-pre-wrap text-lg">
                <span className="sr-only">Companion answered: </span>
                {message.content}
              </p>
              <div>
                <ReadAloud variant="quiet" label="Read this answer aloud" text={message.content} />
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
          maxLength={2000}
          className="min-h-20"
        />
        <Button type="submit" size="lg" disabled={pending || draft.trim().length === 0} className="self-start">
          <SendHorizontal aria-hidden="true" />
          Ask the Companion
        </Button>
      </form>
    </div>
  );
}
