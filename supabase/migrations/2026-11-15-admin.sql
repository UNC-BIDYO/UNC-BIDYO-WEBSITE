-- Admin panel: approval statuses, decision fields, Google Calendar sync fields, and settings.
-- Run once in Supabase → SQL Editor (safe to run again), before deploying the admin panel.

-- 1. Statuses become pending / approved / declined.
alter table public.bookings drop constraint if exists bookings_status_check;
update public.bookings set status = 'pending'  where status = 'new';
update public.bookings set status = 'approved' where status in ('confirmed', 'done');
alter table public.bookings alter column status set default 'pending';
alter table public.bookings
  add constraint bookings_status_check check (status in ('pending', 'approved', 'declined'));

-- 2. Who decided, when and why; whether it was declined automatically (date clash).
alter table public.bookings
  add column if not exists decided_at          timestamptz,
  add column if not exists decided_by          text,
  add column if not exists decision_reason     text,
  add column if not exists auto_declined       boolean not null default false,
  -- Google Calendar event created on approval, or the last error trying.
  add column if not exists calendar_event_id   text,
  add column if not exists calendar_sync_error text;

create index if not exists bookings_status_idx on public.bookings (status);

-- 3. Admin settings (key → JSON value). Row Level Security on, no policies: server key only.
create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;
insert into public.settings (key, value) values ('overlap_check', 'false')
on conflict (key) do nothing;
