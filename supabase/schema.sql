-- UNC Bidyo booking requests. Paste into Supabase → SQL Editor → Run (safe to run again).

create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  status        text not null default 'pending'
                check (status in ('pending', 'approved', 'declined')),
  first_name    text not null,
  middle_name   text,
  last_name     text not null,
  email         text not null,
  mobile        text not null,
  organization  text not null,
  event_title   text not null,
  service       text not null,
  start_date    date not null,
  end_date      date check (end_date is null or end_date > start_date),
  venue         text not null,
  shooters      smallint not null check (shooters between 1 and 20),
  requests      text,
  letter_path   text, -- path inside the private "letters" bucket
  -- Set by the admin panel (/api/admin/decide) and the overlap check (/api/book).
  decided_at          timestamptz,
  decided_by          text,
  decision_reason     text,
  auto_declined       boolean not null default false,
  calendar_event_id   text, -- Google Calendar event created on approval
  calendar_sync_error text  -- last error creating it, if any
);

comment on table public.bookings is
  'Booking requests from uncbidyo.org. Written by /api/book; approved or declined in the admin panel (/admin).';

create index if not exists bookings_created_at_idx on public.bookings (created_at desc);
create index if not exists bookings_status_idx on public.bookings (status);

-- Row Level Security on, with no policies: the public (anon) key can't read or write anything.
-- Only the server-side service-role key used by /api/book can, since it bypasses RLS.
alter table public.bookings enable row level security;

-- Admin settings (key → JSON value), e.g. overlap_check. Server key only, like bookings.
create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;
insert into public.settings (key, value) values ('overlap_check', 'false')
on conflict (key) do nothing;

-- Private bucket for formal letters (max 4 MB; PDF, Word, JPG, PNG).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'letters', 'letters', false, 4194304,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
