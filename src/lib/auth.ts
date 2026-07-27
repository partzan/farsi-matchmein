import { supabase } from './supabase';
import { fa } from '../locale/fa';

/** Google OAuth — always return to this site (not a broken default redirect). */
export function signInWithGoogle(redirectPath = '/') {
  const redirectTo = `${window.location.origin}${redirectPath}`;
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
