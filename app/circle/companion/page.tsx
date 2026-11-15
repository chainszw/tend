import type { Metadata } from "next";
import { Info } from "lucide-react";
import { CompanionChat } from "@/components/circle/companion-chat";
import { Disclosure } from "@/components/circle/disclosure";
import { adaptionConfigured, stackSlug } from "@/lib/adaption";
import { adaptionEvaluation } from "@/lib/adaption-eval";
import { messages } from "@/lib/i18n";
import { pageLanguage } from "@/lib/i18n-server";
import { requireSession } from "@/lib/session";
import { loadSnapshot } from "@/lib/snapshot";

export const metadata: Metadata = { title: "Ask the Care Companion" };

function AiDetails() {
  const evaluation = adaptionEvaluation();
  const evaluated =
    evaluation.gradeAfter !== null || evaluation.scoreAfter !== null;
  return (
    <Disclosure summary="How the AI helper is prepared">
      <div className="rounded-2xl border-2 border-border bg-card p-5">
        <p className="text-muted-foreground">
          The Care Companion runs on Adaption AI. Its care guidance comes from a
          question-and-answer dataset written for older adults, which Adaption
          Adaptive Data cleaned, rephrased and graded before use.
        </p>
        <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="font-bold">AI helper</dt>
            <dd>{adaptionConfigured() ? "Connected" : "Not connected yet"}</dd>
          </div>
          <div>
            <dt className="font-bold">Answers grounded on the dataset</dt>
            <dd>
              {stackSlug()
                ? "Yes, through an Adaption Inference Stack"
                : "Not yet"}
            </dd>
          </div>
          <div>
            <dt className="font-bold">Guidance examples</dt>
            <dd>
              {evaluation.rows > 0 ? evaluation.rows : "Not processed yet"}
            </dd>
          </div>
          <div>
            <dt className="font-bold">Quality grade</dt>
            <dd>
              {evaluated
                ? `${evaluation.gradeBefore ?? "?"} before, ${evaluation.gradeAfter ?? "?"} after adapting${
                    evaluation.improvementPercent === null
                      ? ""
                      : ` (${Math.round(evaluation.improvementPercent)}% better)`
                  }`
                : "Not graded yet"}
            </dd>
          </div>
        </dl>
      </div>
    </Disclosure>
  );
}

export default async function CompanionPage() {
  const session = await requireSession();
  const [{ circle, medications }, lang] = await Promise.all([
    loadSnapshot(session.circleId),
    pageLanguage(),
  ]);
  const t = messages(lang);
  const isElder = session.role === "elder";
  const firstMedicine = medications[0]?.name;

  const suggestions = isElder
    ? t.suggestionsElder(firstMedicine)
    : t.suggestionsFamily(circle.elder_name);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-4xl font-extrabold">{t.askTitle}</h1>
        <p className="mt-1 text-xl text-muted-foreground">
          {t.askSubtitle(isElder ? null : circle.elder_name)}
        </p>
      </div>

      {adaptionConfigured() ? (
        <CompanionChat suggestions={suggestions} />
      ) : (
        <p
          role="status"
          className="rounded-2xl border-2 border-dashed border-input bg-card p-6"
        >
          {t.notSetUp}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <p className="flex items-start gap-2 rounded-xl bg-amber-soft px-4 py-2.5 text-[0.95rem]">
          <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <span>{t.disclaimer}</span>
        </p>
        <p className="text-[0.95rem] text-muted-foreground">
          {t.answersFrom(Boolean(stackSlug()))}
        </p>
      </div>

      <AiDetails />
    </div>
  );
}
