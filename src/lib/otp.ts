import { supabase } from './supabase';

export type OtpPurpose = 'login' | 'signup' | 'phone_change';

export function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('98') && digits.length >= 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length >= 11) return `+98${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith('9')) return `+98${digits}`;
  if (raw.trim().startsWith('+') && digits.length >= 10) return `+${digits}`;
  return null;
}

type SendResult = { ok: true; phone: string } | { ok: false; message: string };
type VerifyLoginResult =
  | { ok: true; phone: string }
  | { ok: false; message: string };
type VerifyPhoneChangeResult =
  | { ok: true; phone: string }
  | { ok: false; message: string };

export async function sendPhoneOtp(phone: string, purpose: OtpPurpose): Promise<SendResult> {
  const { data, error } = await supabase.functions.invoke('otp-send', {
    body: { phone, purpose },
  });

  if (error) {
    return { ok: false, message: error.message || 'ارسال کد ناموفق بود.' };
  }
  if (data?.error) {
    return { ok: false, message: data.message || data.error };
  }
  return { ok: true, phone: data.phone as string };
}

/** Login/signup: verify code, then establish Supabase session via token_hash */
export async function verifyPhoneOtpLogin(
  phone: string,
  code: string,
  purpose: 'login' | 'signup' = 'login',
): Promise<VerifyLoginResult> {
  const { data, error } = await supabase.functions.invoke('otp-verify', {
    body: { phone, code, purpose },
  });

  if (error) {
    return { ok: false, message: error.message || 'تأیید کد ناموفق بود.' };
  }
  if (data?.error) {
    return { ok: false, message: data.message || data.error };
  }

  const tokenHash = data?.token_hash as string | undefined;
  if (!tokenHash) {
    return { ok: false, message: 'نشست ساخته نشد. دوباره تلاش کن.' };
  }

  const { error: sessionError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'email',
  });

  if (sessionError) {
    return { ok: false, message: sessionError.message || 'ورود ناموفق بود.' };
  }

  return { ok: true, phone: (data.phone as string) || phone };
}

/** Change phone on an already-logged-in profile */
export async function verifyPhoneOtpChange(
  phone: string,
  code: string,
): Promise<VerifyPhoneChangeResult> {
  const { data, error } = await supabase.functions.invoke('otp-verify', {
    body: { phone, code, purpose: 'phone_change' },
  });

  if (error) {
    return { ok: false, message: error.message || 'تأیید کد ناموفق بود.' };
  }
  if (data?.error) {
    return { ok: false, message: data.message || data.error };
  }

  return { ok: true, phone: (data.phone as string) || phone };
}
