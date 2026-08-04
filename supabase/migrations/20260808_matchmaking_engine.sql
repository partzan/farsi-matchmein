-- Matchmaking Engine: most/less suitable interests, broad_key mapping,
-- rule-based event ↔ user matching, and profile notifications.
-- No LLM. Phase-1 visibility: event most_suitable broads ∩ user primary broads.

-- 1) Interest categories → broad key (one of 8 primary categories)
alter table public.interest_categories
  add column if not exists broad_key text;

create index if not exists interest_categories_broad_key_idx
  on public.interest_categories (broad_key)
  where broad_key is not null;

create temporary table _broad_name_map (
  norm_name text primary key,
  broad_key text not null
);

insert into _broad_name_map (norm_name, broad_key) values
  ('fine dining', 'food_fun'),
  ('street food', 'food_fun'),
  ('vegan cooking', 'food_fun'),
  ('bbq & grilling', 'food_fun'),
  ('sushi making', 'food_fun'),
  ('baking bread', 'food_fun'),
  ('food photography', 'food_fun'),
  ('coffee socials', 'civic_social'),
  ('baking', 'arts_creative'),
  ('cooking classes', 'food_fun'),
  ('picnics', 'food_fun'),
  ('hiking', 'nature_travel'),
  ('camping', 'nature_travel'),
  ('surfing', 'nature_travel'),
  ('skiing & snowboarding', 'nature_travel'),
  ('scuba diving', 'nature_travel'),
  ('kayaking', 'nature_travel'),
  ('birdwatching', 'nature_travel'),
  ('fishing', 'nature_travel'),
  ('mountain biking', 'nature_travel'),
  ('sailing', 'nature_travel'),
  ('rock climbing', 'nature_travel'),
  ('day trips', 'nature_travel'),
  ('city walks', 'nature_travel'),
  ('creative writing', 'culture_lit'),
  ('reading & book clubs', 'culture_lit'),
  ('museums & galleries', 'culture_lit'),
  ('language exchange', 'civic_social'),
  ('live podcasts', 'culture_lit'),
  ('journaling', 'sports_lifestyle'),
  ('poetry', 'culture_lit'),
  ('calligraphy', 'arts_creative'),
  ('board games', 'games_fun'),
  ('video gaming', 'games_fun'),
  ('chess', 'games_fun'),
  ('dungeons & dragons', 'games_fun'),
  ('magic: the gathering', 'games_fun'),
  ('trivia nights', 'games_fun'),
  ('karaoke', 'games_fun'),
  ('model building', 'games_fun'),
  ('board game cafes', 'games_fun'),
  ('theater & acting', 'theater_cinema'),
  ('film & cinema', 'theater_cinema'),
  ('live music', 'theater_cinema'),
  ('dance', 'theater_cinema'),
  ('comedy clubs', 'theater_cinema'),
  ('soccer', 'sports_lifestyle'),
  ('wrestling', 'sports_lifestyle'),
  ('basketball', 'sports_lifestyle'),
  ('tennis', 'sports_lifestyle'),
  ('martial arts', 'sports_lifestyle'),
  ('bodybuilding', 'sports_lifestyle'),
  ('yoga', 'sports_lifestyle'),
  ('meditation', 'sports_lifestyle'),
  ('running', 'sports_lifestyle'),
  ('cycling', 'sports_lifestyle'),
  ('swimming', 'sports_lifestyle'),
  ('minimalism', 'sports_lifestyle'),
  ('self-improvement', 'sports_lifestyle'),
  ('sustainable living', 'sports_lifestyle'),
  ('personal finance', 'sports_lifestyle'),
  ('gardening', 'sports_lifestyle'),
  ('painting', 'arts_creative'),
  ('photography', 'arts_creative'),
  ('fashion & design', 'arts_creative'),
  ('pottery & ceramics', 'arts_creative'),
  ('architecture', 'arts_creative'),
  ('diy & woodworking', 'arts_creative'),
  ('knitting & crochet', 'arts_creative'),
  ('volunteering', 'civic_social'),
  ('networking', 'civic_social'),
  ('community service', 'civic_social'),
  ('charity events', 'civic_social'),
  ('local meetups', 'civic_social'),
  ('coffee social clubs', 'civic_social'),
  ('coffee social', 'civic_social'),
  ('local meetup', 'civic_social'),
  ('community services', 'civic_social'),
  ('charity event', 'civic_social'),
  ('volunteer', 'civic_social');

update public.interest_categories ic
set broad_key = m.broad_key
from _broad_name_map m
where lower(btrim(regexp_replace(ic.name, '^[^A-Za-z0-9]+', ''))) = m.norm_name
   or lower(btrim(regexp_replace(ic.name, '^[^A-Za-z0-9]+', ''))) like ('%' || m.norm_name || '%');

drop table _broad_name_map;

-- 2) Event suitability fields
alter table public.events
  add column if not exists most_suitable_interest_ids uuid[] default null,
  add column if not exists less_suitable_interest_ids uuid[] default null,
  add column if not exists most_suitable_broad_ids text[] default null;

update public.events
set most_suitable_interest_ids = targeted_interest_ids
where most_suitable_interest_ids is null
  and targeted_interest_ids is not null
  and cardinality(targeted_interest_ids) > 0;

update public.events e
set most_suitable_broad_ids = sub.broads
from (
  select
    e2.id,
    array_agg(distinct ic.broad_key) filter (where ic.broad_key is not null) as broads
  from public.events e2
  cross join lateral unnest(
    coalesce(e2.most_suitable_interest_ids, e2.targeted_interest_ids, array[]::uuid[])
  ) as mid
  join public.interest_categories ic on ic.id = mid
  group by e2.id
) sub
where e.id = sub.id
  and e.most_suitable_broad_ids is null
  and sub.broads is not null;

create or replace function public.sync_event_targeted_from_most_suitable()
returns trigger
language plpgsql
as $function$
begin
  if new.most_suitable_interest_ids is not null then
    new.targeted_interest_ids := new.most_suitable_interest_ids;
  elsif new.targeted_interest_ids is not null and new.most_suitable_interest_ids is null then
    new.most_suitable_interest_ids := new.targeted_interest_ids;
  end if;

  -- Prefer explicit broad ids (e.g. admin chose the 8-category key).
  -- Otherwise derive from leaf interests via interest_categories.broad_key.
  if new.most_suitable_broad_ids is null or cardinality(new.most_suitable_broad_ids) = 0 then
    if new.most_suitable_interest_ids is not null then
      select coalesce(array_agg(distinct ic.broad_key), array[]::text[])
        into new.most_suitable_broad_ids
      from unnest(new.most_suitable_interest_ids) as mid
      join public.interest_categories ic on ic.id = mid
      where ic.broad_key is not null;
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_sync_event_suitability on public.events;
create trigger trg_sync_event_suitability
  before insert or update of most_suitable_interest_ids, targeted_interest_ids, less_suitable_interest_ids
  on public.events
  for each row execute function public.sync_event_targeted_from_most_suitable();

-- 3) Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  type text not null default 'event_match',
  title text not null,
  body text,
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications." on public.notifications;
create policy "Users can view own notifications." on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications." on public.notifications;
create policy "Users can update own notifications." on public.notifications
  for update using (auth.uid() = user_id);

revoke insert on public.notifications from anon, authenticated;

-- 4) Match recompute (broad-key overlap; no LLM)
create or replace function public.compute_event_matches(new_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  most_ids uuid[];
  less_ids uuid[];
  most_broads text[];
  less_broads text[];
begin
  select
    coalesce(most_suitable_interest_ids, targeted_interest_ids),
    less_suitable_interest_ids,
    most_suitable_broad_ids
  into most_ids, less_ids, most_broads
  from public.events
  where id = new_event_id;

  if most_broads is null or cardinality(most_broads) = 0 then
    select coalesce(array_agg(distinct ic.broad_key), array[]::text[])
      into most_broads
    from unnest(coalesce(most_ids, array[]::uuid[])) as mid
    join public.interest_categories ic on ic.id = mid
    where ic.broad_key is not null;
  end if;

  select coalesce(array_agg(distinct ic.broad_key), array[]::text[])
    into less_broads
  from unnest(coalesce(less_ids, array[]::uuid[])) as lid
  join public.interest_categories ic on ic.id = lid
  where ic.broad_key is not null;

  delete from public.event_matches where event_id = new_event_id;

  if most_broads is null or cardinality(most_broads) = 0 then
    return;
  end if;

  insert into public.event_matches (event_id, user_id, match_tier, is_active)
  select distinct new_event_id, ui.user_id, 'high', true
  from public.user_interests ui
  join public.interest_categories ic on ic.id = ui.category_id
  where ui.priority_level = 1
    and ic.broad_key is not null
    and ic.broad_key = any(most_broads)
  on conflict (event_id, user_id) do update
    set match_tier = 'high', is_active = true;

  insert into public.event_matches (event_id, user_id, match_tier, is_active)
  select distinct new_event_id, ui.user_id, 'normal', false
  from public.user_interests ui
  join public.interest_categories ic on ic.id = ui.category_id
  where (
      (ui.priority_level = 1 and less_broads is not null and ic.broad_key = any(less_broads))
      or (ui.priority_level = 2 and ic.broad_key = any(most_broads))
    )
    and ic.broad_key is not null
  on conflict (event_id, user_id) do nothing;
end;
$function$;

-- 5) Notify when event becomes active
create or replace function public.notify_users_on_matching_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  msg_title text := 'ایونت جدیدی مطابق علایق شما اضافه شد';
  became_active boolean;
begin
  became_active :=
    new.status = 'active'
    and (tg_op = 'INSERT' or coalesce(old.status, '') is distinct from 'active');

  if not became_active then
    return new;
  end if;

  perform public.compute_event_matches(new.id);

  insert into public.notifications (user_id, event_id, type, title, body)
  select em.user_id, new.id, 'event_match', msg_title, new.title
  from public.event_matches em
  where em.event_id = new.id
    and em.match_tier = 'high'
    and em.is_active = true
    and em.user_id is distinct from new.host_id
    and not exists (
      select 1 from public.notifications n
      where n.user_id = em.user_id
        and n.event_id = new.id
        and n.type = 'event_match'
    );

  return new;
end;
$function$;

drop trigger if exists trg_notify_matching_event on public.events;
create trigger trg_notify_matching_event
  after insert or update of status, most_suitable_interest_ids, most_suitable_broad_ids, targeted_interest_ids
  on public.events
  for each row execute function public.notify_users_on_matching_event();

-- 6) Helper: primary broad keys for a user
create or replace function public.user_primary_broad_ids(p_user_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $function$
  select coalesce(array_agg(distinct ic.broad_key), array[]::text[])
  from public.user_interests ui
  join public.interest_categories ic on ic.id = ui.category_id
  where ui.user_id = p_user_id
    and ui.priority_level = 1
    and ic.broad_key is not null;
$function$;

grant execute on function public.user_primary_broad_ids(uuid) to authenticated, anon;
grant execute on function public.compute_event_matches(uuid) to authenticated;
