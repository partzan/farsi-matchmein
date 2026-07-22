import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { fa } from '../locale/fa';

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
    <nav className="bg-black border-b border-gray-800 sticky top-0 z-50" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="font-extrabold text-2xl tracking-tight text-white flex items-center gap-1" onClick={() => setIsMobileMenuOpen(false)}>
              <span className="text-primary">★</span> {fa.brand}
            </Link>
          </div>

          <div className="hidden sm:flex items-center gap-6">
            <Link to="/events" className="text-gray-300 hover:text-white font-medium transition-colors">{fa.nav.events}</Link>
            {user ? (
              <>
                <Link to="/my-events" className="text-primary-light hover:text-white font-medium transition-colors whitespace-nowrap">{fa.nav.myEvents}</Link>
                {(userRank === 'administrator' || userRank === 'moderator') && (
                  <Link to="/create-event" className="text-gray-300 hover:text-white font-medium transition-colors">{fa.nav.createEvent}</Link>
                )}
                <Link to="/profile" className="text-gray-300 hover:text-white font-medium transition-colors">{fa.nav.profile}</Link>
                <button onClick={handleLogout} className="text-gray-300 hover:text-white font-medium transition-colors">
                  {fa.nav.logout}
                </button>
              </>
            ) : showGuestLogin ? (
              <form onSubmit={handleGuestLogin} className="flex items-center gap-2">
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={fa.nav.guestPlaceholder}
                  className="px-3 py-1.5 border border-gray-700 bg-gray-800 text-white placeholder-gray-500 rounded-full focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  autoFocus
                  dir="rtl"
                />
                <button type="submit" className="bg-primary hover:bg-primary-dark text-white px-4 py-1.5 rounded-full font-bold transition-colors text-sm">
                  {fa.nav.go}
                </button>
                <button type="button" onClick={() => setShowGuestLogin(false)} className="text-gray-500 hover:text-gray-300 p-1">
                  <X className="h-5 w-5" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-4">
                <button onClick={() => setShowGuestLogin(true)} className="text-gray-300 hover:text-white font-bold transition-colors">
                  {fa.nav.guestLogin}
                </button>
                <button
                  onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
                  className="bg-white hover:bg-gray-100 text-gray-900 px-5 py-2 rounded-full font-bold transition-colors shadow-sm"
                >
                  {fa.nav.googleLogin}
                </button>
              </div>
            )}
          </div>

          <div className="sm:hidden flex items-center">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-400 hover:text-white p-2">
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-800 bg-gray-900 shadow-lg absolute w-full right-0 z-40">
          <div className="px-4 pt-4 pb-6 space-y-2 text-right">
            <Link to="/events" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg">{fa.nav.events}</Link>
            {user ? (
              <>
                <Link to="/my-events" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-primary-light hover:text-primary hover:bg-gray-800 rounded-lg">{fa.nav.myEvents}</Link>
                {(userRank === 'administrator' || userRank === 'moderator') && (
                  <Link to="/create-event" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg">{fa.nav.createEvent}</Link>
                )}
                <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg">{fa.nav.profile}</Link>
                <button onClick={handleLogout} className="w-full text-right px-3 py-3 text-base font-medium text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg">
                  {fa.nav.logout}
                </button>
              </>
            ) : showGuestLogin ? (
              <form onSubmit={handleGuestLogin} className="flex flex-col gap-3 px-3 py-2 bg-gray-800 rounded-xl">
                <label className="text-sm font-bold text-gray-300">{fa.nav.guestUsername}</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={fa.signup.usernamePlaceholder}
                  className="w-full px-4 py-3 border border-gray-700 bg-gray-900 text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base"
                  autoFocus
                  dir="rtl"
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-primary hover:bg-primary-dark text-white py-3 rounded-lg font-bold transition-colors">
                    {fa.nav.loginAsGuest}
                  </button>
                  <button type="button" onClick={() => setShowGuestLogin(false)} className="px-4 py-3 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white rounded-lg font-bold transition-colors">
                    {fa.nav.cancel}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 pt-2">
                <button onClick={() => setShowGuestLogin(true)} className="w-full px-4 py-3 text-base font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors">
                  {fa.nav.continueGuest}
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    supabase.auth.signInWithOAuth({ provider: 'google' });
                  }}
                  className="w-full px-4 py-3 text-base font-bold text-gray-900 bg-white hover:bg-gray-100 rounded-xl transition-colors shadow-md"
                >
                  {fa.nav.loginGoogle}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
