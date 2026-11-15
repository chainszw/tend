import type { Metadata } from "next";
import { PartyPopper } from "lucide-react";
import { Disclosure } from "@/components/circle/disclosure";
import { InviteCard, NotifyToggle, WeeklyDigest } from "@/components/circle/family-tools";
import { listActivity, listMembers } from "@/lib/data";
import { emailConfigured } from "@/lib/email";
import { formatRelative } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { loadCircle } from "@/lib/snapshot";
import { ROLE_LABELS, type ActivityEntry, type Role } from "@/lib/types";

export const metadata: Metadata = { title: "Family and caretakers" };

const ROLE_NAMES: Record<Role, string> = {
  elder: "Person cared for",
  family: "Family",
  caretaker: "Caretaker",
};

const CARD = "rounded-2xl border-2 border-border bg-card p-5";

const RECENT_CHANGES = 5;

function ActivityList({ entries, now }: { entries: ActivityEntry[]; now: Date }) {
  return (
    <ol className="flex flex-col divide-y-2 divide-border">
      {entries.map((entry) => (
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
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-4xl font-extrabold">Family and caretakers</h1>
        <p className="mt-1 text-xl text-muted-foreground">
          Who is looking after {circle.elder_name}, and how to invite more people.
        </p>
      </div>

      {query.welcome ? (
        <p role="status" className="flex items-start gap-3 rounded-2xl bg-leaf-soft p-4 text-lg font-bold text-primary">
          <PartyPopper aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
          The care circle is ready. Send an invite below, then add the first medicine.
        </p>
      ) : null}

      <section aria-labelledby="invite-heading" className={CARD}>
        <h2 id="invite-heading" className="text-2xl font-extrabold">
          Invite someone
        </h2>
        <p className="mt-2 text-muted-foreground">
          Send the invite, or tell them the code and passcode. They choose “Join with a code” on
          the first page.
        </p>
        <div className="mt-4">
          <InviteCard code={circle.code} elderName={circle.elder_name} />
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
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="digest-heading" className={CARD}>
        <h2 id="digest-heading" className="text-2xl font-extrabold">
          This week in a few sentences
        </h2>
        <p className="mt-2 text-muted-foreground">
          A short update written from the week&apos;s records, useful for relatives far away.
        </p>
        <div className="mt-4">
          <WeeklyDigest />
        </div>
      </section>

      <section aria-labelledby="activity-heading" className={CARD}>
        <h2 id="activity-heading" className="text-2xl font-extrabold">
          Recent changes
        </h2>
        {activity.length === 0 ? (
          <p className="mt-3">Nothing has been changed yet.</p>
        ) : (
          <div className="mt-2">
            <ActivityList entries={activity.slice(0, RECENT_CHANGES)} now={now} />
            {activity.length > RECENT_CHANGES ? (
              <Disclosure summary="Show older changes" className="mt-2">
                <ActivityList entries={activity.slice(RECENT_CHANGES)} now={now} />
              </Disclosure>
            ) : null}
          </div>
        )}
      </section>

      <section aria-labelledby="reminders-heading" className={CARD}>
        <h2 id="reminders-heading" className="text-2xl font-extrabold">
          Email reminders
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          <NotifyToggle enabled={me?.notify ?? false} hasEmail={Boolean(me?.email)} />
          {emailConfigured() ? null : (
            <p role="status" className="rounded-xl bg-amber-soft p-3 font-bold">
              Email sending is not set up yet, so no reminders are going out.
            </p>
          )}
          <Disclosure summary="When are emails sent?">
            <p className="text-muted-foreground">
              {circle.elder_name} gets an email 30 minutes before a dose. If a dose is not marked
              within an hour, everyone in the circle is told. Visits are announced the day before
              and 2 hours before.
            </p>
          </Disclosure>
        </div>
      </section>
    </div>
  );
}
