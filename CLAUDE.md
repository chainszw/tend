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
Last updated: 2026-11-15 ~11:05 IST.
- [x] Scaffold, deps, shadcn, git init, schema.sql, cron.sql, .env.example
- [x] lib: db, session, passcode, lockout, validation, schedule, adherence, reminders,
      reminder-run, email (+templates), adaption, ai (+ai-parse), data, snapshot
- [x] Server actions: auth, medications (+dose log), appointments, ai, circle
- [x] Cron route `/api/cron/reminders` (401 without the bearer secret, verified)
- [x] Screens written: landing, create, join, Today, Medicines (+prescription import),
      Visits, Ask (Companion), Family
- [x] 82 unit tests green, lint clean, tsc clean, README written
- [x] Adaption dataset (48 rows) + `scripts/adaption-dataset.ts` written (NOT yet run)
- [ ] USER: fill `.env.local` (Supabase URL + service-role key, Adaption key, Gmail user +
      app password) and run `supabase/schema.sql`
- [ ] Signed-in flows tested end to end in the browser (blocked on the env values above)
- [ ] Adaption: verify model ids with `GET /api/v1/models`; run `npm run adaption:dataset`;
      USER creates an Inference Stack in the Adaption app → set `ADAPTION_STACK_SLUG`
- [ ] GitHub repo public, Vercel deploy (set env vars + APP_URL), run `supabase/cron.sql`
- [ ] Production smoke test, submission #1, final submission #2

## Known gaps / ideas if time allows
- Elder approval of changes proposed by family (P2).
- Dockerfile for Cloud Run (deck says Top 10 need a Cloud Run link).
- `scripts/adaption-dataset.ts`: the upload/initiate response may not include `s3_key`
  (docs are inconsistent); the script falls back to the key in the pre-signed URL path.

## Next step
Get env values from the user, then test create → join → add medicine → log dose →
appointment → Companion → reminders in the browser, fix what breaks, then deploy.
