-- Adds device readings. Run once in the Supabase SQL editor.
-- Readings from the Tend Home Station (BP cuff, finger clip, thermometer, scale).
create table if not exists readings (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  kind text not null check (kind in ('bp', 'spo2', 'temp', 'weight')),
  systolic int check (systolic between 60 and 260),
  diastolic int check (diastolic between 30 and 160),
  pulse int check (pulse between 30 and 220),
  spo2 int check (spo2 between 50 and 100),
  temperature_c numeric(4, 1) check (temperature_c between 30 and 45),
  weight_kg numeric(5, 1) check (weight_kg between 20 and 250),
  irregular boolean not null default false,
  taken_at timestamptz not null default now(),
  logged_by uuid references members (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists readings_circle_time_idx on readings (circle_id, taken_at desc);

-- Same rule as every other table: RLS on, no policies, server-only access.
alter table readings enable row level security;
