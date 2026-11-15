# Tend

A shared care circle for one older person. They, their family and their caretakers manage
medicines and doctor visits together, and get an email when something is due or missed.

Built for the PromptWars × Catalyst challenge: *Elderly Care & Medication Management Platform*.

## What it does

| Challenge requirement | How Tend does it |
| --- | --- |
| Shared profile with passcode access | A care circle is opened with a circle code (for example `MAPLE-4821`) and a 6-digit passcode. Elder, family and caretaker roles share one view. |
| Add, view, edit and manage medication schedules | Medicines have a dose, times of day, days of the week, start and end dates. They can be edited, paused, resumed or removed. |
| Track adherence | Each dose is marked Taken or Skipped. Unmarked doses become "missed" after an hour. A 7-day view shows the share of doses taken and the current streak. |
| Monitor doctor appointments | Visits are listed with date, doctor, place and notes, and can be added to Google Calendar in one click. |
| Proactive email reminders | An email goes out 30 minutes before a dose, when a dose is missed (to the whole circle), and the day before and 2 hours before a visit. |
| Go beyond a reminder app | Prescription import, a grounded Care Companion, AI visit preparation, weekly family updates, and a change log that keeps the elder informed. |
| Elder stays at the centre | Large-text mode by default for the elder, read-aloud on every key screen, one-tap dose buttons, and every change by family or caretakers is listed with their name. |

## How Adaption AI is used

All AI features call [Adaption](https://docs.adaptionlabs.ai) from the server (`lib/adaption.ts`).

1. **Prescription import** (`lib/ai.ts`, `extractMedications`): pasted prescription or label
   text is read into structured medicines by the Responses API. The result is validated with
   zod, and a person reviews and corrects every line before anything is saved.
2. **Care Companion** (`companionReply`): answers questions in plain language using the
   circle's own medicines, today's doses, adherence and visits. It is grounded on a
   care-guidance dataset through an Adaption **Inference Stack** with `file_search`.
3. **Adaptive Data** (`scripts/adaption-dataset.ts`): the guidance dataset
   (`data/eldercare-guidance.jsonl`) is uploaded, adapted (prompt rephrasing and
   de-duplication) and evaluated by Adaption. The before and after quality grades are saved to
   `data/adaption-eval.json` and shown in the app under Family.
4. **Visit preparation** (`suggestVisitQuestions`): writes questions for the elder to ask the
   doctor, based on the visit, the medicines and recent missed doses.
5. **Weekly update** (`writeDigest`): adherence is computed in code; the model only turns the
   numbers into a few warm sentences for relatives.

Safety rules are part of every prompt: the model never changes a dose, sends emergencies to
112, and treats record text as data rather than instructions.

## Architecture

- **Next.js 16** (App Router, TypeScript strict), **Tailwind CSS v4**, **shadcn/ui** (Base UI).
- **Supabase Postgres** reached only from the server with the service-role key. Row Level
  Security is enabled with no policies, so the browser cannot read or write anything directly.
- **Auth**: passcode hashed with scrypt, signed HttpOnly session cookie (`jose`), lockout after
  5 wrong passcodes, rate-limited sign-in.
- **Invites**: signed-in members can reveal the passcode to invite others. The scrypt hash
  is still the only thing used to sign in. A separate AES-256-GCM copy (key derived from
  `SESSION_SECRET` with HKDF) is decrypted only on request through a rate-limited server
  action, so the passcode never appears in page HTML. Invite links carry only the circle code,
  never the passcode.
- **Reminders**: Supabase `pg_cron` calls `POST /api/cron/reminders` every 10 minutes with a
  bearer secret. Reminders are claimed in a table with a unique key before sending, so no
  reminder is ever sent twice. Emails go through **Gmail SMTP**.
- **Google services**: Gmail (email delivery), Google Calendar (add-a-visit links), Google
  Fonts (Atkinson Hyperlegible Next). `output: "standalone"` keeps a Cloud Run deploy possible.
- **Pure logic** (`lib/schedule.ts`, `lib/adherence.ts`, `lib/reminders.ts`, …) is covered by
  Vitest unit tests in `tests/`.

```
app/            pages, server actions, the cron route
components/     UI (public forms, the signed-in circle, base components)
lib/            data access, auth, schedule/adherence/reminder logic, Adaption client
supabase/       schema.sql (tables + RLS), cron.sql (reminder schedule)
scripts/        adaption-dataset.ts (Adaptive Data pipeline)
tests/          unit tests
```

## Accessibility

Atkinson Hyperlegible typeface, 18px base text with a larger-text mode, controls at least 44px
tall, visible focus outlines, a skip link, labelled form fields with announced errors, status
shown with icon and text (never colour alone), live regions for updates, reduced-motion
support, and read-aloud through the browser's speech synthesis.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. Fill in `.env.local` (see `.env.example` for each value).
3. After deploying, edit and run `supabase/cron.sql` to schedule reminders.
4. Optional: `npm run adaption:dataset` to adapt and evaluate the guidance dataset.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## A note on medical safety

Tend supports the care a doctor or pharmacist gives. It does not replace it, and it never
advises starting, stopping or changing a medicine.
