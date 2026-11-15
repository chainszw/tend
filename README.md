<p align="center">
  <img src="app/icon.svg" alt="Tend logo: a two-tone green and amber capsule" width="96" height="96">
</p>

<h1 align="center">Tend</h1>

**A shared family space for one older person.** The elder, their family and their caretakers
manage medicines and doctor visits in one place, and get an email when something is due or
has been missed.

**Live:** https://tend-software.vercel.app

Built for the PromptWars × Catalyst challenge: *Elderly Care & Medication Management Platform*.

## What makes Tend different

Most medication apps stop at a list and a reminder. Tend does those well, and simply, and
then adds four things built for an older person who may not type, may not read English and
may not trust small print:

1. **🩺 An interactive 3D home health pod.** A working prototype of a low-cost home station
   (blood pressure cuff, pulse oximeter, thermometer, scale) that you can power on, use,
   listen to and open up in the browser. Its readings flow straight into the family's
   Health page. [Details](#tend-home-station-the-interactive-3d-pod)
2. **📷 A prescription scanner.** Point the phone camera at a paper prescription and the
   medicines appear as a checked, editable list: no typing out drug names and doses.
   [Details](#prescription-scanner-photo-to-medicine-list)
3. **🗣️ Multilingual voice, in and out.** Speak instead of typing, and hear answers, steps
   and the day's doses read aloud, in English or Hindi (beta). One switch changes the
   words on screen, the voice and the AI's answers.
   [Details](#voice-and-language-english-and-hindi-beta)
4. **🖼️ AI that understands pictures and answers in plain words.** A vision model reads
   handwritten or printed prescriptions, and a grounded Care Companion chat answers
   questions about *this* family's medicines, visits and readings, typed or spoken, and
   can read its replies aloud. [Details](#care-companion-ai-chat-you-can-talk-to)

Everything else is deliberately plain: one shared family, a pill-organiser home screen with
one big **Taken** button, a simple medicine list, doctor visits, adherence numbers and email
reminders. Big text, few choices, nothing to learn.

## Contents

- [What makes Tend different](#what-makes-tend-different)
- [How it meets the challenge](#how-it-meets-the-challenge)
- [Standout features](#standout-features)
- [The essentials, kept simple](#the-essentials-kept-simple)
- [How Adaption AI is used](#how-adaption-ai-is-used)
- [Google services](#google-services)
- [Accessibility](#accessibility)
- [Security](#security)
- [Architecture](#architecture)
- [Run it locally](#run-it-locally)
- [Deploy](#deploy)
- [Checks](#checks)

## How it meets the challenge

| Challenge requirement | How Tend does it |
| --- | --- |
| Shared profile with passcode access | A family is opened with a family code (for example `MAPLE-4821`) and a 6-digit passcode. Elder, family and caretaker roles share one view. |
| Add, view, edit and manage medication schedules | Medicines have a dose, times of day, days of the week, start and end dates. They can be edited, paused, resumed or removed. |
| Track adherence | Each dose is marked Taken or Skipped. Unmarked doses become "missed" after an hour. A 7-day view shows the share of doses taken and the current streak. |
| Monitor doctor appointments | Visits are listed with date, doctor, place and notes, and can be added to Google Calendar in one click. |
| Proactive email reminders | An email goes out 30 minutes before a dose, when a dose is missed (to the whole family), and the day before and 2 hours before a visit. |
| Go beyond a reminder app | Prescription import by camera, a grounded Care Companion, AI visit preparation, weekly family updates, health readings, a home device prototype, and voice. |
| Elder stays at the centre | Larger text by default for the elder, read-aloud on key screens, one-tap dose buttons, and every change by family or caretakers is listed with their name. |

## Standout features

These are what set Tend apart.

### Tend Home Station: the interactive 3D pod
Many older people already own a blood pressure monitor, but the numbers stay on its screen
and never reach the family. The Tend Home Station shows how one cheap, voice-guided unit
could fix that.

`/device` (linked from the homepage as "Try the Tend device") is a working 3D prototype of a
low-cost home health station: an upper-arm blood pressure cuff, a fingertip pulse oximeter,
a thermometer and an optional wireless scale around one small unit with a screen, three
large buttons and a voice.

- Power it on, pick a measurement, follow the spoken steps, read the result in plain words
  and save it. The screen is real HTML placed on the 3D model, so it works with a keyboard
  and a screen reader; the same controls are repeated as ordinary buttons below.
- **Show inside** opens the device and lists every part, what it does and a rough cost in
  rupees.
- Signed in, a saved reading goes to the family. Signed out, it is a demo and nothing
  is stored.
- Built with React Three Fiber and drei from original geometry (no downloaded models).

The readings are simulated. This is a design prototype, not a manufactured or clinically
validated medical device.

### Prescription scanner: photo to medicine list
Typing a list of drug names, strengths and timings is the hardest part of setting up any
medicine app, and the most error-prone for an older person.

Instead of typing, **Scan with camera** takes a photo of a paper prescription or medicine
label, or the text can be pasted. Adaption AI reads it into
structured medicines. Nothing is saved until a person has reviewed and corrected every line.

- The photo is resized in the browser (`lib/image-resize.ts`) so it uploads fast on a
  mobile connection.
- Google's **Gemma** vision model, served through Adaption, transcribes the prescription,
  then a second step turns the text into dose, times and days, validated with zod.
- The text read from the photo is kept in an editable box (**Back to the text**), so a
  family member can check and fix it before saving. Pasted text works the same way when
  there is no camera.

### Voice and language: English, and Hindi (beta)
Many elders in India are more comfortable speaking than typing, and in Hindi than in
English. Tend lets them talk to the app and listen to it.

One language setting controls the page words, the speaking voice, listening, and the
language the Care Companion answers in.

- **English** is complete.
- **हिन्दी is in beta** and is labelled *Beta* wherever the language is chosen. The shell,
  navigation, Settings, Today and Ask are translated; Medicines, Visits, Health and Family
  are still in English. On the Home Station the spoken steps and voice commands are in
  Hindi, while the on-screen text is English.
- **Speaking** uses the browser's `speechSynthesis`, choosing the most natural installed
  voice (neural and Google voices first, then an Indian accent). Only one thing speaks at a
  time and it can be stopped at once.
- **Listening** uses the browser's `SpeechRecognition` (`en-IN` or `hi-IN`). On Ask the
  words go into the question box to be checked; they are never sent automatically. On the
  device a reading is saved only after "yes" / "हाँ" or the Save button.
- No audio is stored, and no speech model or paid service is added. Voice quality depends
  on the voices installed on the device, and listening works best in Chrome.

### Care Companion: AI chat you can talk to
A single chat that answers questions such as "What do I still need to take today?" in plain
language. It is given the family's own medicines, today's doses, adherence, visits and
health readings, and is grounded on a care-guidance dataset. It can be typed to or spoken
to, and can read its answers aloud. It never changes a dose and sends emergencies to 112.

- **Grounded, not generic.** Each answer is built from the family's own record plus a
  care-guidance dataset adapted and evaluated with Adaption, not from the open web.
- **Voice both ways.** The mic fills the question box (in English or Hindi) so it can be
  checked before sending; a speaker button reads each answer aloud, or every answer
  automatically.
- **Pictures too.** The same Gemma vision model reads prescription photos, so the
  Companion can talk about medicines that were added just by taking a picture.

## The essentials, kept simple

The core of the challenge, done plainly so that anyone in the family can use it on the
first try.

### Family: one shared profile
One family is created per older person. Whoever sets it up chooses their role (the elder,
family, or a caretaker) and a 6-digit passcode, and gets a family code. Everyone else joins
with the code and the passcode and adds their own name and email, so reminders reach the
right people and every change carries a name.

### Inviting family and caretakers
On the Family page any signed-in member can tap **Show** to reveal the passcode, **Send an
invite** to share a join link through the phone's share sheet, or **Change the passcode**.
The link carries only the family code. The passcode is never put in a URL.

### Today: the pill organiser
The home screen is laid out like a pill organiser: Morning, Afternoon, Evening and Night.
Each dose is a card with one large **Taken** button, plus **Skip** and **Undo**. A line at
the top says in plain words what needs attention now ("It is time for Metformin"), and
**Read my day aloud** speaks the whole day. The next doctor visit sits beside it.

### Medicines and schedules
Add a medicine with its dose, times of day, days of the week and optional start and end
dates. Medicines can be edited, paused (for example during a hospital stay), resumed or
removed. The schedule logic is pure code in `lib/schedule.ts` and fully unit tested.

### Adherence
A dose that is not marked within an hour of its time counts as missed. The **This week**
strip shows each of the last 7 days, the share of doses taken and the current streak of
complete days. The numbers are computed in code (`lib/adherence.ts`), never by the model.

### Doctor visits
Visits are stored with date, time, doctor, place and notes. Each one has an **Add to Google
Calendar** link, and **Prepare for this visit** asks Adaption AI for questions worth asking
the doctor, based on the visit, the current medicines and recently missed doses.

### Email reminders
Every 10 minutes a scheduled job checks every family and sends:

- **Upcoming dose**: 30 minutes before, to the elder and caretakers.
- **Missed dose**: once a dose has gone unmarked, to the whole family.
- **Doctor visit**: the day before and 2 hours before, to the whole family.

Each member can turn their own reminder emails on or off on the Family page. Each reminder is claimed in a table with a unique key before it is sent, so a reminder can
never be sent twice, even if the job runs twice.

### Family page
A short list of who is in the family, the five most recent changes with the name of who
made them, a **weekly update** that turns the adherence numbers into a few warm sentences
for relatives, and the invite tools above.

### Health readings
The Health page lists blood pressure, blood oxygen, temperature and weight readings with
plain-word assessments. Readings arrive from the Tend Home Station or from **Enter a reading
yourself**. A **Smart watch** card is marked *Coming soon*. Saved readings also appear in
the activity list and in what the Care Companion can talk about.

### Settings
The **Settings** button in the header has a text-size slider (90% to 160%, applied live and
remembered) and the app language. The elder starts with larger text by default.

## How Adaption AI is used

All AI features call [Adaption](https://docs.adaptionlabs.ai) from the server
(`lib/adaption.ts`). Replies are requested as JSON and validated with zod.

1. **Prescription import** (`extractMedications`): a vision model transcribes the photo,
   then the text is read into structured medicines for a person to review.
2. **Care Companion** (`companionReply`): answers from the family's own record, grounded on
   a care-guidance dataset through an Adaption **Inference Stack** with `file_search`.
3. **Adaptive Data** (`scripts/adaption-dataset.ts`): the guidance dataset
   (`data/eldercare-guidance.jsonl`, 48 rows) is uploaded, adapted and evaluated by
   Adaption. The quality grade rose from C to B (score 6 to 8.3); the result is saved in
   `data/adaption-eval.json`.
4. **Visit preparation** (`suggestVisitQuestions`): questions to ask the doctor.
5. **Weekly update** (`writeDigest`): the model only turns numbers computed in code into a
   few sentences.

Safety rules are part of every prompt: the model never changes a dose, sends emergencies to
112, and treats record text as data rather than instructions.

## Google services

- **Gmail** (SMTP) delivers every reminder email.
- **Google Calendar** links add a doctor visit to a calendar in one click.
- **Google Fonts** serves Atkinson Hyperlegible Next.
- **Gemma**, Google's open model, is the chat and vision model, served through Adaption.
- **Chrome's speech service** powers listening when the app is used in Chrome.
- **Cloud Run**: a `Dockerfile` and Next.js standalone output are included for a container
  deploy.

## Accessibility

Atkinson Hyperlegible typeface (designed for low-vision readers), 18px base text with an
adjustable text size, touch targets of at least 44–48px, visible focus rings, a skip link,
labelled form fields with announced errors, status shown with icon and text (never colour
alone), live regions for updates, reduced-motion support, a page title on every screen,
correct `lang` on Hindi text, and read-aloud. The 3D device is fully usable without the 3D
view.

## Security

- **Server-only data access.** Supabase Postgres is reached only from the server with the
  service-role key. Row Level Security is on with no policies, so the browser cannot read
  or write anything directly.
- **Passcodes** are hashed with scrypt. Sign-in is rate limited and locks for 10 minutes
  after 5 wrong attempts.
- **Sessions** are a signed, HttpOnly JWT cookie (`jose`).
- **Invites.** A separate AES-256-GCM copy of the passcode (key derived from
  `SESSION_SECRET` with HKDF) is decrypted only on request through a rate-limited server
  action, so the passcode never appears in page HTML or in a link.
- **Cron route** requires a bearer secret and returns 401 without it.
- **Headers**: HSTS, `nosniff`, frame denial, a strict referrer policy and a permissions
  policy that allows the microphone on this origin only.
- **Input** is validated with zod on every server action, and email HTML is escaped.

## Architecture

- **Next.js 16** (App Router, TypeScript strict), **Tailwind CSS v4**, **shadcn/ui**.
- **Supabase Postgres** for data, `pg_cron` for the reminder schedule.
- **nodemailer + Gmail SMTP** for email.
- **React Three Fiber + drei** for the device.
- **Pure logic** (schedule, adherence, reminders, parsing, device, voice, translations)
  lives in `lib/` and is covered by 148 Vitest unit tests.

```
app/            pages, server actions, the cron route
components/     UI: public forms, the signed-in family, device, voice, base components
lib/            data access, auth, schedule/adherence/reminder logic, Adaption client, i18n
supabase/       schema.sql (tables + RLS), migrations, cron.sql (reminder schedule)
scripts/        adaption-dataset.ts (Adaptive Data pipeline)
data/           care-guidance dataset and its evaluation
tests/          unit tests
```

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

1. Create a Supabase project and run `supabase/schema.sql`, then the files in
   `supabase/migrations/`, in the SQL editor.
2. Fill in `.env.local` (`.env.example` explains each value).
3. Optional: `npm run adaption:dataset` adapts and evaluates the guidance dataset.

### Dev mode: every screen without signing in
A **Dev mode** button sits in the bottom-right corner of every page. Open it, pick a role
(Elder, Family or Caretaker) and jump straight to Today, Medicines, Visits, Health, Ask,
Family or the 3D device in a ready-made demo family, with no family code or passcode. It
is always on in `npm run dev`; in production it appears only when `DEV_MODE=on` is set,
and it can open nothing except the demo family.

## Deploy

- **Vercel**: import the repository and set the variables from `.env.example`. `APP_URL`
  is optional there; email links fall back to the project's production domain.
- **Cloud Run**: `gcloud run deploy tend --source . --region asia-south1 --allow-unauthenticated`
  (uses the included `Dockerfile`), with `APP_URL` set to the service URL.
- **Reminders**: after deploying, put the live URL and `CRON_SECRET` into
  `supabase/cron.sql` and run it once in the Supabase SQL editor.

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
