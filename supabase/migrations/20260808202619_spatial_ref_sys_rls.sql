-- PostGIS creates public.spatial_ref_sys without RLS (Supabase advisor: rls_disabled_in_public).
-- This is reference data only — not user/app data. You cannot ENABLE RLS unless you are the table owner.
-- Fix: revoke Data API roles so anon/authenticated cannot read/write via PostgREST.
-- If this migration fails with permission errors, run the same REVOKE in Dashboard → SQL Editor.

revoke all on table public.spatial_ref_sys from public;
revoke all on table public.spatial_ref_sys from anon, authenticated;
