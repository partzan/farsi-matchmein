import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { fa } from '../locale/fa';
import { BrandLogo } from './BrandLogo';

const linkClass =
  'px-3 py-1.5 rounded-lg text-sm font-semibold text-white/75 hover:text-white hover:bg-white/10 transition-colors';
const linkActiveish =
  'px-3 py-1.5 rounded-lg text-sm font-semibold text-accent-cyan hover:text-white hover:bg-white/10 transition-colors';

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [userRank, setUserRank] = useState<string>('user');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showGuestLogin, setShowGuestLogin] = useState(false);
  const [guestName, setGuestName] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserRank(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      alert(fa.nav.guestLoginFail);
      return;
    }

    if (data.user) {
      await supabase.from('users').update({ display_name: guestName, rank: 'guest' }).eq('id', data.user.id);
      setUserRank('guest');
    }

    setShowGuestLogin(false);
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
              <Link to="/events" className={linkClass}>{fa.nav.events}</Link>
              {user ? (
                <>
                  <Link to="/my-events" className={linkActiveish}>{fa.nav.myEvents}</Link>
                  {(userRank === 'administrator' || userRank === 'moderator') && (
                    <Link to="/admin/events" className={linkClass}>{fa.nav.adminEvents}</Link>
                  )}
                  <Link to="/profile" className={linkClass}>{fa.nav.profile}</Link>
                  <button onClick={handleLogout} className={`${linkClass} text-accent-red/90 hover:text-accent-red`}>
                    {fa.nav.logout}
                  </button>
                </>
              ) : showGuestLogin ? (
                <form onSubmit={handleGuestLogin} className="flex items-center gap-2 px-1">
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder={fa.nav.guestPlaceholder}
                    className="px-3 py-1.5 border border-white/15 bg-primary-dark/80 text-white placeholder-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-cyan text-sm w-40"
                    autoFocus
                    dir="rtl"
                  />
                  <button type="submit" className="bg-gradient-to-l from-accent-orange to-accent-red text-white px-4 py-1.5 rounded-xl font-bold transition-opacity hover:opacity-90 text-sm">
                    {fa.nav.go}
                  </button>
                  <button type="button" onClick={() => setShowGuestLogin(false)} className="text-white/50 hover:text-white p-1">
                    <X className="h-5 w-5" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1.5 ps-1">
                  <button onClick={() => setShowGuestLogin(true)} className={linkClass}>
                    {fa.nav.guestLogin}
                  </button>
                  <button
                    onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
                    className="bg-gradient-to-l from-accent-cyan to-primary-mid text-white px-4 py-1.5 rounded-xl font-bold text-sm shadow-md shadow-accent-cyan/20 hover:opacity-95 transition-opacity"
                  >
                    {fa.nav.googleLogin}
                  </button>
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
            <Link to="/events" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-xl">{fa.nav.events}</Link>
            {user ? (
              <>
                <Link to="/my-events" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-semibold text-accent-cyan hover:text-white hover:bg-white/10 rounded-xl">{fa.nav.myEvents}</Link>
                {(userRank === 'administrator' || userRank === 'moderator') && (
                  <Link to="/admin/events" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-xl">{fa.nav.adminEvents}</Link>
                )}
                <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-xl">{fa.nav.profile}</Link>
                <button onClick={handleLogout} className="w-full text-start px-3 py-3 text-base font-semibold text-accent-red hover:bg-accent-red/10 rounded-xl">
                  {fa.nav.logout}
                </button>
              </>
            ) : showGuestLogin ? (
              <form onSubmit={handleGuestLogin} className="flex flex-col gap-3 px-3 py-3 bg-white/5 rounded-2xl border border-white/10">
                <label className="text-sm font-bold text-white/70">{fa.nav.guestUsername}</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={fa.signup.usernamePlaceholder}
                  className="w-full px-4 py-3 border border-white/15 bg-primary-dark text-white placeholder-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-cyan text-base"
                  autoFocus
                  dir="rtl"
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-gradient-to-l from-accent-orange to-accent-red text-white py-3 rounded-xl font-bold transition-opacity hover:opacity-90">
                    {fa.nav.loginAsGuest}
                  </button>
                  <button type="button" onClick={() => setShowGuestLogin(false)} className="px-4 py-3 bg-white/10 text-white/80 hover:bg-white/20 rounded-xl font-bold transition-colors">
                    {fa.nav.cancel}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2 pt-2">
                <button onClick={() => setShowGuestLogin(true)} className="w-full px-4 py-3 text-base font-bold text-white/80 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors">
                  {fa.nav.continueGuest}
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    supabase.auth.signInWithOAuth({ provider: 'google' });
                  }}
                  className="w-full px-4 py-3 text-base font-bold text-white bg-gradient-to-l from-accent-cyan to-primary-mid rounded-xl shadow-md shadow-accent-cyan/20"
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
