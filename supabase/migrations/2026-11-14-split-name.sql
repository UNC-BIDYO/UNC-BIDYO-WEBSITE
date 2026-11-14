-- Splits bookings.name into first_name, middle_name (optional) and last_name.
-- For a project set up with the first version of schema.sql. Run once in Supabase → SQL Editor,
-- BEFORE the website code that sends first/middle/last names is deployed. Safe to run again.

alter table public.bookings
  add column if not exists first_name  text,
  add column if not exists middle_name text,
  add column if not exists last_name   text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings' and column_name = 'name'
  ) then
    -- Existing rows (likely only tests): first word becomes the first name, the rest the last name.
    update public.bookings
       set first_name = coalesce(first_name, split_part(btrim(name), ' ', 1)),
           last_name  = coalesce(last_name, nullif(btrim(substr(btrim(name), length(split_part(btrim(name), ' ', 1)) + 1)), ''), '')
     where first_name is null or last_name is null;
    alter table public.bookings drop column name;
  end if;
end $$;

alter table public.bookings
  alter column first_name set not null,
  alter column last_name  set not null;
