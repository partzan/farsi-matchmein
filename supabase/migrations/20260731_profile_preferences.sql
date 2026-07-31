-- Profile matching preferences: birth date, event age range, introversion range, marital status
alter table public.users
  add column if not exists birth_date date,
  add column if not exists event_age_min integer,
  add column if not exists event_age_max integer,
  add column if not exists introversion_min integer,
  add column if not exists introversion_max integer,
  add column if not exists marital_status text;

alter table public.users
  drop constraint if exists users_event_age_range_check;
alter table public.users
  add constraint users_event_age_range_check
  check (
    event_age_min is null
    or event_age_max is null
    or (event_age_min >= 15 and event_age_max <= 80 and event_age_min <= event_age_max)
  );

alter table public.users
  drop constraint if exists users_introversion_range_check;
alter table public.users
  add constraint users_introversion_range_check
  check (
    introversion_min is null
    or introversion_max is null
    or (introversion_min >= 1 and introversion_max <= 10 and introversion_min <= introversion_max)
  );

alter table public.users
  drop constraint if exists users_marital_status_check;
alter table public.users
  add constraint users_marital_status_check
  check (
    marital_status is null
    or marital_status in ('single', 'married')
  );
