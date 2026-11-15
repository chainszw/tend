import type { Metadata } from "next";
import { Info } from "lucide-react";
import { CompanionChat } from "@/components/circle/companion-chat";
import { Disclosure } from "@/components/circle/disclosure";
import { adaptionConfigured, stackSlug } from "@/lib/adaption";
import { adaptionEvaluation } from "@/lib/adaption-eval";
import { requireSession } from "@/lib/session";
import { loadSnapshot } from "@/lib/snapshot";

export const metadata: Metadata = { title: "Ask the Care Companion" };

function AiDetails() {
  const evaluation = adaptionEvaluation();
  const evaluated = evaluation.gradeAfter !== null || evaluation.scoreAfter !== null;
  return (
    <Disclosure summary="How the AI helper is prepared">
      <div className="rounded-2xl border-2 border-border bg-card p-5">
        <p className="text-muted-foreground">
          The Care Companion runs on Adaption AI. Its care guidance comes from a
          question-and-answer dataset written for older adults, which Adaption Adaptive Data
          cleaned, rephrased and graded before use.
        </p>
        <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="font-bold">AI helper</dt>
            <dd>{adaptionConfigured() ? "Connected" : "Not connected yet"}</dd>
          </div>
          <div>
            <dt className="font-bold">Answers grounded on the dataset</dt>
            <dd>{stackSlug() ? "Yes, through an Adaption Inference Stack" : "Not yet"}</dd>
          </div>
          <div>
            <dt className="font-bold">Guidance examples</dt>
            <dd>{evaluation.rows > 0 ? evaluation.rows : "Not processed yet"}</dd>
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
  const { circle, medications } = await loadSnapshot(session.circleId);
  const isElder = session.role === "elder";
  const firstMedicine = medications[0]?.name;

  const suggestions = isElder
    ? [
        "What do I still need to take today?",
        firstMedicine ? `What is ${firstMedicine} for, and how should I take it?` : "How do I add my medicines?",
        "I forgot a dose this morning. What should I do?",
        "When is my next doctor visit?",
      ]
    : [
        `How has ${circle.elder_name} been doing with medicines this week?`,
        `What does ${circle.elder_name} still need to take today?`,
        "What should we ask at the next doctor visit?",
        "How can I help without taking over?",
      ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-4xl font-extrabold">Ask the Care Companion</h1>
        <p className="mt-1 text-xl text-muted-foreground">
          Plain answers about {isElder ? "your" : `${circle.elder_name}'s`} medicines, schedule and
          doctor visits.
        </p>
      </div>

      <p className="flex items-start gap-3 rounded-2xl bg-amber-soft p-4">
        <Info aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
        <span>
          The Companion explains and reminds. It is not a doctor and never changes a dose. In an
          emergency, call 112.
        </span>
      </p>

      {adaptionConfigured() ? (
        <CompanionChat suggestions={suggestions} />
      ) : (
        <p role="status" className="rounded-2xl border-2 border-dashed border-input bg-card p-6">
          The Companion is not set up yet. Add an Adaption API key to turn it on.
        </p>
      )}

      <p className="text-[0.95rem] text-muted-foreground">
        Answers come from Adaption AI using this circle&apos;s own schedule
        {stackSlug() ? " and a care-guidance dataset prepared with Adaption Adaptive Data" : ""}.
      </p>

      <AiDetails />
    </div>
  );
}
