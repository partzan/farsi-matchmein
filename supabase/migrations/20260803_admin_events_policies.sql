-- Administrators can update/delete any event (not only their own).
drop policy if exists "Administrators can update all events." on public.events;
create policy "Administrators can update all events."
  on public.events
  for update
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and rank = 'administrator'
    )
  );

drop policy if exists "Administrators can delete all events." on public.events;
create policy "Administrators can delete all events."
  on public.events
  for delete
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and rank = 'administrator'
    )
  );
