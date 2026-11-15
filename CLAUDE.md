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
Last updated: 2026-11-15 ~12:25 IST.
- [x] Scaffold, deps, shadcn, git init, schema.sql, cron.sql, .env.example
- [x] lib: db, session, passcode, lockout, validation, schedule, adherence, reminders,
      reminder-run, email (+templates), adaption, ai (+ai-parse), data, snapshot
- [x] Server actions: auth, medications (+dose log), appointments, ai, circle
- [x] Cron route `/api/cron/reminders` (401 without the bearer secret, verified)
- [x] Screens written: landing, create, join, Today, Medicines (+prescription import),
      Visits, Ask (Companion), Family
- [x] 82 unit tests green, lint clean, tsc clean, README written
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
- [ ] Vercel deploy (set env vars + APP_URL), run `supabase/cron.sql`
- [ ] Production smoke test, submission #1, final submission #2

## Known gaps / ideas if time allows
- Elder approval of changes proposed by family (P2).
- Dockerfile for Cloud Run (deck says Top 10 need a Cloud Run link).
- `scripts/adaption-dataset.ts`: the upload/initiate response may not include `s3_key`
  (docs are inconsistent); the script falls back to the key in the pre-signed URL path.

## Phase 2 (do NOT start until the user says so)
- Interactive Tend device simulator styled on an upper-arm BP monitor: SYS/DIA/PULSE digital
  display, physical-style START/STOP button, memory recall, 2-user mode, irregular-heartbeat
  flag, animated inflate/deflate progress, simulated readings.
- Sign-up question "Do you have the Tend device?" → if yes, connect it and show a richer but
  still simple dashboard (readings, averages, trends).
- MUST reuse the same backend, DB, circle/member records and lib logic. No second app and no
  duplicated business logic.

## Next step
Design overhaul (user will brief), then deploy.
