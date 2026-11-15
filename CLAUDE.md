# Tend — elderly care & medication platform

Hackathon build (PromptWars × Catalyst, 6-hour limit, started 2026-11-15 ~10:40 IST).
Full approved plan: `~/.claude/plans/pasted-content-id-876c-hackathon-frolicking-castle.md`.

@AGENTS.md

## What we are building
A shared "care circle" for one elderly person. The elder, family and caretakers open it
with a circle code + passcode. They manage medication schedules, log doses, track
adherence, track doctor appointments, and get email reminders (upcoming dose, missed
dose, appointment). Adaption AI powers prescription import, a grounded Care Companion,
family digests and appointment prep.

## Hackathon rules that drive decisions
- Scored automatically on: code quality, security, efficiency, testing, accessibility,
  problem-statement alignment, use of Google services. Only 2 scored submissions; the
  LAST one counts.
- Deliverables: public GitHub repo, deployed link, short description.
- Deck says Top 10 need a working **Cloud Run** deployment. User chose Vercel + Supabase
  anyway; `output: "standalone"` is set so a Cloud Run deploy stays possible.

## Stack and conventions
- Next.js 16 (App Router, TS strict), Tailwind v4, shadcn/ui (base-ui style), lucide-react.
- **Cache Components are OFF** (removed `cacheComponents` from `next.config.ts`): every
  signed-in page is dynamic and uses `new Date()`, so the classic model is simpler.
- Middleware is called `proxy.ts` in Next 16. `cookies()`, `params` are async.
- Supabase Postgres, reached ONLY from the server with the service-role key
  (`lib/db.ts`). RLS is on with no policies.
- Auth: circle code + 6-digit passcode (scrypt hash), JWT session cookie (`jose`),
  lockout after 5 failures. No Supabase Auth.
- Email: nodemailer + Gmail SMTP. Reminders: Supabase `pg_cron` calls
  `POST /api/cron/reminders` every 10 min with `Bearer CRON_SECRET`.
- Adaption: raw `fetch` to `https://api.prod.adaptionlabs.ai/api/v1/responses`
  (no Node SDK, no JSON mode → ask for JSON, validate with zod).
- Pure logic (schedule, adherence, reminders, parsing) lives in `lib/*` with Vitest
  tests in `tests/`. Keep it pure so it stays testable.
- UI: single typeface Atkinson Hyperlegible Next; "pill organiser" Today view; 18px
  base text, 48px touch targets, visible focus rings.

## Commands
- `npm run dev` · `npm run build` · `npm run lint` · `npx tsc --noEmit` · `npm test`

## Env vars
See `.env.example`. Local values live in `.env.local` (git-ignored).

## Status (update after every milestone)
Last updated: 2026-11-15 ~15:30 IST.
- [x] Scaffold, deps, shadcn, git init, schema.sql, cron.sql, .env.example
- [x] lib: db, session, passcode, lockout, validation, schedule, adherence, reminders,
      reminder-run, email (+templates), adaption, ai (+ai-parse), data, snapshot
- [x] Server actions: auth, medications (+dose log), appointments, ai, circle
- [x] Cron route `/api/cron/reminders` (401 without the bearer secret, verified)
- [x] Screens written: landing, create, join, Today, Medicines (+prescription import),
      Visits, Ask (Companion), Family
- [x] 115 unit tests green (82 at first milestone), lint clean, tsc clean, README written
- [x] Adaption dataset (48 rows) + `scripts/adaption-dataset.ts` written and run
- [x] Supabase URL + secret key set, `schema.sql` run (7 tables verified)
- [x] Gmail SMTP set (reminders.tend@gmail.com), login + test send verified
- [x] Signed-in flows tested end to end in the browser (create, prescription import, dose log, visit + AI prep, Companion, digest, reminders email, join + wrong passcode, cron 401/200)
- [x] Adaption key set; model ids verified; chat model switched qwen3.5-397b → `gemma-4-31b-it` (qwen is a reasoning model: burned the whole token cap on reasoning → empty replies, ~20s)
- [x] Adaption dataset adapted (id 78c54868…): grade C→B, score 6→8.3 (+38.3%), saved to `data/adaption-eval.json`
- [ ] Adaption:
      USER creates an Inference Stack in the Adaption app → set `ADAPTION_STACK_SLUG`
- [x] GitHub repo github.com/chainszw/tend (PRIVATE for now: USER makes it public at submission)
- [x] Invite system: passcode also stored AES-256-GCM encrypted (`passcode_enc`, key = HKDF of
      SESSION_SECRET, `lib/secret-box.ts` + `lib/passcode-vault.ts`); members tap Show on the
      Family page; "Send an invite" shares `/join?code=…` + passcode; "Change the passcode".
      The passcode is never put in a URL. Old circles (null `passcode_enc`) get a reset prompt.
- [x] Family page decluttered (single column, 5 recent changes, AI panel moved to Ask, manual
      "check reminders" button removed)
- [x] `supabase/migrations/002_passcode_enc.sql` run in Supabase; invite flow browser-tested
      (reveal, share, link pre-fill, change passcode, old-circle reset prompt, 390px phone)
- [x] Dev shortcut: in `npm run dev` only (`lib/dev.ts`, NODE_ENV === "development"), the public
      pages show "Developer shortcut" buttons that sign straight into demo circle `DEMO-0000`
      (auto-seeded: 3 members, 4 medicines, 1 visit; random unknown passcode). Absent in prod.
- [x] Prescription camera scan: "Scan with camera" (native camera / photo picker) → photo shrunk
      in browser (`lib/image-resize.ts`) → `scanPrescriptionAction` → Adaption `gemma-4-31b-it`
      transcribes the image (`input_image` data URL, verified working) → extraction → review.
      No extra key. Body limit 5mb.
- [x] Tend Home Station (Phase 2 device): public `/device` page with an interactive 3D model
      (React Three Fiber + drei, original procedural geometry, no GLB) in
      `components/device/*`. The LCD is real HTML (`device-screen.tsx`) placed on the model with
      drei `<Html transform>`; all Html mounts into one overlay div via `OverlayContext` (without
      it the first Html stays empty and the LCD sits off the glass). Pure logic in `lib/device/*`
      (`machine.ts` reducer + voice commands, `readings.ts` simulate/assess/format, `parts.ts`
      bill of materials), tests in `tests/device.test.ts`. "Show inside" = exploded view + parts
      and estimated ₹ costs. Signed out = demo (nothing stored); signed in = `saveReadingAction`
      → `readings` table → `/circle/health` (new "Health" nav item), activity log, Companion and
      digest facts. Voice: speechSynthesis guidance + SpeechRecognition commands (Chrome);
      Permissions-Policy now `microphone=(self)`.
- [x] `supabase/migrations/003_readings.sql` run in Supabase; user confirmed saving works
- [x] Shared voice, English + Hindi (lean scope chosen for time; no Marathi, no neural TTS, no
      voice picker): `lib/voice/language.ts` (pure: languages, `pickVoice`, `speakable`,
      `splitForSpeech`; `tests/voice.test.ts`) + `components/voice/*` (`voice-store.ts` = language
      + auto-read in localStorage and the single speech channel; `use-listening.ts`;
      `language-select.tsx`; `mic-button.tsx`). Ask: mic fills the editable box (never
      auto-submits), play/stop per answer, auto-read, `askCompanionAction(messages, language)`.
      Device: Hindi prompts/commands in `lib/device/machine.ts` + `readings.ts`, "Speak to the
      device" button on every screen, save only after yes/Save. Tested in headless Chrome with a
      simulated recogniser; real mic input and audio quality NOT yet checked by ear.
- [x] Ask page is a single chat card (header language switch + speaker toggle, mic/send composer).
- [x] Header "Settings" menu (`components/circle/settings-menu.tsx`): text size + app language.
      One language for page AND voice: cookie `tend_lang` (`setLanguageAction`, `resolveLanguage`),
      `LanguageProvider`/`useT()` (client) or `messages(await pageLanguage())` (server), words in
      `lib/i18n.ts` (typed: Hindi must have every English key, `tests/i18n.test.ts`). Translated so
      far: shell, nav, Settings, Today, Ask. Medicines/Visits/Health/Family still English.
- [x] Health page: "Enter a reading yourself" manual form (`addManualReadingAction`, pure
      `readingFromTyped` in `lib/device/readings.ts`) + "Smart watch — Coming soon" placeholder card (UI only).
- [x] Finalization: Hindi labelled "Beta" in `LanguageSelect` (`isBetaLanguage` in
      `lib/voice/language.ts`, note in Settings); browser tab = `app/icon.svg` capsule + title
      "Tend" (template `Tend | %s`); README rewritten feature by feature; 143 tests green.
      `APP_URL` is optional on Vercel (falls back to `VERCEL_PROJECT_PRODUCTION_URL`).
- [x] Vercel deploy: https://tend-software.vercel.app (project `arahant1/tend`, auto-deploys on
      push to `main`). `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` come from the Vercel Supabase
      integration (same project as local); the other secrets were added with `vercel env add`.
      `ADAPTION_STACK_SLUG` is still unset. Public pages, tab title/icon, Beta pill, cron 401 checked;
      a real sign-in on production is NOT yet verified.
- [ ] Run `supabase/cron.sql` with the live URL (USER, in the Supabase SQL editor)
- [ ] Production smoke test, submission #1, final submission #2

## Known gaps / ideas if time allows
- Elder approval of changes proposed by family (P2).
- Dockerfile for Cloud Run (deck says Top 10 need a Cloud Run link).
- `scripts/adaption-dataset.ts`: the upload/initiate response may not include `s3_key`
  (docs are inconsistent); the script falls back to the key in the pre-signed URL path.

## Phase 2 (device built, see Status; not done: sign-up question "Do you have the Tend device?", 2-user mode)
- Interactive Tend device simulator styled on an upper-arm BP monitor: SYS/DIA/PULSE digital
  display, physical-style START/STOP button, memory recall, 2-user mode, irregular-heartbeat
  flag, animated inflate/deflate progress, simulated readings.
- Sign-up question "Do you have the Tend device?" → if yes, connect it and show a richer but
  still simple dashboard (readings, averages, trends).
- MUST reuse the same backend, DB, circle/member records and lib logic. No second app and no
  duplicated business logic.

## Next step
Deploy to Vercel, run `supabase/cron.sql`, production smoke test, submit.
