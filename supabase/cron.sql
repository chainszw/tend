-- Reminder schedule. Run in the Supabase SQL editor AFTER the app is deployed.
-- Replace YOUR_APP_URL and YOUR_CRON_SECRET (same value as the CRON_SECRET env var).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('tend-reminders')
where exists (select 1 from cron.job where jobname = 'tend-reminders');

select cron.schedule(
  'tend-reminders',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_APP_URL/api/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_CRON_SECRET'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Check recent runs:
--   select * from cron.job_run_details order by start_time desc limit 5;
--   select status_code, content from net._http_response order by created desc limit 5;
