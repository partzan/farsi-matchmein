import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { mapAuthErrorMessage, signInWithGoogle } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { fa } from '../locale/fa';
import { BrandLogo } from '../components/BrandLogo';

type Mode = 'login' | 'signup';

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode: Mode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guestName, setGuestName] = useState('');
  const [showGuest, setShowGuest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const afterAuth = async (isSignupIntent: boolean) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
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

    const isNew = isSignupIntent || !profile?.display_name || (count ?? 0) < 3;
    navigate(isNew ? '/profile-setup' : '/events', { replace: true });
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
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          await afterAuth(true);
          return;
        }

        // Confirm-email may be on: try immediate sign-in (works when autoconfirm is on
        // or when the project auto-issues a session after signup).
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (!signInError) {
          await afterAuth(true);
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
        await afterAuth(false);
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
    const { error: oauthError } = await signInWithGoogle('/');
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
    navigate('/events', { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10" dir="rtl">
      <div className="mb-8 flex flex-col items-center text-center">
        <BrandLogo size="lg" />
        <h1 className="mt-6 text-2xl font-black text-foreground">
          {mode === 'signup' ? fa.login.signupTitle : fa.login.title}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {mode === 'signup' ? fa.login.emailSignupSubtitle : fa.login.emailSubtitle}
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
        {error && (
          <p className="mb-4 rounded-xl bg-accent-red/10 px-3 py-2 text-sm font-semibold text-accent-red">
            {error}
          </p>
        )}
        {info && (
          <p className="mb-4 rounded-xl bg-accent-cyan/10 px-3 py-2 text-sm font-semibold text-primary">
            {info}
          </p>
        )}

        {!showGuest ? (
          <>
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
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-bold text-muted">{fa.signup.or}</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-white px-4 py-3.5 text-base font-bold text-foreground transition hover:border-primary hover:bg-primary-light/40"
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
              className="mt-3 w-full rounded-2xl border border-border px-4 py-3 text-sm font-bold text-muted transition hover:bg-background hover:text-foreground"
            >
              {fa.nav.continueGuest}
            </button>

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
                    className="font-bold text-primary"
                  >
                    {fa.login.loginLink}
                  </button>
                </p>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleGuest} className="space-y-4">
            <p className="text-sm text-muted">{fa.nav.guestUsername}</p>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder={fa.nav.guestPlaceholder}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
              dir="rtl"
              autoFocus
              required
            />
            <button
              type="submit"
              disabled={loading || !guestName.trim()}
              className="w-full rounded-2xl bg-gradient-to-l from-accent-orange to-accent-red px-4 py-3.5 text-base font-bold text-white disabled:opacity-50"
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

      <p className="mt-6 text-center text-sm text-muted">
        <Link to="/" className="font-semibold text-primary hover:text-accent-purple">
          {fa.login.backHome}
        </Link>
      </p>
    </div>
  );
}
