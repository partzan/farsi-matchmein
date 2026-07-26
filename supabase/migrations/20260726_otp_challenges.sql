-- Phone OTP challenges (Kavenegar) + optional phone on profiles
-- Run in Supabase SQL editor (or via CLI migration).

create table if not exists public.otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  purpose text not null check (purpose in ('login', 'signup', 'phone_change')),
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists otp_challenges_phone_created_idx
  on public.otp_challenges (phone, created_at desc);

alter table public.otp_challenges enable row level security;
-- No client policies: only service role (Edge Functions) should touch this table.

alter table public.users
  add column if not exists phone text;

create unique index if not exists users_phone_unique
  on public.users (phone)
  where phone is not null;
