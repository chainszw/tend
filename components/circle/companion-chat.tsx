"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  MessageCircleQuestion,
  SendHorizontal,
  Volume2,
  VolumeX,
} from "lucide-react";
import { askCompanionAction } from "@/app/actions/ai";
import { ReadAloud } from "@/components/circle/read-aloud";
import { useT } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { LanguageSelect } from "@/components/voice/language-select";
import { MicButton } from "@/components/voice/mic-button";
import { useListening } from "@/components/voice/use-listening";
import {
  setVoicePreferences,
  speakText,
  stopSpeaking,
  useVoicePreferences,
} from "@/components/voice/voice-store";

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
  const t = useT();

  // What was heard goes into the question box to be checked and corrected. It is never sent by itself.
  const addHeard = useCallback((transcript: string) => {
    setDraft((current) =>
      `${current.trimEnd()} ${transcript}`.trim().slice(0, MAX_QUESTION),
    );
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
    const history = [
      ...messages,
      { id: nextId.current, role: "user" as const, content },
    ];
    setMessages(history);
    startTransition(async () => {
      const result = await askCompanionAction(
        history
          .slice(-MAX_HISTORY)
          .map(({ role, content: text }) => ({ role, content: text })),
        language,
      );
      if (result.ok && result.reply) {
        nextId.current += 1;
        setMessages([
          ...history,
          { id: nextId.current, role: "assistant", content: result.reply },
        ]);
        // Only the new answer is read, never the whole conversation again.
        if (autoRead)
          speakText(speechIdFor(nextId.current), result.reply, language);
      } else {
        setError(result.message ?? t.companionFailed);
      }
    });
  }

  // The question box grows with the text, up to its max height.
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const box = inputRef.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${box.scrollHeight + 4}px`;
  }, [draft]);

  // One line under the composer, shown only when there is something to say.
  const status = mic.listening ? (
    <p lang={language} className="px-2 text-muted-foreground">
      <span className="font-bold text-foreground">{t.listening}</span>
      {mic.interim}{" "}
      <button
        type="button"
        onClick={mic.cancel}
        className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4"
      >
        {t.cancel}
      </button>
    </p>
  ) : error || mic.error ? (
    <p className="px-2 font-bold text-destructive">{error ?? mic.error}</p>
  ) : null;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(draft);
  }

  return (
    <section
      aria-label={t.chatLabel}
      className="flex min-h-[36rem] flex-col overflow-hidden rounded-2xl border-2 border-border bg-card"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-11 items-center justify-center rounded-full bg-leaf-soft text-primary"
          >
            <MessageCircleQuestion className="size-6" />
          </span>
          <span className="text-lg font-bold">{t.companionName}</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSelect compact />
          <Button
            type="button"
            size="icon"
            variant={autoRead ? "default" : "quiet"}
            aria-pressed={autoRead}
            aria-label={t.readAnswersAloud}
            title={t.readAnswersAloud}
            onClick={() => {
              if (autoRead) stopSpeaking();
              setVoicePreferences({ autoRead: !autoRead });
            }}
            className="rounded-full"
          >
            {autoRead ? (
              <Volume2 aria-hidden="true" className="size-6" />
            ) : (
              <VolumeX aria-hidden="true" className="size-6" />
            )}
          </Button>
        </div>
      </header>

      <ol
        aria-live="polite"
        aria-label={t.conversation}
        className="flex flex-1 flex-col gap-4 px-4 py-5"
      >
        {messages.length === 0 ? (
          <li className="max-w-[92%] self-start">
            <p className="rounded-2xl rounded-bl-md bg-well px-5 py-3 text-lg">
              {t.chatHello}
            </p>
          </li>
        ) : null}
        {messages.map((message) =>
          message.role === "user" ? (
            <li
              key={message.id}
              className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-primary px-5 py-3 text-primary-foreground"
            >
              <span className="sr-only">{t.youAsked}</span>
              {message.content}
            </li>
          ) : (
            <li
              key={message.id}
              className="flex max-w-[92%] flex-col gap-3 self-start rounded-2xl rounded-bl-md bg-well px-5 py-4"
            >
              <p lang={language} className="text-lg whitespace-pre-wrap">
                <span className="sr-only">{t.companionAnswered}</span>
                {message.content}
              </p>
              <div>
                <ReadAloud
                  variant="quiet"
                  label={t.readThisAnswer}
                  text={message.content}
                  speechId={speechIdFor(message.id)}
                />
              </div>
            </li>
          ),
        )}
        {pending ? (
          <li className="self-start rounded-2xl rounded-bl-md border-2 border-dashed border-input px-5 py-3 text-muted-foreground">
            {t.writing}
          </li>
        ) : null}
      </ol>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-2 border-t-2 border-border bg-background px-3 py-3"
      >
        {messages.length === 0 ? (
          <ul aria-label={t.suggested} className="flex flex-wrap gap-1.5">
            {suggestions.map((suggestion) => (
              <li key={suggestion}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => ask(suggestion)}
                  className="h-auto min-h-11 rounded-full px-3 py-1 text-left text-base whitespace-normal"
                >
                  {suggestion}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex items-end gap-2">
          {mic.canListen ? (
            <MicButton
              compact
              listening={mic.listening}
              onToggle={mic.toggle}
              disabled={pending}
              label={t.speakQuestion}
              listeningLabel={t.finishedSpeaking}
            />
          ) : null}
          <Textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                ask(draft);
              }
            }}
            rows={1}
            maxLength={MAX_QUESTION}
            lang={language}
            aria-label={t.yourQuestion}
            aria-describedby={status ? "companion-voice-status" : undefined}
            placeholder={mic.canListen ? t.placeholderSpeak : t.placeholderType}
            className="max-h-40 min-h-12 flex-1 resize-none rounded-3xl py-2.5"
          />
          <Button
            type="submit"
            size="icon"
            aria-label={t.askButton}
            disabled={pending || mic.listening || draft.trim().length === 0}
            className="rounded-full"
          >
            <SendHorizontal aria-hidden="true" className="size-6" />
          </Button>
        </div>
        <div id="companion-voice-status" role="status" aria-live="polite">
          {status}
        </div>
      </form>
    </section>
  );
}
