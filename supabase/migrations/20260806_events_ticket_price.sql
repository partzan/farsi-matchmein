-- Ticket price for published/voting events (Toman).
alter table public.events
  add column if not exists ticket_price numeric;
