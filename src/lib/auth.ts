import { supabase } from './supabase';
import { fa } from '../locale/fa';

/** Same-origin relative path only — blocks open redirects. */
export function getSafeNextPath(
  next: string | null | undefined,
  fallback = '/events',
): string {
  if (!next) return fallback;
  if (!next.startsWith('/') || next.startsWith('//')) return fallback;
  return next;
}

/** Build /login URL with optional signup mode and post-auth return path. */
export function loginUrl(opts?: { mode?: 'login' | 'signup'; next?: string }) {
  const params = new URLSearchParams();
  if (opts?.mode === 'signup') params.set('mode', 'signup');
  if (opts?.next) {
    const safe = getSafeNextPath(opts.next, '');
    if (safe) params.set('next', safe);
  }
  const q = params.toString();
  return q ? `/login?${q}` : '/login';
}

/** Google OAuth — always return to this site origin (must be in Supabase redirect allow-list). */
export function signInWithGoogle(redirectPath = '/events') {
  const path = getSafeNextPath(redirectPath, '/events');
  const redirectTo = `${window.location.origin}${path}`;
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
}

/** Map Supabase/GoTrue English errors to Persian UI copy. */
export function mapAuthErrorMessage(message: string | undefined | null): string {
  const raw = (message || '').trim();
  const lower = raw.toLowerCase();

  if (!raw) return fa.login.emailFail;

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_credentials') ||
    lower.includes('invalid email or password')
  ) {
    return fa.login.invalidCredentials;
  }

  if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
    return fa.login.emailNotConfirmed;
  }

  if (
    lower.includes('user already registered') ||
    lower.includes('already been registered') ||
    lower.includes('already registered')
  ) {
    return fa.login.userAlreadyExists;
  }

  if (lower.includes('anonymous') && lower.includes('disabled')) {
    return fa.nav.guestLoginFail;
  }

  if (lower.includes('password') && (lower.includes('least') || lower.includes('6') || lower.includes('characters'))) {
    return fa.login.invalidPassword;
  }

  if (
    lower.includes('password should contain') ||
    lower.includes('password_requirements') ||
    (lower.includes('password') && (lower.includes('uppercase') || lower.includes('symbol') || lower.includes('digit')))
  ) {
    return fa.login.weakPassword;
  }

  if (lower.includes('unable to validate email') || lower.includes('invalid email')) {
    return fa.login.invalidEmail;
  }

  return raw;
}
