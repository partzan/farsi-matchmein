import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { canAccessAdmin } from '../lib/admin';
import { fa } from '../locale/fa';
import { BrandLogo } from './BrandLogo';
import { loginUrl, signInWithGoogle } from '../lib/auth';

const linkClass =
  'px-3 py-1.5 rounded-full text-sm font-semibold text-foreground/70 hover:text-primary hover:bg-primary-light/70 transition-colors';
const linkStrong =
  'px-3 py-1.5 rounded-full text-sm font-semibold text-primary hover:bg-primary-light/70 transition-colors';

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [userRank, setUserRank] = useState<string>('user');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserRank(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserRank(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > 36;
      setCompact((prev) => (prev === next ? prev : next));
      if (next) setIsMobileMenuOpen(false);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const fetchUserRank = async (userId: string) => {
    const { data } = await supabase.from('users').select('rank').eq('id', userId).single();
    if (data) setUserRank(data.rank || 'user');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className="sticky top-0 z-50 flex justify-center px-3 pt-3 sm:px-4 sm:pt-4"
      dir="rtl"
    >
      <div
        className={`relative w-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          compact
            ? 'max-w-[min(96vw,36rem)] sm:max-w-[min(94vw,42rem)]'
            : 'max-w-7xl'
        }`}
      >
        <nav
          className={`flex items-center justify-between gap-2 border border-border/70 bg-white transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            compact
              ? 'rounded-full px-3 py-1.5 shadow-lg shadow-primary/10 sm:px-4 sm:py-2'
              : 'rounded-2xl px-3 py-2.5 shadow-sm sm:px-5 sm:py-3'
          }`}
        >
          <div
            className={`flex shrink-0 items-center transition-transform duration-500 ${
              compact ? 'scale-90' : 'scale-100'
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <BrandLogo size={compact ? 'sm' : 'md'} />
          </div>

          <div
            className={`hidden items-center gap-0.5 sm:flex ${
              compact ? 'gap-0' : 'gap-1'
            }`}
          >
            <Link to="/events" className={linkClass}>
              {fa.nav.events}
            </Link>
            <Link to="/discover" className={linkClass}>
              {fa.nav.discover}
            </Link>
            {user ? (
              <>
                <Link to="/my-events" className={linkStrong}>
                  {fa.nav.myEvents}
                </Link>
                {canAccessAdmin(user.email, userRank) && (
                  <Link to="/admin/events" className={linkClass}>
                    {fa.nav.adminEvents}
                  </Link>
                )}
                <Link to="/profile" className={linkClass}>
                  {fa.nav.profile}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`${linkClass} text-accent-red hover:bg-accent-red/10 hover:text-accent-red`}
                >
                  {fa.nav.logout}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5 ps-1">
                <Link to="/profile" className={linkClass}>
                  {fa.nav.profile}
                </Link>
                {!compact && (
                  <Link to="/login?mode=signup" className={linkClass}>
                    {fa.login.createAccount}
                  </Link>
                )}
                <Link
                  to="/login"
                  className={`rounded-full bg-primary font-bold text-white transition-all hover:bg-primary-dark ${
                    compact ? 'px-3.5 py-1.5 text-xs' : 'px-4 py-1.5 text-sm'
                  }`}
                >
                  {fa.nav.login}
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center sm:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded-full border border-border bg-background p-2 text-foreground transition-colors hover:bg-primary-light"
              aria-label="menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {isMobileMenuOpen && (
          <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-2xl border border-border/70 bg-white shadow-xl shadow-primary/10 sm:hidden">
            <div className="space-y-1 px-3 py-3 text-start">
              <Link
                to="/events"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-xl px-3 py-3 text-base font-semibold text-foreground/80 hover:bg-primary-light hover:text-primary"
              >
                {fa.nav.events}
              </Link>
              <Link
                to="/discover"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-xl px-3 py-3 text-base font-semibold text-foreground/80 hover:bg-primary-light hover:text-primary"
              >
                {fa.nav.discover}
              </Link>
              {user ? (
                <>
                  <Link
                    to="/my-events"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block rounded-xl px-3 py-3 text-base font-semibold text-primary hover:bg-primary-light"
                  >
                    {fa.nav.myEvents}
                  </Link>
                  {canAccessAdmin(user.email, userRank) && (
                    <Link
                      to="/admin/events"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block rounded-xl px-3 py-3 text-base font-semibold text-foreground/80 hover:bg-primary-light hover:text-primary"
                    >
                      {fa.nav.adminEvents}
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block rounded-xl px-3 py-3 text-base font-semibold text-foreground/80 hover:bg-primary-light hover:text-primary"
                  >
                    {fa.nav.profile}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-xl px-3 py-3 text-start text-base font-semibold text-accent-red hover:bg-accent-red/10"
                  >
                    {fa.nav.logout}
                  </button>
                </>
              ) : (
                <div className="space-y-2 pt-1">
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block rounded-xl px-3 py-3 text-base font-semibold text-foreground/80 hover:bg-primary-light hover:text-primary"
                  >
                    {fa.nav.profile}
                  </Link>
                  <Link
                    to={loginUrl({ mode: 'signup' })}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full rounded-xl border border-border px-4 py-3 text-center text-base font-bold text-foreground transition-colors hover:bg-primary-light"
                  >
                    {fa.profileSetup.createNewAccount}
                  </Link>
                  <Link
                    to={loginUrl()}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full rounded-xl bg-primary px-4 py-3 text-center text-base font-bold text-white"
                  >
                    {fa.profileSetup.loginToAccount}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      signInWithGoogle('/events');
                    }}
                    className="w-full rounded-xl border border-border px-4 py-3 text-base font-bold text-foreground transition-colors hover:bg-primary-light"
                  >
                    {fa.nav.loginGoogle}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
