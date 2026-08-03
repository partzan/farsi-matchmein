import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getSafeNextPath, mapAuthErrorMessage, signInWithGoogle } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { fa } from '../locale/fa';
import { BrandLogo } from '../components/BrandLogo';

type Mode = 'login' | 'signup';

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode: Mode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const postAuthPath = getSafeNextPath(searchParams.get('next'), '/events');

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guestName, setGuestName] = useState('');
  const [showGuest, setShowGuest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const afterAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError(fa.login.verifyFail);
      return;
    }
    navigate(postAuthPath, { replace: true });
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
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
          options: { emailRedirectTo: `${window.location.origin}${postAuthPath}` },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          await afterAuth();
          return;
        }

        // Confirm-email may be on: try immediate sign-in (works when autoconfirm is on
        // or when the project auto-issues a session after signup).
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (!signInError) {
          await afterAuth();
          return;
        }

        // Account likely created — switch to login with a Persian tip (no Supabase jargon).
        setMode('login');
        setInfo(fa.login.emailConfirmHint);
        setError(mapAuthErrorMessage(signInError.message));
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (signInError) throw signInError;
        await afterAuth();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : fa.login.emailFail;
      setError(mapAuthErrorMessage(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setInfo(null);
    const { error: oauthError } = await signInWithGoogle(postAuthPath);
    if (oauthError) setError(mapAuthErrorMessage(oauthError.message));
  };

  const handleGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setLoading(true);
    setError(null);
    setInfo(null);

    const { data, error: authError } = await supabase.auth.signInAnonymously();
    if (authError) {
      setError(mapAuthErrorMessage(authError.message));
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase
        .from('users')
        .update({ display_name: guestName.trim(), rank: 'guest' })
        .eq('id', data.user.id);
    }

    setLoading(false);
    navigate(postAuthPath, { replace: true });
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  return (
    <div
      className="mx-auto flex h-full max-w-md flex-col justify-center px-4 py-3 sm:py-5"
      dir="rtl"
    >
      <div className="mb-2 flex flex-col items-center text-center sm:mb-4">
        <BrandLogo size="sm" className="sm:h-9" />
        <h1 className="mt-2 text-lg font-black text-foreground sm:mt-3 sm:text-2xl">
          {mode === 'signup' ? fa.login.signupTitle : fa.login.title}
        </h1>
        <p className="mt-0.5 text-xs text-muted sm:mt-1.5 sm:text-sm">
          {mode === 'signup' ? fa.login.emailSignupSubtitle : fa.login.emailSubtitle}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
        {error && (
          <p className="mb-3 rounded-xl bg-accent-red/10 px-3 py-2 text-xs font-semibold text-accent-red sm:mb-4 sm:text-sm">
            {error}
          </p>
        )}
        {info && (
          <p className="mb-3 rounded-xl bg-accent-cyan/10 px-3 py-2 text-xs font-semibold text-primary sm:mb-4 sm:text-sm">
            {info}
          </p>
        )}

        {!showGuest ? (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2 sm:mb-4">
              <button
                type="button"
                onClick={() => switchMode('signup')}
                aria-pressed={mode === 'signup'}
                className={`rounded-2xl px-3 py-2.5 text-sm font-black transition sm:py-3 sm:text-base ${
                  mode === 'signup'
                    ? 'bg-gradient-to-l from-accent-orange to-accent-red text-white shadow-md shadow-accent-red/25 ring-2 ring-accent-orange/40'
                    : 'bg-gradient-to-l from-accent-orange to-accent-red text-white shadow-md shadow-accent-red/20 hover:opacity-95'
                }`}
              >
                {fa.login.signUp}
              </button>
              <button
                type="button"
                onClick={() => switchMode('login')}
                aria-pressed={mode === 'login'}
                className={`rounded-2xl border px-3 py-2.5 text-sm font-bold transition sm:py-3 sm:text-base ${
                  mode === 'login'
                    ? 'border-primary bg-primary-light/50 text-primary'
                    : 'border-border bg-background text-muted hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {fa.login.loginBtn}
              </button>
            </div>

            <form onSubmit={submitEmail} className="space-y-2.5 sm:space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground sm:mb-1.5 sm:text-sm">
                  {fa.login.emailLabel}
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary sm:px-4 sm:py-3 sm:text-base"
                  dir="ltr"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground sm:mb-1.5 sm:text-sm">
                  {fa.login.passwordLabel}
                </label>
                <input
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary sm:px-4 sm:py-3 sm:text-base"
                  dir="ltr"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded-2xl px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-60 sm:py-3.5 sm:text-base ${
                  mode === 'signup'
                    ? 'bg-gradient-to-l from-accent-orange to-accent-red'
                    : 'bg-gradient-to-l from-primary via-primary-mid to-accent-purple'
                }`}
              >
                {loading
                  ? fa.login.emailWorking
                  : mode === 'signup'
                    ? fa.login.createAccount
                    : fa.login.loginBtn}
              </button>
            </form>

            <div className="my-3 flex items-center gap-3 sm:my-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-bold text-muted sm:text-xs">{fa.signup.or}</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-white px-4 py-2.5 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-light/40 sm:py-3.5 sm:text-base"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {fa.nav.loginGoogle}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowGuest(true);
                setError(null);
              }}
              className="mt-2 w-full rounded-2xl border border-border px-4 py-2 text-xs font-bold text-muted transition hover:bg-background hover:text-foreground sm:mt-3 sm:py-2.5 sm:text-sm"
            >
              {fa.nav.continueGuest}
            </button>
          </>
        ) : (
          <form onSubmit={handleGuest} className="space-y-3">
            <p className="text-xs text-muted sm:text-sm">{fa.nav.guestUsername}</p>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder={fa.nav.guestPlaceholder}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary sm:px-4 sm:py-3 sm:text-base"
              dir="rtl"
              autoFocus
              required
            />
            <button
              type="submit"
              disabled={loading || !guestName.trim()}
              className="w-full rounded-2xl bg-gradient-to-l from-accent-orange to-accent-red px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 sm:py-3.5 sm:text-base"
            >
              {loading ? fa.login.emailWorking : fa.nav.loginAsGuest}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowGuest(false);
                setError(null);
              }}
              className="w-full text-sm font-semibold text-muted hover:text-primary"
            >
              {fa.nav.cancel}
            </button>
          </form>
        )}
      </div>

      <p className="mt-2 text-center text-xs text-muted sm:mt-4 sm:text-sm">
        <Link to="/" className="font-semibold text-primary hover:text-accent-purple">
          {fa.login.backHome}
        </Link>
      </p>
    </div>
  );
}
