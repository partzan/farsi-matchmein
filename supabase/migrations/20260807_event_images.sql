-- Ensure events.image_url exists for preview photos on /events
alter table public.events
  add column if not exists image_url text;

-- Public bucket for event preview images
insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Event images are publicly readable" on storage.objects;
create policy "Event images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'event-images');

drop policy if exists "Authenticated users can upload event images" on storage.objects;
create policy "Authenticated users can upload event images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own event images" on storage.objects;
create policy "Users can update own event images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own event images" on storage.objects;
create policy "Users can delete own event images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
