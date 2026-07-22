-- Enable PostGIS extension for location features
create extension if not exists postgis;

-- Enable pgvector extension for LLM matchmaking
create extension if not exists vector;

-- Users table
create table public.users (
  id uuid references auth.users not null primary key,
  display_name text,
  bio text,
  avatar_url text,
  city text,
  location geography(Point, 4326),
  embedding vector(768),
  rank text default 'user' check (rank in ('guest', 'user', 'moderator', 'administrator')),
  profile_updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  embedding_updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Interest Categories
create table public.interest_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  group_name text,
  emoji text,
  tagline text
);

-- User Interests (Many-to-Many)
create table public.user_interests (
  user_id uuid references public.users(id) on delete cascade not null,
  category_id uuid references public.interest_categories(id) on delete cascade not null,
  primary key (user_id, category_id)
);

-- Events
create table public.events (
  id uuid default gen_random_uuid() primary key,
  host_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  category_id uuid references public.interest_categories(id) on delete set null,
  location text not null, -- Can be expanded to geography if needed, keeping text for physical address/name
  datetime timestamp with time zone not null,
  max_attendees integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Event RSVPs
create table public.event_rsvps (
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  status text not null check (status in ('going', 'interested', 'declined')),
  primary key (event_id, user_id)
);

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.interest_categories enable row level security;
alter table public.user_interests enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;

-- Policies

-- users: anyone authenticated can select (public profiles), only the row owner can update/delete their own row (auth.uid() = id)
create policy "Public profiles are viewable by everyone." on public.users
  for select using (auth.role() = 'authenticated');

create policy "Users can update own profile." on public.users
  for update using (auth.uid() = id);

create policy "Users can delete own profile." on public.users
  for delete using (auth.uid() = id);

-- interest_categories: public select, no insert/update for regular users (admin-managed)
create policy "Interest categories are viewable by everyone." on public.interest_categories
  for select using (true); -- Publicly viewable so logged out users could theoretically see them too, or limit to authenticated.

-- user_interests: owner can insert/delete their own rows, public select
create policy "User interests are viewable by everyone." on public.user_interests
  for select using (auth.role() = 'authenticated');

create policy "Users can insert own interests." on public.user_interests
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own interests." on public.user_interests
  for delete using (auth.uid() = user_id);

-- events: public select, only host_id = auth.uid() can update/delete, any authenticated user can insert (as host)
create policy "Events are viewable by everyone." on public.events
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can create events." on public.events
  for insert with check (auth.role() = 'authenticated');

create policy "Hosts can update their own events." on public.events
  for update using (auth.uid() = host_id);

create policy "Hosts can delete their own events." on public.events
  for delete using (auth.uid() = host_id);

-- event_rsvps: owner can insert/update/delete their own RSVP, public select (so attendee counts work)
create policy "RSVPs are viewable by everyone." on public.event_rsvps
  for select using (auth.role() = 'authenticated');

create policy "Users can RSVP to events." on public.event_rsvps
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own RSVP." on public.event_rsvps
  for update using (auth.uid() = user_id);

create policy "Users can delete their own RSVP." on public.event_rsvps
  for delete using (auth.uid() = user_id);

-- Trigger to create a public.users row when a new auth user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RPC for suggesting connections based on shared interests
create or replace function public.get_suggested_connections(current_user_id uuid)
returns table (
  id uuid,
  display_name text,
  city text,
  avatar_url text,
  bio text,
  shared_interests_count bigint
) as $$
begin
  return query
  select 
    u.id,
    u.display_name,
    u.city,
    u.avatar_url,
    u.bio,
    count(ui2.category_id) as shared_interests_count
  from public.users u
  join public.user_interests ui2 on ui2.user_id = u.id
  join public.user_interests ui1 on ui1.category_id = ui2.category_id and ui1.user_id = current_user_id
  where u.id != current_user_id
  group by u.id, u.display_name, u.city, u.avatar_url, u.bio
  having count(ui2.category_id) >= 2
  order by shared_interests_count desc;
end;
$$ language plpgsql security definer;

-- RPC for hybrid LLM + Category matchmaking
create or replace function public.get_hybrid_connections(current_user_id uuid)
returns table (
  id uuid,
  display_name text,
  city text,
  avatar_url text,
  bio text,
  shared_interests_count bigint,
  hybrid_score float
) as $$
declare
  my_embedding vector(768);
  my_interest_count bigint;
  my_preferred_genders text[];
  my_looking_for text[];
begin
  select embedding, preferred_genders, looking_for 
  into my_embedding, my_preferred_genders, my_looking_for 
  from public.users where users.id = current_user_id;
  
  select count(*) into my_interest_count from public.user_interests where user_id = current_user_id;

  return query
  select 
    u.id,
    u.display_name,
    u.city,
    u.avatar_url,
    u.bio,
    count(ui2.category_id) as shared_interests_count,
    -- Hybrid score calculation (Jaccard similarity + Cosine similarity)
    case 
      when u.embedding is not null and my_embedding is not null and my_interest_count > 0 then
        (1 - (u.embedding <=> my_embedding)) * 0.7 + 
        (count(ui2.category_id)::float / (my_interest_count + (select count(*) from public.user_interests ui3 where ui3.user_id = u.id) - count(ui2.category_id))) * 0.3
      when my_interest_count > 0 then
        (count(ui2.category_id)::float / (my_interest_count + (select count(*) from public.user_interests ui3 where ui3.user_id = u.id) - count(ui2.category_id)))
      else
        0
    end as hybrid_score
  from public.users u
  join public.user_interests ui2 on ui2.user_id = u.id
  join public.user_interests ui1 on ui1.category_id = ui2.category_id and ui1.user_id = current_user_id
  where u.id != current_user_id
    and (array_position(my_preferred_genders, 'everyone') is not null or u.gender = any(my_preferred_genders))
    and (u.looking_for && my_looking_for)
  group by u.id, u.display_name, u.city, u.avatar_url, u.bio, u.embedding
  having count(ui2.category_id) >= 2
  order by hybrid_score desc;
end;
$$ language plpgsql security definer;

-- Match Preferences Schema Updates
alter table users add column if not exists gender text;
alter table users add column if not exists preferred_genders text[] default array['everyone'];
alter table users add column if not exists preferred_time_slots text[] default array[]::text[];
alter table users add column if not exists looking_for text[] default array['friends'];

-- Event RSVPs updates
alter table event_rsvps add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- Events updates
alter table events add column if not exists targeted_interest_ids uuid[] default null;
alter table events add column if not exists pitch text;

-- Users updates
alter table users add column if not exists is_verified boolean default false;

-- Connections
create table public.connections (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references public.users(id) on delete cascade not null,
  recipient_id uuid references public.users(id) on delete cascade not null,
  status text not null check (status in ('pending', 'accepted', 'declined')),
  event_id uuid references public.events(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(requester_id, recipient_id)
);

alter table public.connections enable row level security;

create policy "Users can view their connections." on public.connections
  for select using (auth.uid() = requester_id or auth.uid() = recipient_id);

create policy "Users can insert connection requests." on public.connections
  for insert with check (auth.uid() = requester_id);

create policy "Users can update their connections." on public.connections
  for update using (auth.uid() = requester_id or auth.uid() = recipient_id);

-- Messages
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  connection_id uuid references public.connections(id) on delete cascade not null,
  sender_id uuid references public.users(id) on delete cascade not null,
  type text not null check (type in ('text', 'date_invite')),
  content text,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.messages enable row level security;

create policy "Users can view messages in their connections." on public.messages
  for select using (
    exists (
      select 1 from public.connections c
      where c.id = messages.connection_id
      and (c.requester_id = auth.uid() or c.recipient_id = auth.uid())
    )
  );

create policy "Users can send messages in their connections." on public.messages
  for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.connections c
      where c.id = connection_id
      and (c.requester_id = auth.uid() or c.recipient_id = auth.uid())
    )
  );

-- Avatars Storage Bucket
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Anyone can upload an avatar."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

create policy "Anyone can update their own avatar."
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

create policy "Anyone can delete their own avatar."
  on storage.objects for delete
  using ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- Match Preferences Schema Updates (additional)
alter table users add column if not exists available_days text[] default array[]::text[];
alter table users add column if not exists max_distance_km integer default 50;
alter table users add column if not exists location_preference text default 'city';
alter table users add column if not exists rank text default 'user' check (rank in ('guest', 'user', 'moderator', 'administrator'));


-- Match Making Engine
alter table user_interests add column if not exists priority_level integer default 2;

create table if not exists public.event_matches (
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  match_tier text not null check (match_tier in ('high', 'normal', 'related')),
  is_active boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (event_id, user_id)
);

alter table public.event_matches enable row level security;

create policy "Users can view their active matches." on public.event_matches
  for select using (auth.uid() = user_id and is_active = true);

create or replace function public.compute_event_matches(new_event_id uuid)
returns void as $$
declare
  target_ids uuid[];
begin
  select targeted_interest_ids into target_ids from public.events where id = new_event_id;
  
  if target_ids is null or array_length(target_ids, 1) is null then
    return;
  end if;

  -- Insert High Priority Matches (Tier 1) - Active Immediately
  insert into public.event_matches (event_id, user_id, match_tier, is_active)
  select distinct new_event_id, ui.user_id, 'high', true
  from public.user_interests ui
  where ui.category_id = any(target_ids)
    and ui.priority_level = 1
  on conflict do nothing;

  -- Insert Normal Priority Matches (Tier 2) - Inactive Initially
  insert into public.event_matches (event_id, user_id, match_tier, is_active)
  select distinct new_event_id, ui.user_id, 'normal', false
  from public.user_interests ui
  where ui.category_id = any(target_ids)
    and ui.priority_level = 2
  on conflict do nothing;
  
end;
$$ language plpgsql security definer;

create or replace function public.expand_event_matches(target_event_id uuid)
returns void as $$
begin
  update public.event_matches
  set is_active = true
  where event_id = target_event_id and match_tier = 'normal';
end;
$$ language plpgsql security definer;

