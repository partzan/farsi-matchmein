import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { canAccessAdmin, ensureAdministratorRank } from '../lib/admin';
import {
  BROAD_INTERESTS,
  categoriesForNames,
  type BroadInterest,
} from '../lib/broadInterests';
import { EVENT_ICONS } from '../lib/eventIcons';
import { supabase } from '../lib/supabase';
import { categoryFa } from '../locale/categoriesFa';
import { fa } from '../locale/fa';

type Category = { id: string; name: string; emoji?: string; group_name?: string };
type EventCreateType = 'publish' | 'voting';

const TOTAL_STEPS = 4;
const RELATED_REQUIRED = 3;

export function CreateEvent() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [eventType, setEventType] = useState<EventCreateType | ''>('');
  const [broadId, setBroadId] = useState('');
  const [relatedIds, setRelatedIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<string>(EVENT_ICONS[0]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');

  const selectedBroad = useMemo(
    () => BROAD_INTERESTS.find((b) => b.id === broadId) ?? null,
    [broadId],
  );

  const relatedSpecifics = useMemo(() => {
    if (!selectedBroad) return [] as Category[];
    return categoriesForNames(selectedBroad.specifics, categories as any);
  }, [selectedBroad, categories]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('rank')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!canAccessAdmin(session.user.email, profile?.rank)) {
        navigate('/');
        return;
      }
      await ensureAdministratorRank(session.user.id, session.user.email, profile?.rank);

      const { data: cats } = await supabase
        .from('interest_categories')
        .select('id, name, emoji, group_name')
        .order('name');
      if (!cancelled && cats) setCategories(cats);
      if (!cancelled) setChecking(false);
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const selectBroad = (id: string) => {
    setBroadId(id);
    setRelatedIds([]);
  };

  const toggleRelated = (id: string) => {
    setRelatedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= RELATED_REQUIRED) return prev;
      return [...prev, id];
    });
  };

  const canNext =
    (step === 1 && !!eventType) ||
    (step === 2 && !!broadId && relatedIds.length === RELATED_REQUIRED) ||
    (step === 3 && !!title.trim() && !!description.trim() && !!icon) ||
    (step === 4 && !!date && !!time && !!location.trim());

  const handleNext = () => {
    if (!canNext) {
      setError(
        step === 1
          ? fa.createEvent.needType
          : step === 2
            ? relatedIds.length !== RELATED_REQUIRED
              ? fa.createEvent.errorExactly3
              : fa.createEvent.needCategory
            : step === 3
              ? fa.createEvent.needDetails
              : fa.createEvent.needSchedule,
      );
      return;
    }
    setError(null);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const handlePublish = async () => {
    if (!canNext || !eventType) {
      setError(fa.createEvent.needSchedule);
      return;
    }
    if (relatedIds.length !== RELATED_REQUIRED) {
      setError(fa.createEvent.errorExactly3);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(fa.createEvent.mustLoginError);

      const { data: profile } = await supabase
        .from('users')
        .select('rank')
        .eq('id', user.id)
        .maybeSingle();
      if (!canAccessAdmin(user.email, profile?.rank)) {
        throw new Error(fa.createEvent.adminOnlyError);
      }

      const status = eventType === 'voting' ? 'voting' : 'available';

      const { data, error: insertError } = await supabase
        .from('events')
        .insert({
          host_id: user.id,
          title: title.trim(),
          pitch: description.trim(),
          description: description.trim(),
          category_id: relatedIds[0],
          location: location.trim(),
          datetime: new Date(`${date}T${time}`).toISOString(),
          targeted_interest_ids: relatedIds,
          gender_restriction: 'everyone',
          icon,
          status,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (data?.id) {
        await supabase.rpc('compute_event_matches', { new_event_id: data.id });
        await supabase.from('event_rsvps').insert({
          event_id: data.id,
          user_id: user.id,
          status: 'going',
        });
      }

      navigate('/admin/events');
    } catch (err: any) {
      console.error(err);
      setError(err.message || fa.createEvent.publishFailedError);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="py-20 text-center text-muted" dir="rtl">
        {fa.profile.loading}
      </div>
    );
  }

  const relatedLabels = relatedIds
    .map((id) => categoryFa(categories.find((c) => c.id === id)?.name))
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8" dir="rtl">
      <div className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-black text-foreground sm:text-3xl">
            {fa.createEvent.title}
          </h1>
          <span className="rounded-full bg-primary-light px-3 py-1 text-sm font-bold text-primary">
            {fa.createEvent.stepPrefix} {step.toLocaleString('fa-IR')}{' '}
            {fa.createEvent.stepOf}
          </span>
        </div>

        <div className="mb-8 flex gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full ${
                step >= n ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-accent-red/10 px-4 py-3 text-sm font-semibold text-accent-red">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <section>
              <h2 className="text-lg font-black text-foreground">
                {fa.createEvent.chooseType}
              </h2>
              <p className="mt-1 text-sm text-muted">{fa.createEvent.typeHint}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <TypeCard
                  selected={eventType === 'publish'}
                  title={fa.createEvent.typePublish}
                  hint={fa.createEvent.typePublishHint}
                  onSelect={() => setEventType('publish')}
                />
                <TypeCard
                  selected={eventType === 'voting'}
                  title={fa.createEvent.typeVoting}
                  hint={fa.createEvent.typeVotingHint}
                  onSelect={() => setEventType('voting')}
                />
              </div>
            </section>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-black text-foreground">
                {fa.createEvent.choosePrimary}
              </h2>
              <p className="mt-1 text-sm text-muted">{fa.createEvent.primaryHint}</p>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
                {BROAD_INTERESTS.map((opt) => (
                  <BroadCard
                    key={opt.id}
                    opt={opt}
                    selected={broadId === opt.id}
                    onToggle={() => selectBroad(opt.id)}
                  />
                ))}
              </div>
            </section>

            {selectedBroad && (
              <section>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-black text-foreground">
                      {fa.createEvent.chooseRelated}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {fa.createEvent.relatedHint.replace('{broad}', selectedBroad.label)}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-bold text-primary">
                    {fa.createEvent.relatedSelected.replace(
                      '{count}',
                      relatedIds.length.toLocaleString('fa-IR'),
                    )}
                  </span>
                </div>
                {relatedSpecifics.length === 0 ? (
                  <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
                    {fa.createEvent.noRelated}
                  </p>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {relatedSpecifics.map((cat) => {
                      const selected = relatedIds.includes(cat.id);
                      const atLimit = relatedIds.length >= RELATED_REQUIRED && !selected;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleRelated(cat.id)}
                          disabled={atLimit}
                          className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                            selected
                              ? `bg-gradient-to-l ${selectedBroad.gradient} text-white shadow-md`
                              : atLimit
                                ? 'border border-border bg-background text-muted opacity-50'
                                : 'border border-border bg-background text-foreground hover:border-primary'
                          }`}
                        >
                          {cat.emoji ? `${cat.emoji} ` : ''}
                          {categoryFa(cat.name)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-bold">{fa.createEvent.titleLabel}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={fa.createEvent.titlePlaceholder}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold">
                {fa.createEvent.descriptionLabel}
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={fa.createEvent.descriptionPlaceholder}
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold">{fa.createEvent.iconLabel}</label>
              <p className="mb-3 text-sm text-muted">{fa.createEvent.iconHint}</p>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                {EVENT_ICONS.map((emoji) => {
                  const selected = icon === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setIcon(emoji)}
                      className={`flex aspect-square items-center justify-center rounded-xl text-2xl transition ${
                        selected
                          ? 'bg-primary text-white ring-4 ring-primary/25'
                          : 'border border-border bg-background hover:border-primary'
                      }`}
                      aria-label={emoji}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold">{fa.createEvent.dateLabel}</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold">{fa.createEvent.timeLabel}</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold">
                {fa.createEvent.locationLabel}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={fa.createEvent.locationPlaceholder}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="rounded-2xl border border-border bg-background/60 p-4 text-sm">
              <p className="text-xs font-bold text-primary">
                {eventType === 'voting'
                  ? fa.createEvent.typeVoting
                  : fa.createEvent.typePublish}
              </p>
              <p className="mt-1 font-bold text-foreground">
                {icon} {title || fa.createEvent.titleLabel}
              </p>
              <p className="mt-1 text-muted line-clamp-3">{description}</p>
              <p className="mt-2 text-xs font-semibold text-primary">
                {selectedBroad?.emoji} {selectedBroad?.label}
                {relatedLabels.length > 0 ? ` · ${relatedLabels.join('، ')}` : ''}
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 flex gap-3 border-t border-border pt-6">
          {step > 1 && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep((s) => s - 1);
              }}
              className="flex-1 rounded-xl bg-background py-3.5 text-sm font-bold text-foreground transition hover:bg-border/60"
            >
              {fa.interestPicker.back}
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext}
              className="flex-[2] rounded-xl bg-primary py-3.5 text-sm font-bold text-white transition hover:bg-primary-dark disabled:opacity-40"
            >
              {fa.createEvent.continueBtn}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={loading || !canNext}
              className="flex-[2] rounded-xl bg-primary py-3.5 text-sm font-bold text-white transition hover:bg-primary-dark disabled:opacity-40"
            >
              {loading
                ? fa.createEvent.publishing
                : eventType === 'voting'
                  ? fa.createEvent.submitVoting
                  : fa.createEvent.publishEvent}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TypeCard({
  selected,
  title,
  hint,
  onSelect,
}: {
  selected: boolean;
  title: string;
  hint: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative rounded-2xl border-2 p-5 text-start transition active:scale-[0.98] ${
        selected
          ? 'border-primary bg-primary-light/40 shadow-md'
          : 'border-border bg-white hover:border-primary'
      }`}
    >
      {selected && (
        <span className="absolute -top-2 -start-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow">
          <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
        </span>
      )}
      <p className="text-base font-black text-foreground">{title}</p>
      <p className="mt-1.5 text-sm text-muted">{hint}</p>
    </button>
  );
}

function BroadCard({
  opt,
  selected,
  onToggle,
}: {
  opt: BroadInterest;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative flex min-h-[6.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 text-center transition active:scale-[0.97] ${
        selected
          ? `border-transparent bg-gradient-to-br ${opt.gradient} text-white shadow-lg`
          : 'border-border bg-white text-foreground hover:border-primary hover:shadow-md'
      }`}
    >
      {selected && (
        <span className="absolute -top-2 -start-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-primary shadow">
          <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
        </span>
      )}
      <span className="text-3xl">{opt.emoji}</span>
      <span className="text-xs font-black leading-snug">{opt.label}</span>
    </button>
  );
}
