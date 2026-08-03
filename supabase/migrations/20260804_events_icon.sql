-- Event emoji icon chosen by admin during create-event
alter table public.events
  add column if not exists icon text;
