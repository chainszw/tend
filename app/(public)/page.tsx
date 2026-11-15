import Link from "next/link";
import { Activity, BellRing, Check, MessageCircleQuestion, UsersRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const SAMPLE_DAY = [
  { part: "Morning", doses: [{ name: "Metformin", detail: "500 mg, after breakfast", taken: true }, { name: "Amlodipine", detail: "5 mg", taken: true }] },
  { part: "Afternoon", doses: [{ name: "Vitamin D", detail: "1 tablet", taken: true }] },
  { part: "Evening", doses: [{ name: "Metformin", detail: "500 mg, after dinner", taken: false }] },
  { part: "Night", doses: [{ name: "Atorvastatin", detail: "10 mg", taken: false }] },
];

const FEATURES = [
  {
    icon: UsersRound,
    title: "One schedule the whole family sees",
    body: "The person being cared for, their family and their caretakers open the same family with a code and passcode. Anyone can add a medicine or an appointment, and everyone sees who changed what.",
  },
  {
    icon: BellRing,
    title: "Reminders that reach the right person",
    body: "An email goes out before a dose is due. If nobody marks it as taken within an hour, the family hears about it. Appointments are announced the day before and again shortly before.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Plain answers, not medical jargon",
    body: "Paste a prescription and Tend turns it into a schedule to review. The Care Companion explains the day in simple words and prepares questions for the next doctor visit.",
  },
];

/** A still picture of the Today organiser, the heart of the product. */
function OrganiserPreview() {
  return (
    <div
      role="img"
      aria-label="Example of a day in Tend: morning and afternoon medicines are marked as taken, evening and night medicines are still to come."
      className="grid gap-3 rounded-2xl border-2 border-border bg-card p-4 shadow-[0_18px_40px_-18px_rgb(18_38_30/0.45)] sm:grid-cols-2"
    >
      {SAMPLE_DAY.map((compartment) => (
        <div key={compartment.part} aria-hidden="true" className="well flex flex-col gap-2 rounded-xl p-3">
          <p className="font-extrabold">{compartment.part}</p>
          {compartment.doses.map((dose) => (
            <div
              key={dose.name + compartment.part}
              className={`flex items-center gap-3 rounded-full py-2 pl-2 pr-4 ${dose.taken ? "bg-primary text-primary-foreground" : "bg-card"}`}
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${dose.taken ? "bg-card text-primary" : "border-2 border-dashed border-input"}`}
              >
                {dose.taken ? <Check className="size-5" strokeWidth={3} /> : null}
              </span>
              <span className="leading-tight">
                <span className="block font-bold">{dose.name}</span>
                <span className={`block text-[0.85rem] ${dose.taken ? "text-primary-foreground/85" : "text-muted-foreground"}`}>
                  {dose.detail}
                </span>
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-16 pt-8 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
        <div className="flex flex-col gap-6">
          <h1 className="text-[2.6rem] font-extrabold sm:text-[3.4rem]">
            Every medicine taken, every doctor visit remembered, together.
          </h1>
          <p className="max-w-[34rem] text-xl text-muted-foreground">
            Tend is a shared family space for one older person. They stay in charge of their own
            day. Family and caretakers see the same schedule and hear about it when a dose is
            missed.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/create" className={buttonVariants({ size: "lg" })}>
              Create Family
            </Link>
            <Link href="/join" className={buttonVariants({ size: "lg", variant: "outline" })}>
              Join with a code
            </Link>
            <Link href="/device" className={buttonVariants({ size: "lg", variant: "amber" })}>
              <Activity aria-hidden="true" />
              Try the Tend device
            </Link>
          </div>
          <p className="text-muted-foreground">Free to use. No app to install. Works on any phone.</p>
        </div>
        <OrganiserPreview />
      </section>

      <section aria-labelledby="how-heading" className="border-y-2 border-border bg-card">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[0.8fr_2fr]">
          <h2 id="how-heading" className="text-3xl font-extrabold">
            What Tend does for a family
          </h2>
          <ul className="grid gap-8 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex flex-col gap-3">
                <feature.icon aria-hidden="true" className="size-9 text-primary" strokeWidth={1.75} />
                <h3 className="text-xl font-extrabold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="charge-heading" className="mx-auto w-full max-w-6xl px-5 py-14">
        <div className="max-w-[44rem]">
          <h2 id="charge-heading" className="text-3xl font-extrabold">
            The person being cared for stays in charge
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Their own view is large, simple and can be read aloud. They decide whether a dose was
            taken or skipped. Every change a family member or caretaker makes is listed with their
            name, so nothing about their health happens behind their back.
          </p>
        </div>
      </section>
    </>
  );
}
