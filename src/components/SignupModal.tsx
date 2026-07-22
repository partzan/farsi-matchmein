import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fa } from '../locale/fa';

type SignupModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function SignupModal({ open, onClose, onSuccess }: SignupModalProps) {
  const navigate = useNavigate();
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleGuestSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      alert(fa.signup.guestFail);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from('users').update({ display_name: guestName.trim(), rank: 'guest' }).eq('id', data.user.id);
    }

    setLoading(false);
    onClose();
    onSuccess?.();
    navigate('/onboarding');
  };

  const handleGoogleSignup = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md p-8 text-right">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="بستن"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <span className="text-3xl mb-3 block">🎟️</span>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{fa.signup.title}</h2>
          <p className="text-gray-500 text-sm leading-relaxed">{fa.signup.subtitle}</p>
        </div>

        <form onSubmit={handleGuestSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{fa.signup.username}</label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder={fa.signup.usernamePlaceholder}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-base"
              autoFocus
              required
              dir="rtl"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !guestName.trim()}
            className="w-full bg-primary hover:bg-primary-dark text-white py-3.5 rounded-full font-bold transition-colors disabled:opacity-50"
          >
            {loading ? fa.signup.creating : fa.signup.continueGuest}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs font-bold text-gray-400">{fa.signup.or}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <button
          onClick={handleGoogleSignup}
          className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-900 py-3.5 rounded-full font-bold transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {fa.signup.google}
        </button>

        <p className="text-xs text-gray-400 text-center mt-5">{fa.signup.footer}</p>
      </div>
    </div>
  );
}
