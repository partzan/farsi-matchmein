import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PhoneOtpField } from './PhoneOtpField';
import { ProfileInterestsStep } from './ProfileInterestsStep';
import { VoteCounterRail } from '../VoteCounterRail';
import { getAvatarUrl } from '../../lib/avatars';
import {
  MAX_BROAD,
  MAX_SPECIFIC,
  MIN_INTERESTS_TOTAL,
  categoryIdsToBroadIds,
  resolveBroadToCategoryIds,
} from '../../lib/broadInterests';
import { signInWithGoogle } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { fa } from '../../locale/fa';

type Category = { id: string; name: string; emoji?: string; group_name?: string; tagline?: string };

function StepCounter({
  current,
  required,
  label,
}: {
  current: number;
  required: number;
  label: string;
}) {
  const met = current >= required;
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-bold ${
        met ? 'bg-emerald-500/15 text-emerald-700' : 'bg-accent-red/10 text-accent-red'
      }`}
      aria-live="polite"
    >
      <span className="tabular-nums">
        {current}/{required}
      </span>
      <span>{label}</span>
    </div>
  );
}

/** Playful two-step wizard header: 👤 ─── 🎯 */
function FunStepper({
  step,
  onStepClick,
}: {
  step: number;
  onStepClick: (s: number) => void;
}) {
  const steps = [
    { n: 1, emoji: '👤', label: fa.profileSetup.stepInfo },
    { n: 2, emoji: '🎯', label: fa.profileSetup.stepInterests },
  ];
  return (
    <div className="mx-auto flex w-full max-w-sm items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.n} className={`flex items-center ${i > 0 ? 'flex-1' : ''}`}>
          {i > 0 && (
            <div className="relative mx-2 h-1.5 flex-1 overflow-hidden rounded-full bg-border">
              <div
                className={`absolute inset-y-0 start-0 rounded-full bg-gradient-to-l from-accent-purple to-primary transition-all duration-500 ${
                  step >= s.n ? 'w-full' : 'w-0'
                }`}
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => onStepClick(s.n)}
            className="flex flex-col items-center gap-1"
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition-all duration-300 ${
                step === s.n
                  ? 'scale-110 bg-gradient-to-br from-primary to-accent-purple shadow-lg shadow-primary/30 ring-4 ring-primary-light'
                  : step > s.n
                    ? 'bg-emerald-500/15'
                    : 'bg-background ring-2 ring-border'
              }`}
            >
              {step > s.n ? '✅' : s.emoji}
            </span>
            <span
              className={`text-xs font-black ${step === s.n ? 'text-primary' : 'text-muted'}`}
            >
              {s.label}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}

type ProfileFormProps = {
  mode: 'setup' | 'edit';
};

export function ProfileForm({ mode }: ProfileFormProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [voteTokens, setVoteTokens] = useState<number | null>(null);

  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [email, setEmail] = useState('');

  const [broadIds, setBroadIds] = useState<string[]>([]);
  const [specificIds, setSpecificIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: cats } = await supabase
          .from('interest_categories')
          .select('id, name, group_name, emoji, tagline')
          .order('name');
        if (cancelled) return;
        if (cats) setCategories(cats);

        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        const user = session?.user ?? null;
        if (!user) {
          setNeedsAuth(true);
          return;
        }

        setEmail(user.email || '');
        if (user.phone) {
          setPhone(user.phone.replace('+98', '0'));
          setPhoneVerified(true);
        }

        const { data: profile } = await supabase
          .from('users')
          .select('display_name, avatar_url, vote_tokens')
          .eq('id', user.id)
          .maybeSingle();
        if (cancelled) return;

        const name =
          profile?.display_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          '';
        if (name) {
          const parts = name.trim().split(/\s+/);
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
        }

        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
        if (profile?.vote_tokens !== undefined) setVoteTokens(profile.vote_tokens);

        const { data: interests } = await supabase
          .from('user_interests')
          .select('category_id, priority_level')
          .eq('user_id', user.id);
        if (cancelled) return;

        if (interests && cats) {
          const high = interests.filter((i) => i.priority_level === 1).map((i) => i.category_id);
          const normal = interests.filter((i) => i.priority_level !== 1).map((i) => i.category_id);
          setBroadIds(categoryIdsToBroadIds(high, cats));
          setSpecificIds(normal);
        }
      } catch (err) {
        console.error('Profile load failed', err);
        setError(fa.profile.errors.saveFailed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const step1DoneCount = useMemo(() => {
    let n = 0;
    if (avatarUrl) n += 1;
    if (firstName.trim()) n += 1;
    if (lastName.trim()) n += 1;
    if (phoneVerified && phone.trim().length >= 10) n += 1;
    return n;
  }, [avatarUrl, firstName, lastName, phone, phoneVerified]);

  const interestTotal = broadIds.length + specificIds.length;
  const step2Complete = interestTotal >= MIN_INTERESTS_TOTAL;
  const canSave = step2Complete;

  const leaveEarly = () => navigate('/events');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch (err) {
      console.error(err);
      setError(fa.profile.errors.imageOnly);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleBroad = (id: string) => {
    setBroadIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_BROAD) return prev;
      return [...prev, id];
    });
  };

  const toggleSpecific = (id: string) => {
    setSpecificIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SPECIFIC) return prev;
      return [...prev, id];
    });
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(fa.profile.errors.notAuthenticated);

      const display_name = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { error: profileError } = await supabase
        .from('users')
        .update({
          display_name,
          avatar_url: avatarUrl || null,
          profile_updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (profileError) throw profileError;

      const highIds = resolveBroadToCategoryIds(broadIds, categories);
      const highSet = new Set(highIds);
      const specificClean = specificIds.filter((id) => !highSet.has(id));

      await supabase.from('user_interests').delete().eq('user_id', user.id);
      const inserts = [
        ...highIds.map((id) => ({ user_id: user.id, category_id: id, priority_level: 1 })),
        ...specificClean.map((id) => ({ user_id: user.id, category_id: id, priority_level: 2 })),
      ];
      if (inserts.length) {
        const { error: interestsError } = await supabase.from('user_interests').insert(inserts);
        if (interestsError) throw interestsError;
      }

      navigate('/events', { replace: true });
    } catch (err: any) {
      setError(err.message || fa.profile.errors.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-muted">{fa.profile.loading}</div>;
  }

  const requireLoginToSave = async () => {
    if (needsAuth) {
      await signInWithGoogle('/');
      return;
    }
    await handleSave();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8" dir="rtl">
      {needsAuth && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-orange/40 bg-accent-orange/10 px-4 py-3">
          <p className="text-sm font-bold text-foreground">{fa.profileSetup.loginRequired}</p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/login"
              className="rounded-xl border border-primary px-4 py-2 text-sm font-bold text-primary"
            >
              {fa.nav.login}
            </Link>
            <button
              type="button"
              onClick={() => signInWithGoogle('/')}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
            >
              {fa.nav.loginGoogle}
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-foreground">
              {mode === 'setup' ? fa.profileSetup.title : fa.profile.title}
            </h1>
            {mode === 'edit' && voteTokens !== null && !needsAuth && (
              <VoteCounterRail remaining={voteTokens} sticky={false} />
            )}
          </div>
          {step === 1 && (
            <StepCounter current={step1DoneCount} required={4} label={fa.profileSetup.fieldsLabel} />
          )}
        </div>

        <FunStepper step={step} onStepClick={setStep} />

        {step === 1 && (
          <p className="text-center text-lg font-black text-foreground">
            {fa.profileSetup.step1Fun}
          </p>
        )}
      </div>

      <div className="mx-auto max-w-4xl">
        {/* Main form frame */}
        <div className="rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-8">
          {error && (
            <p className="mb-4 rounded-xl bg-accent-red/10 px-3 py-2 text-sm font-semibold text-accent-red">
              {error}
            </p>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative shrink-0 rounded-full bg-gradient-to-br from-primary via-accent-purple to-accent-orange p-1 shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
                >
                  <span className="relative block h-28 w-28 overflow-hidden rounded-full border-4 border-white">
                    <img
                      src={avatarUrl || getAvatarUrl('', 'default')}
                      alt=""
                      className={`h-full w-full object-cover ${uploadingAvatar ? 'opacity-50' : ''}`}
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-black/50 py-1 text-center text-[10px] font-bold text-white">
                      {fa.profile.uploadPhoto}
                    </span>
                  </span>
                  <span className="absolute -bottom-1 -end-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg shadow-md transition-transform group-hover:rotate-12">
                    📸
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </button>

                <div className="w-full flex-1 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-bold">{fa.profileSetup.firstName}</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-bold">{fa.profileSetup.lastName}</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <PhoneOtpField
                    phone={phone}
                    verified={phoneVerified}
                    onVerified={(v) => {
                      setPhone(v);
                      setPhoneVerified(true);
                    }}
                    onClearVerified={() => setPhoneVerified(false)}
                  />

                  <div>
                    <label className="mb-1.5 block text-sm font-bold">
                      {fa.profileSetup.email}{' '}
                      <span className="font-medium text-muted">{fa.common.optional}</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <ProfileInterestsStep
              categories={categories}
              broadIds={broadIds}
              specificIds={specificIds}
              onToggleBroad={toggleBroad}
              onToggleSpecific={toggleSpecific}
            />
          )}

          <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-border pt-5">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep(1)}
              className="rounded-full border-2 border-border px-4 py-2.5 text-sm font-bold transition-colors hover:border-primary disabled:opacity-40"
            >
              {fa.profileSetup.back}
            </button>
            <button
              type="button"
              onClick={leaveEarly}
              className="rounded-full border-2 border-transparent px-4 py-2.5 text-sm font-bold text-muted transition-colors hover:text-foreground"
            >
              {fa.profileSetup.editLater}
            </button>

            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="ms-auto rounded-full bg-gradient-to-l from-primary to-accent-purple px-7 py-3 text-sm font-black text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
              >
                {fa.profileSetup.next} ←
              </button>
            ) : (
              <button
                type="button"
                disabled={!canSave || saving}
                onClick={requireLoginToSave}
                className="ms-auto rounded-full bg-gradient-to-l from-accent-orange to-accent-red px-7 py-3 text-sm font-black text-white shadow-lg shadow-accent-red/25 transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
                title={!canSave ? fa.profileSetup.saveDisabledHint : undefined}
              >
                {saving ? fa.common.saving : `${fa.profileSetup.save} 🚀`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
