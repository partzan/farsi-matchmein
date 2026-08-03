import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PhoneOtpField } from './PhoneOtpField';
import { BirthDatePicker } from './BirthDatePicker';
import { ProfileInterestsStep } from './ProfileInterestsStep';
import {
  ProfilePreferencesStep,
  clampEventAge,
  eventAgeBounds,
  type MaritalStatus,
} from './ProfilePreferencesStep';
import { VoteCounterRail } from '../VoteCounterRail';
import { VOTING_ENABLED } from '../../lib/features';
import { getAvatarUrl } from '../../lib/avatars';
import {
  MAX_BROAD,
  MAX_SPECIFIC,
  MIN_INTERESTS_TOTAL,
  categoryIdsToBroadIds,
  resolveBroadToCategoryIds,
} from '../../lib/broadInterests';
import { loginUrl } from '../../lib/auth';
import {
  personalityComplete,
  type PersonalityAnswers,
} from '../../lib/personalityQuestions';
import { supabase } from '../../lib/supabase';
import { fa } from '../../locale/fa';

type Category = { id: string; name: string; emoji?: string; group_name?: string; tagline?: string };

const MARITAL_OPTIONS: MaritalStatus[] = ['single', 'married'];

const DEFAULT_EVENT_AGE: [number, number] = [22, 40];
const DEFAULT_INTROVERSION: [number, number] = [3, 7];

function SectionCard({
  emoji,
  title,
  status,
  children,
}: {
  emoji: string;
  title: string;
  status: 'done' | 'required' | 'optional';
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-background/60 p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
          {emoji}
        </span>
        <h3 className="flex-1 text-base font-black text-foreground">{title}</h3>
        {status === 'done' && (
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-black text-emerald-700">
            ✓ {fa.profileSetup.sectionDone}
          </span>
        )}
        {status === 'required' && (
          <span className="rounded-full bg-accent-red/10 px-2.5 py-1 text-[11px] font-black text-accent-red">
            {fa.profileSetup.sectionRequired}
          </span>
        )}
        {status === 'optional' && (
          <span className="rounded-full bg-border/60 px-2.5 py-1 text-[11px] font-bold text-muted">
            {fa.common.optional}
          </span>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

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

/** Playful three-step wizard: 👤 ─── 🎯 ─── 🎚️ */
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
    { n: 3, emoji: '🎚️', label: fa.profileSetup.stepPrefs },
  ];
  return (
    <div className="mx-auto flex w-full max-w-md items-center gap-1 sm:gap-2">
      {steps.map((s, i) => (
        <div key={s.n} className={`flex items-center ${i > 0 ? 'flex-1' : ''}`}>
          {i > 0 && (
            <div className="relative mx-1.5 h-1.5 flex-1 overflow-hidden rounded-full bg-border sm:mx-2">
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
              className={`flex h-11 w-11 items-center justify-center rounded-full text-lg transition-all duration-300 sm:h-12 sm:w-12 sm:text-xl ${
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
              className={`max-w-[4.5rem] text-center text-[10px] font-black leading-tight sm:max-w-none sm:text-xs ${
                step === s.n ? 'text-primary' : 'text-muted'
              }`}
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
  const [showAuthGate, setShowAuthGate] = useState(false);
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
  const [birthDate, setBirthDate] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | ''>('');
  const [eventAge, setEventAge] = useState<[number, number]>(DEFAULT_EVENT_AGE);
  const [introversion, setIntroversion] = useState<[number, number]>(DEFAULT_INTROVERSION);
  const [personality, setPersonality] = useState<PersonalityAnswers>({});

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
          .select(
            'display_name, avatar_url, vote_tokens, birth_date, marital_status, event_age_min, event_age_max, introversion_min, introversion_max, personality_answers',
          )
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
        if (profile?.birth_date) setBirthDate(String(profile.birth_date).slice(0, 10));
        if (profile?.marital_status) setMaritalStatus(profile.marital_status as MaritalStatus);
        if (profile?.event_age_min != null && profile?.event_age_max != null) {
          setEventAge([profile.event_age_min, profile.event_age_max]);
        }
        if (profile?.introversion_min != null && profile?.introversion_max != null) {
          setIntroversion([profile.introversion_min, profile.introversion_max]);
        }
        if (profile?.personality_answers && typeof profile.personality_answers === 'object') {
          setPersonality(profile.personality_answers as PersonalityAnswers);
        }

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
    if (birthDate) n += 1;
    if (maritalStatus) n += 1;
    return n;
  }, [avatarUrl, firstName, lastName, phone, phoneVerified, birthDate, maritalStatus]);

  const userAge = useMemo(() => {
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
    const [y, m, d] = birthDate.split('-').map(Number);
    const today = new Date();
    let age = today.getFullYear() - y;
    const md = today.getMonth() + 1 - m;
    if (md < 0 || (md === 0 && today.getDate() < d)) age -= 1;
    return age >= 0 ? age : null;
  }, [birthDate]);

  useEffect(() => {
    if (userAge == null) return;
    setEventAge((prev) => clampEventAge(prev, userAge));
  }, [userAge]);

  const interestTotal = broadIds.length + specificIds.length;
  const step2Complete = interestTotal >= MIN_INTERESTS_TOTAL;
  const step1RequiredDone = Boolean(birthDate && maritalStatus);
  const ageBounds = eventAgeBounds(userAge);
  const step3Complete =
    !!ageBounds &&
    eventAge[0] >= ageBounds.min &&
    eventAge[1] <= ageBounds.max &&
    eventAge[0] <= eventAge[1] &&
    introversion[0] >= 1 &&
    introversion[1] <= 10 &&
    introversion[0] <= introversion[1] &&
    personalityComplete(personality);
  const canSave = step2Complete && step1RequiredDone && step3Complete;

  const leaveEarly = () => navigate('/events');
  const returnPath = mode === 'setup' ? '/profile-setup' : '/profile';
  const loginHref = loginUrl({ next: returnPath });
  const signupHref = loginUrl({ mode: 'signup', next: returnPath });

  const openAuthGate = () => {
    if (needsAuth) setShowAuthGate(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (needsAuth) {
      openAuthGate();
      return;
    }
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
          birth_date: birthDate || null,
          marital_status: maritalStatus || null,
          event_age_min: eventAge[0],
          event_age_max: eventAge[1],
          introversion_min: introversion[0],
          introversion_max: introversion[1],
          personality_answers: personality,
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
      openAuthGate();
      return;
    }
    await handleSave();
  };

  const AuthCtas = ({ className = '' }: { className?: string }) => (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Link
        to={loginHref}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark"
      >
        {fa.profileSetup.loginToAccount}
      </Link>
      <Link
        to={signupHref}
        className="rounded-xl border-2 border-primary px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary-light"
      >
        {fa.profileSetup.createNewAccount}
      </Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8" dir="rtl">
      {needsAuth && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-orange/40 bg-accent-orange/10 px-4 py-3">
          <p className="text-sm font-bold text-foreground">{fa.profileSetup.loginRequired}</p>
          <AuthCtas />
        </div>
      )}

      {showAuthGate && needsAuth && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label={fa.nav.cancel}
            onClick={() => setShowAuthGate(false)}
          />
          <div className="relative w-full max-w-sm rounded-3xl border border-border bg-white p-6 text-center shadow-2xl">
            <p className="mb-5 text-base font-bold text-foreground">{fa.profileSetup.authGateHint}</p>
            <AuthCtas className="justify-center" />
            <button
              type="button"
              onClick={() => setShowAuthGate(false)}
              className="mt-4 text-sm font-semibold text-muted hover:text-primary"
            >
              {fa.nav.cancel}
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
            {VOTING_ENABLED && mode === 'edit' && voteTokens !== null && !needsAuth && (
              <VoteCounterRail remaining={voteTokens} sticky={false} />
            )}
          </div>
          {step === 1 && (
            <StepCounter current={step1DoneCount} required={6} label={fa.profileSetup.fieldsLabel} />
          )}
          {step === 2 && (
            <StepCounter
              current={interestTotal}
              required={MIN_INTERESTS_TOTAL}
              label={fa.profileSetup.interestsLabel}
            />
          )}
          {step === 3 && (
            <StepCounter
              current={
                (ageBounds ? 1 : 0) +
                (introversion[0] <= introversion[1] ? 1 : 0) +
                (personalityComplete(personality) ? 1 : 0)
              }
              required={3}
              label={fa.profileSetup.stepPrefs}
            />
          )}
        </div>

        <FunStepper
          step={step}
          onStepClick={(s) => {
            if (needsAuth) {
              openAuthGate();
              return;
            }
            setStep(s);
          }}
        />

        {step === 1 && (
          <p className="text-center text-lg font-black text-foreground">
            {fa.profileSetup.step1Fun}
          </p>
        )}
        {step === 2 && (
          <p className="text-center text-lg font-black text-foreground">
            {fa.profileSetup.step2Fun}
          </p>
        )}
      </div>

      <div className="relative mx-auto max-w-4xl">
        {needsAuth && (
          <button
            type="button"
            className="absolute inset-0 z-20 cursor-pointer rounded-3xl"
            aria-label={fa.profileSetup.authGateHint}
            onClick={openAuthGate}
          />
        )}

        {/* Main form frame */}
        <div
          className={`rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-8 ${
            needsAuth ? 'pointer-events-none select-none opacity-60' : ''
          }`}
        >
          {error && (
            <p className="mb-4 rounded-xl bg-accent-red/10 px-3 py-2 text-sm font-semibold text-accent-red">
              {error}
            </p>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <SectionCard
                emoji="👤"
                title={fa.profileSetup.sec1Basic}
                status={
                  avatarUrl && firstName.trim() && lastName.trim() ? 'done' : 'required'
                }
              >
                <div className="flex flex-col items-center gap-5 sm:flex-row">
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

                  <div className="grid w-full flex-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-bold">{fa.profileSetup.firstName}</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full rounded-xl border border-border bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-bold">{fa.profileSetup.lastName}</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full rounded-xl border border-border bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                emoji="🎂"
                title={fa.profileSetup.sec1Birth}
                status={birthDate && maritalStatus ? 'done' : 'required'}
              >
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      {fa.profileSetup.maritalStatus}{' '}
                      <span className="text-accent-red">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {MARITAL_OPTIONS.map((opt) => {
                        const selected = maritalStatus === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setMaritalStatus(opt)}
                            className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3.5 text-base font-black transition-all active:scale-95 ${
                              selected
                                ? 'border-primary bg-primary text-white shadow-md shadow-primary/25'
                                : 'border-border bg-white text-foreground hover:border-primary'
                            }`}
                          >
                            <span className="text-xl" aria-hidden>
                              {opt === 'single' ? '🧍' : '💍'}
                            </span>
                            {fa.profileSetup.maritalOptions[opt]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <BirthDatePicker value={birthDate} onChange={setBirthDate} />
                </div>
              </SectionCard>

              <SectionCard
                emoji="📞"
                title={fa.profileSetup.sec1Contact}
                status={phoneVerified && phone.trim().length >= 10 ? 'done' : 'optional'}
              >
                <div className="space-y-4">
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
                      className="w-full rounded-xl border border-border bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      dir="ltr"
                    />
                  </div>
                </div>
              </SectionCard>
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

          {step === 3 && (
            <ProfilePreferencesStep
              userAge={userAge}
              eventAge={eventAge}
              onEventAgeChange={setEventAge}
              introversion={introversion}
              onIntroversionChange={setIntroversion}
              personality={personality}
              onPersonalityChange={setPersonality}
            />
          )}

          <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-border pt-5">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
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

            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !step1RequiredDone) {
                    setError(
                      !birthDate
                        ? fa.profileSetup.birthDateRequired
                        : fa.profileSetup.maritalRequired,
                    );
                    return;
                  }
                  if (step === 2 && !step2Complete) {
                    setError(fa.profileSetup.saveDisabledHint);
                    return;
                  }
                  setError(null);
                  setStep((s) => s + 1);
                }}
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
                title={
                  !canSave
                    ? !step2Complete
                      ? fa.profileSetup.saveDisabledHint
                      : !step1RequiredDone
                        ? fa.profileSetup.birthDateRequired
                        : fa.profileSetup.prefsIncomplete
                    : undefined
                }
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
