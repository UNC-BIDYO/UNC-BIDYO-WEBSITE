-- UNC Bidyo booking requests. Paste into Supabase → SQL Editor → Run (safe to run again).

create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  status        text not null default 'new'
                check (status in ('new', 'confirmed', 'declined', 'done')),
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
  letter_path   text  -- path inside the private "letters" bucket
);

comment on table public.bookings is
  'Booking requests from uncbidyo.org. Written by the /api/book Vercel function. Update "status" as you handle them.';

create index if not exists bookings_created_at_idx on public.bookings (created_at desc);

-- Row Level Security on, with no policies: the public (anon) key can't read or write anything.
-- Only the server-side service-role key used by /api/book can, since it bypasses RLS.
alter table public.bookings enable row level security;

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
