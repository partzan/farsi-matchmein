import { NavLink, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { Menu, User, X } from 'lucide-react';
import type { User as AuthUser } from '@supabase/supabase-js';
import { canAccessAdmin } from '../lib/admin';
import { fa } from '../locale/fa';
import { BrandLogo } from './BrandLogo';
import { loginUrl } from '../lib/auth';

const desktopBase =
  'px-3 py-1.5 rounded-full text-sm font-semibold transition-colors';
const desktopInactive =
  `${desktopBase} text-foreground/70 hover:text-primary hover:bg-primary-light/70`;
const desktopActive = `${desktopBase} text-primary bg-primary-light/70`;

const mobileBase = 'block rounded-xl px-3 py-3 text-base font-semibold transition-colors';
const mobileInactive = `${mobileBase} text-foreground/80 hover:bg-primary-light hover:text-primary`;
const mobileActive = `${mobileBase} text-primary bg-primary-light`;

function desktopNavClass(isActive: boolean) {
  return isActive ? desktopActive : desktopInactive;
}

function mobileNavClass(isActive: boolean) {
  return isActive ? mobileActive : mobileInactive;
}

function ProfileNavLabel({
  avatarUrl,
  className,
}: {
  avatarUrl: string | null;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-border/80"
        />
      ) : (
        <User className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      )}
      {fa.nav.profile}
    </span>
  );
}

export function Navbar() {
  const { pathname } = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userRank, setUserRank] = useState<string>('user');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  const adminActive = pathname.startsWith('/admin');
  const loginActive = pathname === '/login';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserMeta(session.user.id);
      else {
        setUserRank('user');
        setAvatarUrl(null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserMeta(session.user.id);
      else {
        setUserRank('user');
        setAvatarUrl(null);
      }
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

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const fetchUserMeta = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('rank, avatar_url')
      .eq('id', userId)
      .single();
    if (data) {
      setUserRank(data.rank || 'user');
      setAvatarUrl(typeof data.avatar_url === 'string' && data.avatar_url ? data.avatar_url : null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMobileMenuOpen(false);
    setAvatarUrl(null);
  };

  const closeMobile = () => setIsMobileMenuOpen(false);

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
            onClick={closeMobile}
          >
            <BrandLogo size={compact ? 'sm' : 'md'} />
          </div>

          <div
            className={`hidden items-center gap-0.5 sm:flex ${
              compact ? 'gap-0' : 'gap-1'
            }`}
          >
            {user ? (
              <>
                <NavLink to="/profile" end className={({ isActive }) => desktopNavClass(isActive)}>
                  <ProfileNavLabel avatarUrl={avatarUrl} />
                </NavLink>
                <NavLink to="/events" end className={({ isActive }) => desktopNavClass(isActive)}>
                  {fa.nav.events}
                </NavLink>
                <NavLink to="/my-events" end className={({ isActive }) => desktopNavClass(isActive)}>
                  {fa.nav.myEvents}
                </NavLink>
                <NavLink to="/about" end className={({ isActive }) => desktopNavClass(isActive)}>
                  {fa.nav.about}
                </NavLink>
                {canAccessAdmin(user.email, userRank) && (
                  <NavLink
                    to="/admin/events"
                    className={() => desktopNavClass(adminActive)}
                    aria-current={adminActive ? 'page' : undefined}
                  >
                    {fa.nav.adminEvents}
                  </NavLink>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`${desktopInactive} text-accent-red hover:bg-accent-red/10 hover:text-accent-red`}
                >
                  {fa.nav.logout}
                </button>
              </>
            ) : (
              <>
                <NavLink to="/about" end className={({ isActive }) => desktopNavClass(isActive)}>
                  {fa.nav.about}
                </NavLink>
                <NavLink
                  to={loginUrl()}
                  className={`rounded-full font-bold transition-all ${
                    compact ? 'px-3.5 py-1.5 text-xs' : 'px-4 py-1.5 text-sm'
                  } ${
                    loginActive
                      ? 'bg-primary-dark text-white ring-2 ring-primary/40 ring-offset-2'
                      : 'bg-primary text-white hover:bg-primary-dark'
                  }`}
                  aria-current={loginActive ? 'page' : undefined}
                >
                  {fa.nav.loginSignup}
                </NavLink>
              </>
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
              {user ? (
                <>
                  <NavLink
                    to="/profile"
                    end
                    onClick={closeMobile}
                    className={({ isActive }) => mobileNavClass(isActive)}
                  >
                    <ProfileNavLabel avatarUrl={avatarUrl} />
                  </NavLink>
                  <NavLink
                    to="/events"
                    end
                    onClick={closeMobile}
                    className={({ isActive }) => mobileNavClass(isActive)}
                  >
                    {fa.nav.events}
                  </NavLink>
                  <NavLink
                    to="/my-events"
                    end
                    onClick={closeMobile}
                    className={({ isActive }) => mobileNavClass(isActive)}
                  >
                    {fa.nav.myEvents}
                  </NavLink>
                  <NavLink
                    to="/about"
                    end
                    onClick={closeMobile}
                    className={({ isActive }) => mobileNavClass(isActive)}
                  >
                    {fa.nav.about}
                  </NavLink>
                  {canAccessAdmin(user.email, userRank) && (
                    <NavLink
                      to="/admin/events"
                      onClick={closeMobile}
                      className={() => mobileNavClass(adminActive)}
                      aria-current={adminActive ? 'page' : undefined}
                    >
                      {fa.nav.adminEvents}
                    </NavLink>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-xl px-3 py-3 text-start text-base font-semibold text-accent-red hover:bg-accent-red/10"
                  >
                    {fa.nav.logout}
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    to="/about"
                    end
                    onClick={closeMobile}
                    className={({ isActive }) => mobileNavClass(isActive)}
                  >
                    {fa.nav.about}
                  </NavLink>
                  <NavLink
                    to={loginUrl()}
                    onClick={closeMobile}
                    className={`mt-1 block w-full rounded-xl px-4 py-3 text-center text-base font-bold text-white ${
                      loginActive ? 'bg-primary-dark ring-2 ring-primary/40' : 'bg-primary'
                    }`}
                    aria-current={loginActive ? 'page' : undefined}
                  >
                    {fa.nav.loginSignup}
                  </NavLink>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
