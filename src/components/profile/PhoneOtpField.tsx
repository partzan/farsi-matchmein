import { useEffect, useState } from 'react';
import { sendPhoneOtp, verifyPhoneOtpChange } from '../../lib/otp';
import { fa } from '../../locale/fa';

type Props = {
  phone: string;
  verified: boolean;
  onVerified: (display: string) => void;
  onClearVerified: () => void;
};

/**
 * Phone is locked until OTP succeeds (via Kavenegar Edge Function).
 */
export function PhoneOtpField({ phone, verified, onVerified, onClearVerified }: Props) {
  const [editing, setEditing] = useState(!phone);
  const [draft, setDraft] = useState(phone);
  const [otp, setOtp] = useState('');
  const [phase, setPhase] = useState<'idle' | 'otp'>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPhone, setPendingPhone] = useState('');

  useEffect(() => {
    setDraft(phone);
    if (phone && verified) setEditing(false);
  }, [phone, verified]);

  const sendOtp = async () => {
    setError(null);
    setLoading(true);
    const result = await sendPhoneOtp(draft, 'phone_change');
    setLoading(false);
    if (!result.ok) {
      setError(result.message || fa.login.sendFail);
      return;
    }
    setPendingPhone(result.phone);
    setPhase('otp');
  };

  const verify = async () => {
    setError(null);
    if (otp.trim().length < 4) {
      setError(fa.login.invalidOtp);
      return;
    }
    setLoading(true);
    const result = await verifyPhoneOtpChange(pendingPhone || draft, otp.trim());
    setLoading(false);
    if (!result.ok) {
      setError(result.message || fa.login.verifyFail);
      return;
    }
    onVerified(result.phone);
    setDraft(result.phone);
    setEditing(false);
    setPhase('idle');
    setOtp('');
  };

  const startChange = () => {
    onClearVerified();
    setEditing(true);
    setPhase('idle');
    setOtp('');
    setError(null);
  };

  return (
    <div className="space-y-2">
      <label className="mb-1.5 block text-sm font-bold">{fa.login.phoneLabel}</label>

      {!editing ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div
            className="flex-1 rounded-xl border border-border bg-background/80 px-4 py-3 font-semibold text-foreground"
            dir="ltr"
          >
            {phone || '—'}
          </div>
          <button
            type="button"
            onClick={startChange}
            className="shrink-0 rounded-xl border border-primary px-4 py-3 text-sm font-bold text-primary hover:bg-primary-light"
          >
            {fa.profileSetup.changePhone}
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="tel"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={fa.login.phonePlaceholder}
              className="w-full flex-1 rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              dir="ltr"
              autoFocus
            />
            {phase === 'idle' ? (
              <button
                type="button"
                disabled={loading}
                onClick={sendOtp}
                className="shrink-0 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {loading ? fa.login.sending : fa.profileSetup.verifyPhone}
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={verify}
                className="shrink-0 rounded-xl bg-accent-orange px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {loading ? fa.login.verifying : fa.login.verifyBtn}
              </button>
            )}
          </div>
          {phase === 'otp' && (
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder={fa.login.otpLabel}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-primary"
              dir="ltr"
            />
          )}
        </>
      )}

      {verified && !editing && (
        <p className="text-xs font-semibold text-emerald-600">{fa.profileSetup.phoneVerified}</p>
      )}
      {error && <p className="text-xs font-semibold text-accent-red">{error}</p>}
      <p className="text-xs text-muted">{fa.profileSetup.phoneOtpHint}</p>
    </div>
  );
}
