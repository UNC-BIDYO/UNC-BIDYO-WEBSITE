-- Several services per booking, and crew split into photographers and videographers.
-- Run once in Supabase → SQL Editor (safe to run again), BEFORE deploying the matching code.

-- 1. services text[] replaces service text.
alter table public.bookings add column if not exists services text[];
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings' and column_name = 'service'
  ) then
    update public.bookings set services = array[service] where services is null;
    alter table public.bookings drop column service;
  end if;
end $$;
update public.bookings set services = array['Other'] where services is null or cardinality(services) = 0;
alter table public.bookings alter column services set not null;
alter table public.bookings drop constraint if exists bookings_services_check;
alter table public.bookings
  add constraint bookings_services_check check (cardinality(services) >= 1);

-- 2. Crew per role. Older rows didn't say which role, so their shooters count as photographers.
alter table public.bookings
  add column if not exists photographers smallint not null default 0,
  add column if not exists videographers smallint not null default 0;
update public.bookings
   set photographers = shooters
 where photographers = 0 and videographers = 0;
alter table public.bookings drop constraint if exists bookings_crew_check;
alter table public.bookings
  add constraint bookings_crew_check check (
    photographers between 0 and 10
    and videographers between 0 and 10
    and photographers + videographers >= 1
  );
-- shooters stays as the total (written by the server), for sorting and older views.
