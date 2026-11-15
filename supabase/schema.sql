-- Tend: elderly care & medication platform. Run once in the Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists circles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  elder_name text not null,
  elder_email text,
  passcode_hash text not null,
  passcode_enc text,                            -- AES-GCM, shown to signed-in members
  timezone text not null default 'Asia/Kolkata',
  failed_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

-- Upgrading an existing database: supabase/migrations/002_passcode_enc.sql
alter table circles add column if not exists passcode_enc text;

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  name text not null,
  email text,
  role text not null check (role in ('elder', 'family', 'caretaker')),
  notify boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists members_circle_idx on members (circle_id);
create unique index if not exists members_circle_email_idx
  on members (circle_id, lower(email)) where email is not null;

create table if not exists medications (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  name text not null,
  dosage text not null default '',
  instructions text not null default '',
  purpose text not null default '',
  times text[] not null default '{}',          -- local 'HH:MM' strings
  days int[] not null default '{0,1,2,3,4,5,6}', -- 0 = Sunday
  start_date date not null default current_date,
  end_date date,
  active boolean not null default true,
  created_by uuid references members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists medications_circle_idx on medications (circle_id);

create table if not exists dose_logs (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  medication_id uuid not null references medications (id) on delete cascade,
  scheduled_for timestamptz not null,
  status text not null check (status in ('taken', 'skipped')),
  logged_by uuid references members (id) on delete set null,
  logged_at timestamptz not null default now(),
  unique (medication_id, scheduled_for)
);
create index if not exists dose_logs_circle_time_idx
  on dose_logs (circle_id, scheduled_for);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  doctor text not null,
  specialty text not null default '',
  location text not null default '',
  starts_at timestamptz not null,
  notes text not null default '',
  prep_questions text[] not null default '{}',
  created_by uuid references members (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists appointments_circle_time_idx
  on appointments (circle_id, starts_at);

create table if not exists activity (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  member_name text not null,
  member_role text not null,
  summary text not null,
  created_at timestamptz not null default now()
);
create index if not exists activity_circle_time_idx
  on activity (circle_id, created_at desc);

create table if not exists notifications_sent (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  ref_key text not null unique,
  kind text not null,
  sent_at timestamptz not null default now()
);

-- Row Level Security: enabled with NO policies. The browser (anon key) can
-- read or write nothing; only the server (service-role key) reaches the data.
alter table circles enable row level security;
alter table members enable row level security;
alter table medications enable row level security;
alter table dose_logs enable row level security;
alter table appointments enable row level security;
alter table activity enable row level security;
alter table notifications_sent enable row level security;
