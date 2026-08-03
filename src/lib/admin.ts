/**
 * Admin panel / create-event access.
 * Prefer VITE_ADMIN_EMAILS allowlist; if empty, fall back to rank === 'administrator'.
 * Moderators and normal users are never treated as admin here.
 */
import { supabase } from './supabase';

export function getAdminEmails(): string[] {
  const raw = import.meta.env.VITE_ADMIN_EMAILS as string | undefined;
  if (!raw || !String(raw).trim()) return [];
  return String(raw)
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = getAdminEmails();
  if (list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
}

/** True for create-event + مدیریت رویدادها (navbar + route gate). */
export function canAccessAdmin(
  email: string | null | undefined,
  rank: string | null | undefined,
): boolean {
  const list = getAdminEmails();
  if (list.length > 0) return isAdminEmail(email);
  return rank === 'administrator';
}

/** @deprecated use canAccessAdmin */
export function canAccessCreateEvent(
  email: string | null | undefined,
  rank: string | null | undefined,
): boolean {
  return canAccessAdmin(email, rank);
}

/**
 * Email-allowlisted admins need `rank = administrator` for Supabase RLS
 * (update/delete all events). Call after a successful canAccessAdmin check.
 */
export async function ensureAdministratorRank(
  userId: string,
  email: string | null | undefined,
  currentRank: string | null | undefined,
): Promise<void> {
  if (!isAdminEmail(email)) return;
  if (currentRank === 'administrator') return;
  await supabase.from('users').update({ rank: 'administrator' }).eq('id', userId);
}
