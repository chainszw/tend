import type { Metadata } from "next";
import { PartyPopper } from "lucide-react";
import {
  CircleCode,
  NotifyToggle,
  RunRemindersButton,
  WeeklyDigest,
} from "@/components/circle/family-tools";
import { adaptionConfigured, stackSlug } from "@/lib/adaption";
import { adaptionEvaluation } from "@/lib/adaption-eval";
import { listActivity, listMembers } from "@/lib/data";
import { emailConfigured } from "@/lib/email";
import { formatRelative } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { loadCircle } from "@/lib/snapshot";
import { ROLE_LABELS, type Role } from "@/lib/types";

export const metadata: Metadata = { title: "Family and caretakers" };

const ROLE_NAMES: Record<Role, string> = {
  elder: "Person cared for",
  family: "Family",
  caretaker: "Caretaker",
};

const CARD = "rounded-2xl border-2 border-border bg-card p-5";

function AiPanel() {
  const evaluation = adaptionEvaluation();
  const evaluated = evaluation.gradeAfter !== null || evaluation.scoreAfter !== null;
  return (
    <section aria-labelledby="ai-heading" className={CARD}>
      <h2 id="ai-heading" className="text-2xl font-extrabold">
        How the AI helper is prepared
      </h2>
      <p className="mt-2 text-muted-foreground">
        The Care Companion runs on Adaption AI. Its care guidance comes from a question-and-answer
        dataset written for older adults, which Adaption Adaptive Data cleaned, rephrased and
        graded before use.
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
    </section>
  );
}

export default async function FamilyPage({ searchParams }: PageProps<"/circle/family">) {
  const session = await requireSession();
  const [circle, members, activity, query] = await Promise.all([
    loadCircle(session.circleId),
    listMembers(session.circleId),
    listActivity(session.circleId, 25),
    searchParams,
  ]);
  const me = members.find((member) => member.id === session.memberId);
  const now = new Date();

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-4xl font-extrabold">Family and caretakers</h1>
        <p className="mt-1 text-xl text-muted-foreground">
          The people looking after {circle.elder_name}, and what has changed.
        </p>
      </div>

      {query.welcome ? (
        <p role="status" className="flex items-start gap-3 rounded-2xl bg-leaf-soft p-4 text-lg font-bold text-primary">
          <PartyPopper aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
          The care circle is ready. Share the code below, then add the first medicine.
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="invite-heading" className={CARD}>
          <h2 id="invite-heading" className="text-2xl font-extrabold">
            Invite someone
          </h2>
          <p className="mt-2 text-muted-foreground">
            Give them this code and the 6-digit passcode. They choose “Join with a code” on the
            first page.
          </p>
          <div className="mt-4">
            <CircleCode code={circle.code} />
          </div>
        </section>

        <section aria-labelledby="members-heading" className={CARD}>
          <h2 id="members-heading" className="text-2xl font-extrabold">
            In this circle
          </h2>
          <ul className="mt-3 flex flex-col divide-y-2 divide-border">
            {members.map((member) => (
              <li key={member.id} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5">
                <span className="text-lg font-bold">
                  {member.name}
                  {member.id === session.memberId ? " (you)" : ""}
                </span>
                <span className="text-muted-foreground" title={ROLE_LABELS[member.role]}>
                  {ROLE_NAMES[member.role]}
                  {member.email && member.notify ? ", gets emails" : ", no emails"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="reminders-heading" className={CARD}>
          <h2 id="reminders-heading" className="text-2xl font-extrabold">
            Email reminders
          </h2>
          <p className="mt-2 text-muted-foreground">
            Tend checks every 10 minutes. {circle.elder_name} gets an email 30 minutes before a
            dose. If a dose is not marked within an hour, the whole circle is told. Visits are
            announced the day before and 2 hours before.
          </p>
          {emailConfigured() ? null : (
            <p role="status" className="mt-3 rounded-xl bg-amber-soft p-3 font-bold">
              Email sending is not set up yet, so no reminders are going out.
            </p>
          )}
          <div className="mt-4 flex flex-col gap-4">
            <NotifyToggle enabled={me?.notify ?? false} hasEmail={Boolean(me?.email)} />
            <RunRemindersButton />
          </div>
        </section>

        <section aria-labelledby="digest-heading" className={CARD}>
          <h2 id="digest-heading" className="text-2xl font-extrabold">
            This week in a few sentences
          </h2>
          <p className="mt-2 text-muted-foreground">
            A short update written from the week&apos;s records, useful for relatives who live far
            away.
          </p>
          <div className="mt-4">
            <WeeklyDigest />
          </div>
        </section>
      </div>

      <section aria-labelledby="activity-heading" className={CARD}>
        <h2 id="activity-heading" className="text-2xl font-extrabold">
          Who changed what
        </h2>
        <p className="mt-2 text-muted-foreground">
          Every change is listed here so {circle.elder_name} always knows what was done and by whom.
        </p>
        {activity.length === 0 ? (
          <p className="mt-4">Nothing has been changed yet.</p>
        ) : (
          <ol className="mt-3 flex flex-col divide-y-2 divide-border">
            {activity.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5">
                <span>
                  <span className="font-bold">{entry.member_name}</span> {entry.summary}
                </span>
                <time dateTime={entry.created_at} className="text-[0.95rem] text-muted-foreground">
                  {formatRelative(entry.created_at, now)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>

      <AiPanel />
    </div>
  );
}
