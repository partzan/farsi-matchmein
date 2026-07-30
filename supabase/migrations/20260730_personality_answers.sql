-- Personality quiz answers (JSON map of question_id -> option_id)
alter table public.users
  add column if not exists personality_answers jsonb default '{}'::jsonb;
