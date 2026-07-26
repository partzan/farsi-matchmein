import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

function HelperBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className="rounded-2xl border-2 border-dashed border-accent-purple/50 bg-primary-light/70 p-5">
      <p className="text-xs font-black tracking-wide text-primary">{title}</p>
      <div className="mt-2 text-sm leading-relaxed text-foreground">{children}</div>
    </aside>
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
      await supabase.auth.signInWithOAuth({ provider: 'google' });
      return;
    }
    await handleSave();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8" dir="rtl">
      {needsAuth && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-orange/40 bg-accent-orange/10 px-4 py-3">
          <p className="text-sm font-bold text-foreground">{fa.profileSetup.loginRequired}</p>
          <button
            type="button"
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
          >
            {fa.nav.loginGoogle}
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-black text-foreground">
            {mode === 'setup' ? fa.profileSetup.title : fa.profile.title}
          </h1>
          {mode === 'edit' && voteTokens !== null && !needsAuth && (
            <VoteCounterRail remaining={voteTokens} sticky={false} />
          )}
        </div>
        {step === 1 ? (
          <StepCounter current={step1DoneCount} required={4} label={fa.profileSetup.fieldsLabel} />
        ) : (
          <StepCounter
            current={interestTotal}
            required={MIN_INTERESTS_TOTAL}
            label={fa.profileSetup.interestsLabel}
          />
        )}
      </div>

      {/* Outside-frame helpers ABOVE the form on mobile */}
      <div className="mb-4 space-y-3 lg:hidden">
        {step === 1 && (
          <HelperBox title={fa.profileSetup.helperTitle}>{fa.profileSetup.helperStep1}</HelperBox>
        )}
        {step === 2 && (
          <>
            <HelperBox title={fa.profileSetup.helperTitle}>{fa.profileSetup.helperStep2Main}</HelperBox>
            <HelperBox title={fa.profileSetup.helperTitle}>{fa.profileSetup.helperStep2Feed}</HelperBox>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_270px]">
        {/* Main form frame */}
        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
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
                  className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-primary-light shadow-sm"
                >
                  <img
                    src={avatarUrl || getAvatarUrl('', 'default')}
                    alt=""
                    className={`h-full w-full object-cover ${uploadingAvatar ? 'opacity-50' : ''}`}
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-black/50 py-1 text-center text-[10px] font-bold text-white">
                    {fa.profile.uploadPhoto}
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

          <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-5">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep(1)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold disabled:opacity-40"
            >
              {fa.profileSetup.back}
            </button>
            <button
              type="button"
              onClick={leaveEarly}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted"
            >
              {fa.profileSetup.skip}
            </button>
            <button
              type="button"
              onClick={leaveEarly}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted"
            >
              {fa.profileSetup.editLater}
            </button>

            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="ms-auto rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white"
              >
                {fa.profileSetup.next}
              </button>
            ) : (
              <button
                type="button"
                disabled={!canSave || saving}
                onClick={requireLoginToSave}
                className="ms-auto rounded-xl bg-gradient-to-l from-accent-orange to-accent-red px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                title={!canSave ? fa.profileSetup.saveDisabledHint : undefined}
              >
                {saving ? fa.common.saving : fa.profileSetup.save}
              </button>
            )}
          </div>
        </div>

        {/* Outside-frame helpers — desktop sidebar */}
        <div className="hidden space-y-3 lg:block">
          {step === 1 && (
            <HelperBox title={fa.profileSetup.helperTitle}>{fa.profileSetup.helperStep1}</HelperBox>
          )}
          {step === 2 && (
            <>
              <HelperBox title={fa.profileSetup.helperTitle}>{fa.profileSetup.helperStep2Main}</HelperBox>
              <HelperBox title={fa.profileSetup.helperTitle}>{fa.profileSetup.helperStep2Feed}</HelperBox>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
