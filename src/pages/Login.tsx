import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fa } from '../locale/fa';
import { BrandLogo } from '../components/BrandLogo';
import { useState } from 'react';

/** Restored auth: Google OAuth + optional guest (anonymous). */
export function Login() {
  const navigate = useNavigate();
  const [guestName, setGuestName] = useState('');
  const [showGuest, setShowGuest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setError(null);
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signInAnonymously();
    if (authError) {
      setError(fa.nav.guestLoginFail);
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
        <h1 className="mt-6 text-2xl font-black text-foreground">{fa.login.title}</h1>
        <p className="mt-2 text-sm text-muted">{fa.login.googleSubtitle}</p>
      </div>

      <div className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
        {error && (
          <p className="mb-4 rounded-xl bg-accent-red/10 px-3 py-2 text-sm font-semibold text-accent-red">
            {error}
          </p>
        )}

        {!showGuest ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogle}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-white px-4 py-3.5 text-base font-bold text-foreground transition hover:border-primary hover:bg-primary-light/40"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {fa.nav.loginGoogle}
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-bold text-muted">{fa.signup.or}</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              onClick={() => {
                setShowGuest(true);
                setError(null);
              }}
              className="w-full rounded-2xl bg-primary/10 px-4 py-3.5 text-base font-bold text-primary transition hover:bg-primary hover:text-white"
            >
              {fa.nav.continueGuest}
            </button>
          </div>
        ) : (
          <form onSubmit={handleGuest} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold">{fa.nav.guestUsername}</label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={fa.signup.usernamePlaceholder}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
                required
                dir="rtl"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !guestName.trim()}
              className="w-full rounded-2xl bg-gradient-to-l from-accent-orange to-accent-red px-4 py-3.5 text-base font-bold text-white disabled:opacity-50"
            >
              {loading ? fa.signup.creating : fa.nav.loginAsGuest}
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
