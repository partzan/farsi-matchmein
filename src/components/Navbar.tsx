import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { fa } from '../locale/fa';
import { BrandLogo } from './BrandLogo';
import { signInWithGoogle } from '../lib/auth';

const linkClass =
  'px-3 py-1.5 rounded-lg text-sm font-semibold text-white/75 hover:text-white hover:bg-white/10 transition-colors';
const linkActiveish =
  'px-3 py-1.5 rounded-lg text-sm font-semibold text-accent-cyan hover:text-white hover:bg-white/10 transition-colors';

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [userRank, setUserRank] = useState<string>('user');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const fetchUserRank = async (userId: string) => {
    const { data } = await supabase.from('users').select('rank').eq('id', userId).single();
    if (data) setUserRank(data.rank || 'user');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50" dir="rtl">
      <div className="bg-primary/90 backdrop-blur-xl border-b border-white/10 supports-[backdrop-filter]:bg-primary/75">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-[4.25rem]">
            <div className="flex-shrink-0 flex items-center" onClick={() => setIsMobileMenuOpen(false)}>
              <BrandLogo size="md" />
            </div>

            <div className="hidden sm:flex items-center gap-1.5 rounded-2xl bg-white/5 border border-white/10 p-1.5 backdrop-blur-sm">
              <Link to="/events" className={linkClass}>
                {fa.nav.events}
              </Link>
              <Link to="/discover" className={linkClass}>
                {fa.nav.discover}
              </Link>
              {user ? (
                <>
                  <Link to="/my-events" className={linkActiveish}>
                    {fa.nav.myEvents}
                  </Link>
                  {(userRank === 'administrator' || userRank === 'moderator') && (
                    <Link to="/admin/events" className={linkClass}>
                      {fa.nav.adminEvents}
                    </Link>
                  )}
                  <Link to="/profile" className={linkClass}>
                    {fa.nav.profile}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className={`${linkClass} text-accent-red/90 hover:text-accent-red`}
                  >
                    {fa.nav.logout}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1.5 ps-1">
                  <Link to="/login?mode=signup" className={linkClass}>
                    {fa.login.createAccount}
                  </Link>
                  <Link
                    to="/login"
                    className="bg-gradient-to-l from-accent-cyan to-primary-mid text-white px-4 py-1.5 rounded-xl font-bold text-sm shadow-md shadow-accent-cyan/20 hover:opacity-95 transition-opacity"
                  >
                    {fa.nav.login}
                  </Link>
                </div>
              )}
            </div>

            <div className="sm:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-white/80 hover:text-white p-2 rounded-xl bg-white/5 border border-white/10"
                aria-label="menu"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
        <div className="h-[3px] bg-gradient-to-l from-accent-orange via-accent-purple to-accent-cyan" />
      </div>

      {isMobileMenuOpen && (
        <div className="sm:hidden border-b border-white/10 bg-primary/95 backdrop-blur-xl shadow-2xl absolute w-full end-0 z-40">
          <div className="px-4 pt-4 pb-6 space-y-1 text-start">
            <Link
              to="/events"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-3 text-base font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
            >
              {fa.nav.events}
            </Link>
            <Link
              to="/discover"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-3 text-base font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
            >
              {fa.nav.discover}
            </Link>
            {user ? (
              <>
                <Link
                  to="/my-events"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-3 text-base font-semibold text-accent-cyan hover:text-white hover:bg-white/10 rounded-xl"
                >
                  {fa.nav.myEvents}
                </Link>
                {(userRank === 'administrator' || userRank === 'moderator') && (
                  <Link
                    to="/admin/events"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-3 text-base font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
                  >
                    {fa.nav.adminEvents}
                  </Link>
                )}
                <Link
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-3 text-base font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
                >
                  {fa.nav.profile}
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-start px-3 py-3 text-base font-semibold text-accent-red hover:bg-accent-red/10 rounded-xl"
                >
                  {fa.nav.logout}
                </button>
              </>
            ) : (
              <div className="space-y-2 pt-2">
                <Link
                  to="/login?mode=signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full px-4 py-3 text-center text-base font-bold text-white/80 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
                >
                  {fa.login.createAccount}
                </Link>
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full px-4 py-3 text-center text-base font-bold text-white bg-gradient-to-l from-accent-cyan to-primary-mid rounded-xl shadow-md shadow-accent-cyan/20"
                >
                  {fa.nav.login}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signInWithGoogle('/');
                  }}
                  className="w-full px-4 py-3 text-base font-bold text-white/80 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
                >
                  {fa.nav.loginGoogle}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
