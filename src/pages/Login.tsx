import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendPhoneOtp, toE164, verifyPhoneOtpLogin } from '../lib/otp';
import { supabase } from '../lib/supabase';
import { fa } from '../locale/fa';
import { BrandLogo } from '../components/BrandLogo';

type Mode = 'login' | 'signup';
type Channel = 'phone' | 'email';
type Step = 'form' | 'otp';

export function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [channel, setChannel] = useState<Channel>('email');
  const [step, setStep] = useState<Step>('form');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const afterAuth = async (isSignupIntent: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError(fa.login.verifyFail);
      return;
    }

    const { data: profile } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();

    const { count } = await supabase
      .from('user_interests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const isNew =
      isSignupIntent ||
      !profile?.display_name ||
      (count ?? 0) < 3;

    navigate(isNew ? '/profile-setup' : '/welcome', { replace: true });
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const e164 = toE164(phone);
    if (!e164) {
      setError(fa.login.invalidPhone);
      return;
    }

    setLoading(true);
    const result = await sendPhoneOtp(e164, mode === 'signup' ? 'signup' : 'login');
    setLoading(false);

    if (!result.ok) {
      setError(result.message || fa.login.sendFail);
      return;
    }

    setPhone(result.phone);
    setStep('otp');
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (otp.trim().length < 4) {
      setError(fa.login.invalidOtp);
      return;
    }

    setLoading(true);
    const result = await verifyPhoneOtpLogin(
      phone,
      otp.trim(),
      mode === 'signup' ? 'signup' : 'login',
    );
    setLoading(false);

    if (!result.ok) {
      setError(result.message || fa.login.verifyFail);
      return;
    }

    await afterAuth(mode === 'signup');
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed.includes('@')) {
      setError(fa.login.invalidEmail);
      return;
    }
    if (password.length < 6) {
      setError(fa.login.invalidPassword);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmed,
          password,
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          // Email confirm may be required in project settings
          setError(fa.login.emailConfirmHint);
          return;
        }
        await afterAuth(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (signInError) throw signInError;
        await afterAuth(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : fa.login.emailFail;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchChannel = (next: Channel) => {
    setChannel(next);
    setStep('form');
    setOtp('');
    setError(null);
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10" dir="rtl">
      <div className="mb-8 flex flex-col items-center text-center">
        <BrandLogo size="lg" />
        <h1 className="mt-6 text-2xl font-black text-foreground">
          {step === 'otp'
            ? fa.login.otpTitle
            : mode === 'signup'
              ? fa.login.signupTitle
              : fa.login.title}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {step === 'otp'
            ? fa.login.otpSubtitle.replace('{phone}', phone)
            : channel === 'email'
              ? mode === 'signup'
                ? fa.login.emailSignupSubtitle
                : fa.login.emailSubtitle
              : mode === 'signup'
                ? fa.login.signupSubtitle
                : fa.login.subtitle}
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
        {step === 'form' && (
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-background p-1">
            <button
              type="button"
              onClick={() => switchChannel('email')}
              className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                channel === 'email' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'
              }`}
            >
              {fa.login.tabEmail}
            </button>
            <button
              type="button"
              onClick={() => switchChannel('phone')}
              className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                channel === 'phone' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'
              }`}
            >
              {fa.login.tabPhone}
            </button>
          </div>
        )}

        {error && (
          <p className="mb-4 rounded-xl bg-accent-red/10 px-3 py-2 text-sm font-semibold text-accent-red">
            {error}
          </p>
        )}

        {step === 'form' && channel === 'email' && (
          <form onSubmit={submitEmail} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-foreground">
                {fa.login.emailLabel}
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                dir="ltr"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-foreground">
                {fa.login.passwordLabel}
              </label>
              <input
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                dir="ltr"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-l from-primary via-primary-mid to-accent-purple px-4 py-3.5 text-base font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-60"
            >
              {loading
                ? fa.login.emailWorking
                : mode === 'signup'
                  ? fa.login.createAccount
                  : fa.login.loginBtn}
            </button>
            <p className="text-center text-xs text-muted">{fa.login.emailTempNote}</p>
          </form>
        )}

        {step === 'form' && channel === 'phone' && (
          <form onSubmit={sendOtp} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-foreground">
                {fa.login.phoneLabel}
              </label>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={fa.login.phonePlaceholder}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                dir="ltr"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-l from-primary via-primary-mid to-accent-purple px-4 py-3.5 text-base font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-60"
            >
              {loading
                ? fa.login.sending
                : mode === 'signup'
                  ? fa.login.createAccount
                  : fa.login.loginBtn}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-foreground">
                {fa.login.otpLabel}
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="••••••"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-2xl tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-primary"
                dir="ltr"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-l from-accent-orange to-accent-red px-4 py-3.5 text-base font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-60"
            >
              {loading ? fa.login.verifying : fa.login.verifyBtn}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setOtp('');
                setError(null);
              }}
              className="w-full text-sm font-semibold text-muted hover:text-primary"
            >
              {fa.login.changePhone}
            </button>
          </form>
        )}

        {step === 'form' && (
          <div className="mt-6 border-t border-border pt-5 text-center text-sm">
            {mode === 'login' ? (
              <p className="text-muted">
                {fa.login.noAccount}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className="font-bold text-primary hover:text-accent-purple"
                >
                  {fa.login.createAccountLink}
                </button>
              </p>
            ) : (
              <p className="text-muted">
                {fa.login.hasAccount}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="font-bold text-primary hover:text-primary"
                >
                  {fa.login.loginLink}
                </button>
              </p>
            )}
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        <Link to="/" className="font-semibold text-primary hover:text-accent-purple">
          {fa.login.backHome}
        </Link>
      </p>
    </div>
  );
}
