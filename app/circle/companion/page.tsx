import type { Metadata } from "next";
import { Info } from "lucide-react";
import { CompanionChat } from "@/components/circle/companion-chat";
import { adaptionConfigured, stackSlug } from "@/lib/adaption";
import { requireSession } from "@/lib/session";
import { loadSnapshot } from "@/lib/snapshot";

export const metadata: Metadata = { title: "Ask the Care Companion" };

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
    </div>
  );
}
