import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, MapPin, ImagePlus, Sparkles, Upload } from 'lucide-react';
import { canAccessAdmin, ensureAdministratorRank } from '../lib/admin';
import {
  BROAD_INTERESTS,
  categoriesForNames,
  canonicalCategoryName,
  type BroadInterest,
} from '../lib/broadInterests';
import { searchCities, type CityOption } from '../lib/cities';
import { uploadEventImage, uploadEventImageFromDataUrl } from '../lib/eventImages';
import { iconsForEventSelection } from '../lib/eventIcons';
import { VOTING_ENABLED } from '../lib/features';
import { getLlmApi, isLlmApiEnabled, readEdgeFunctionError } from '../lib/llmApis';
import { pickPrimaryInterestId } from '../lib/matchmaking';
import { supabase } from '../lib/supabase';
import { categoryFa } from '../locale/categoriesFa';
import { fa } from '../locale/fa';
import { JalaliEventDatePicker } from '../components/JalaliEventDatePicker';

type Category = { id: string; name: string; emoji?: string; group_name?: string };
type EventCreateType = 'publish' | 'voting';
type ImagePhase = 'choose' | 'preview' | 'approved';

/** Map edge auth / OpenRouter key failures to clear Persian copy. */
function mapImageGenerateError(message: string): string {
  const m = message.trim();
  if (/^Unauthorized$/i.test(m) || /Supabase unauthorized/i.test(m)) {
    return fa.createEvent.imageGenerateAuthError;
  }
  if (
    /OpenRouter unauthorized/i.test(m) ||
    /Image provider unauthorized/i.test(m) ||
    /IMAGE_GENERATOR_API_KEY/i.test(m) ||
    /OPENROUTER_API_KEY/i.test(m)
  ) {
    return fa.createEvent.imageGenerateApiKeyError;
  }
  return m || fa.createEvent.imageGenerateFailed;
}

const TOTAL_STEPS = 5;
const RELATED_MAX = 3;
const LESS_MAX = 3;
const DEFAULT_TIME = '18:00';
const generateEnabled = isLlmApiEnabled('image_generator');

export function CreateEvent() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [broadId, setBroadId] = useState('');
  const [relatedIds, setRelatedIds] = useState<string[]>([]);
  const [lessSuitableIds, setLessSuitableIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState(DEFAULT_TIME);
  const [ticketPrice, setTicketPrice] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [city, setCity] = useState<CityOption | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const [eventType, setEventType] = useState<EventCreateType>(
    VOTING_ENABLED ? 'voting' : 'publish',
  );
  const [imagePhase, setImagePhase] = useState<ImagePhase>('choose');
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [pendingDataUrl, setPendingDataUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [approvedImageUrl, setApprovedImageUrl] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const cityBoxRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedBroad = useMemo(
    () => BROAD_INTERESTS.find((b) => b.id === broadId) ?? null,
    [broadId],
  );

  const relatedSpecifics = useMemo(() => {
    if (!selectedBroad) return [] as Category[];
    return categoriesForNames(selectedBroad.specifics, categories as any);
  }, [selectedBroad, categories]);

  /** Less-suitable: sub-interests outside the most-suitable broad. */
  const lessSuitableOptions = useMemo(() => {
    if (!selectedBroad) return [] as Category[];
    const otherNames = BROAD_INTERESTS.filter((b) => b.id !== selectedBroad.id).flatMap(
      (b) => b.specifics,
    );
    const relatedSet = new Set(relatedIds);
    return categoriesForNames(otherNames, categories as any).filter((c) => !relatedSet.has(c.id));
  }, [selectedBroad, categories, relatedIds]);

  const relatedNames = useMemo(
    () =>
      relatedIds
        .map((id) => {
          const cat = categories.find((c) => c.id === id);
          return cat ? canonicalCategoryName(cat.name) : '';
        })
        .filter(Boolean),
    [relatedIds, categories],
  );

  const availableIcons = useMemo(
    () => iconsForEventSelection(broadId, relatedNames),
    [broadId, relatedNames],
  );

  const cityResults = useMemo(() => searchCities(cityQuery), [cityQuery]);

  useEffect(() => {
    if (!icon || !availableIcons.includes(icon)) {
      setIcon(availableIcons[0] || '');
    }
  }, [availableIcons, icon]);

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

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!cityBoxRef.current?.contains(e.target as Node)) setCityOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  const selectBroad = (id: string) => {
    setBroadId(id);
    setRelatedIds([]);
    setLessSuitableIds([]);
    setIcon('');
  };

  const toggleRelated = (id: string) => {
    setRelatedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= RELATED_MAX) return prev;
      return [...prev, id];
    });
    setLessSuitableIds((prev) => prev.filter((x) => x !== id));
  };

  const toggleLessSuitable = (id: string) => {
    setLessSuitableIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= LESS_MAX) return prev;
      return [...prev, id];
    });
  };

  const pickCity = (c: CityOption) => {
    setCity(c);
    setCityQuery(c.nameFa);
    setCityOpen(false);
  };

  const canNext =
    (step === 1 && !!broadId) ||
    (step === 2 && relatedIds.length >= 1) ||
    (step === 3 && !!title.trim() && !!description.trim()) ||
    (step === 4 && !!icon) ||
    (step === 5 &&
      !!date &&
      !!time &&
      !!city &&
      ticketPrice.trim() !== '' &&
      !Number.isNaN(Number(ticketPrice)) &&
      Number(ticketPrice) >= 0 &&
      !!approvedImageUrl &&
      !!eventType);

  const handleNext = () => {
    if (!canNext) {
      setError(
        step === 1
          ? fa.createEvent.needPrimary
          : step === 2
            ? fa.createEvent.needRelated
            : step === 3
              ? fa.createEvent.needDetails
              : step === 4
                ? fa.createEvent.needIcon
                : !approvedImageUrl
                  ? fa.createEvent.imageNeedApprove
                  : fa.createEvent.needSchedule,
      );
      return;
    }
    setError(null);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const resetImageChoice = () => {
    if (pendingPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingPreviewUrl(null);
    setPendingDataUrl(null);
    setPendingFile(null);
    setApprovedImageUrl(null);
    setImagePhase('choose');
    setImageBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onPickUploadFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(fa.createEvent.imageUploadFailed);
      return;
    }
    if (pendingPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(pendingPreviewUrl);
    const url = URL.createObjectURL(file);
    setPendingFile(file);
    setPendingDataUrl(null);
    setPendingPreviewUrl(url);
    setApprovedImageUrl(null);
    setImagePhase('preview');
    setError(null);
  };

  const handleGenerateImage = async () => {
    if (!generateEnabled) {
      setError(fa.createEvent.imageGenerateDisabled);
      return;
    }
    setError(null);
    setImageBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error(fa.createEvent.mustLoginError);
      }

      const interests = relatedIds
        .map((id) => categoryFa(categories.find((c) => c.id === id)?.name))
        .filter(Boolean);
      const when = [date, time].filter(Boolean).join(' ');
      const { data, error: fnError } = await supabase.functions.invoke(
        getLlmApi('image_generator').edgeFunction,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            title: title.trim(),
            description: description.trim(),
            city: city?.nameFa,
            category: selectedBroad?.label,
            interests,
            moodEmoji: icon,
            when: when || undefined,
          },
        },
      );
      if (fnError) {
        throw new Error(
          mapImageGenerateError(
            await readEdgeFunctionError(fnError, fa.createEvent.imageGenerateFailed),
          ),
        );
      }
      if (data?.error) throw new Error(mapImageGenerateError(String(data.error)));
      const dataUrl = data?.image_data_url as string | undefined;
      if (!dataUrl) throw new Error(fa.createEvent.imageGenerateFailed);

      if (pendingPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(pendingPreviewUrl);
      setPendingFile(null);
      setPendingDataUrl(dataUrl);
      setPendingPreviewUrl(dataUrl);
      setApprovedImageUrl(null);
      setImagePhase('preview');
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : fa.createEvent.imageGenerateFailed;
      setError(message || fa.createEvent.imageGenerateFailed);
    } finally {
      setImageBusy(false);
    }
  };

  const handleApproveImage = async () => {
    setError(null);
    setImageBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(fa.createEvent.mustLoginError);

      let url: string;
      if (pendingFile) {
        const ext = pendingFile.name.split('.').pop() || 'jpg';
        url = await uploadEventImage(user.id, pendingFile, ext);
      } else if (pendingDataUrl) {
        url = await uploadEventImageFromDataUrl(user.id, pendingDataUrl);
      } else {
        throw new Error(fa.createEvent.imageNeedApprove);
      }

      if (pendingPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(pendingPreviewUrl);
      setApprovedImageUrl(url);
      setPendingPreviewUrl(url);
      setPendingFile(null);
      setPendingDataUrl(null);
      setImagePhase('approved');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || fa.createEvent.imageUploadFailed);
    } finally {
      setImageBusy(false);
    }
  };

  const handleDenyImage = () => {
    resetImageChoice();
  };

  const handlePublish = async () => {
    if (!canNext || !city || !approvedImageUrl) {
      setError(
        !approvedImageUrl ? fa.createEvent.imageNeedApprove : fa.createEvent.needSchedule,
      );
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

      const status =
        VOTING_ENABLED && eventType === 'voting' ? 'voting' : 'active';

      const primaryCategoryId =
        pickPrimaryInterestId(relatedIds, title.trim(), categories, categoryFa) ||
        relatedIds[0];

      const { data, error: insertError } = await supabase
        .from('events')
        .insert({
          host_id: user.id,
          title: title.trim(),
          pitch: description.trim(),
          description: description.trim(),
          category_id: primaryCategoryId,
          location: city.nameFa,
          datetime: new Date(`${date}T${time || DEFAULT_TIME}`).toISOString(),
          most_suitable_interest_ids: relatedIds,
          less_suitable_interest_ids: lessSuitableIds.length ? lessSuitableIds : null,
          most_suitable_broad_ids: broadId ? [broadId] : null,
          targeted_interest_ids: relatedIds,
          gender_restriction: 'everyone',
          icon,
          ticket_price: Number(ticketPrice),
          image_url: approvedImageUrl,
          status,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (data?.id) {
        // Trigger also runs compute + notifications on active status; call again for voting drafts.
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
  const lessLabels = lessSuitableIds
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

        {/* 1 — Most suitable broad */}
        {step === 1 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-foreground">
                {fa.createEvent.chooseMostSuitable}
              </h2>
              <p className="mt-1 text-sm text-muted">{fa.createEvent.mostSuitableHint}</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
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
        )}

        {/* 2 — Most suitable leaves + optional less suitable */}
        {step === 2 && selectedBroad && (
          <section className="space-y-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black text-foreground">
                    {fa.createEvent.chooseMostSuitableLeaves}
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
                <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
                  {fa.createEvent.noRelated}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {relatedSpecifics.map((cat) => {
                    const selected = relatedIds.includes(cat.id);
                    const atLimit = relatedIds.length >= RELATED_MAX && !selected;
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
            </div>

            <div className="space-y-4 border-t border-border pt-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black text-foreground">
                    {fa.createEvent.chooseLessSuitable}
                  </h2>
                  <p className="mt-1 text-sm text-muted">{fa.createEvent.lessSuitableHint}</p>
                </div>
                <span className="rounded-full bg-background px-3 py-1 text-xs font-bold text-muted">
                  {fa.createEvent.lessSuitableSelected.replace(
                    '{count}',
                    lessSuitableIds.length.toLocaleString('fa-IR'),
                  )}
                </span>
              </div>
              {lessSuitableOptions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
                  {fa.createEvent.noLessSuitable}
                </p>
              ) : (
                <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                  {lessSuitableOptions.map((cat) => {
                    const selected = lessSuitableIds.includes(cat.id);
                    const atLimit = lessSuitableIds.length >= LESS_MAX && !selected;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleLessSuitable(cat.id)}
                        disabled={atLimit}
                        className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                          selected
                            ? 'border-2 border-primary bg-primary-light text-primary'
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
            </div>
          </section>
        )}

        {/* 3 — Title & description */}
        {step === 3 && (
          <section className="space-y-6">
            <div>
              <h2 className="mb-4 text-lg font-black text-foreground">
                {fa.createEvent.detailsHeading}
              </h2>
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
          </section>
        )}

        {/* 4 — Related icons */}
        {step === 4 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-foreground">{fa.createEvent.iconLabel}</h2>
              <p className="mt-1 text-sm text-muted">{fa.createEvent.iconHint}</p>
            </div>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
              {availableIcons.map((emoji) => {
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
          </section>
        )}

        {/* 5 — Jalali date + city + publish type */}
        {step === 5 && (
          <section className="space-y-6">
            <JalaliEventDatePicker value={date} onChange={setDate} />

            <div>
              <label className="mb-2 block text-sm font-bold">{fa.createEvent.timeLabel}</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div ref={cityBoxRef} className="relative">
              <label className="mb-2 block text-sm font-bold">{fa.createEvent.cityLabel}</label>
              <p className="mb-2 text-sm text-muted">{fa.createEvent.cityHint}</p>
              <div className="relative">
                <MapPin className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={cityQuery}
                  onChange={(e) => {
                    setCityQuery(e.target.value);
                    setCity(null);
                    setCityOpen(true);
                  }}
                  onFocus={() => setCityOpen(true)}
                  placeholder={fa.createEvent.cityPlaceholder}
                  className="w-full rounded-xl border border-border bg-background py-3 pe-4 ps-10 focus:outline-none focus:ring-2 focus:ring-primary"
                  autoComplete="off"
                />
              </div>
              {cityOpen && (
                <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-border bg-white py-1 shadow-lg">
                  {cityResults.length === 0 ? (
                    <li className="px-4 py-3 text-sm text-muted">{fa.createEvent.cityEmpty}</li>
                  ) : (
                    cityResults.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => pickCity(c)}
                          className={`flex w-full items-center gap-2 px-4 py-2.5 text-start text-sm font-bold hover:bg-primary-light ${
                            city?.id === c.id ? 'bg-primary-light text-primary' : 'text-foreground'
                          }`}
                        >
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {c.nameFa}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
              {city && (
                <p className="mt-2 text-xs font-bold text-primary">
                  {fa.createEvent.citySelected.replace('{city}', city.nameFa)}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">{fa.createEvent.ticketPriceLabel}</label>
              <p className="mb-2 text-sm text-muted">{fa.createEvent.ticketPriceHint}</p>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  placeholder={fa.createEvent.ticketPricePlaceholder}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 pe-16 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">
                  {fa.createEvent.ticketCurrency}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">{fa.createEvent.imageSectionLabel}</h3>
                <p className="mt-1 text-sm text-muted">{fa.createEvent.imageSectionHint}</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickUploadFile(e.target.files?.[0] ?? null)}
              />

              {imagePhase === 'choose' && (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background px-4 py-6 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-light/40"
                    >
                      <Upload className="h-4 w-4" />
                      {fa.createEvent.imageUpload}
                    </button>
                    <button
                      type="button"
                      disabled={imageBusy || !generateEnabled}
                      title={!generateEnabled ? fa.createEvent.imageGenerateDisabled : undefined}
                      onClick={handleGenerateImage}
                      className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background px-4 py-6 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-light/40 disabled:opacity-40"
                    >
                      {imageBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Sparkles className="h-4 w-4" aria-hidden />
                      )}
                      {imageBusy ? fa.createEvent.imageGenerating : fa.createEvent.imageGenerate}
                    </button>
                  </div>
                  {!generateEnabled && (
                    <p className="text-xs text-muted">{fa.createEvent.imageGenerateDisabled}</p>
                  )}
                </div>
              )}

              {(imagePhase === 'preview' || imagePhase === 'approved') && pendingPreviewUrl && (
                <div className="overflow-hidden rounded-2xl border border-border bg-background">
                  <div className="relative aspect-[4/3] bg-primary-light">
                    <img
                      src={pendingPreviewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    {imagePhase === 'approved' && (
                      <span className="absolute start-3 top-3 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                        {fa.createEvent.imageApproved}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 p-3">
                    {imagePhase === 'preview' ? (
                      <>
                        <button
                          type="button"
                          disabled={imageBusy}
                          onClick={handleApproveImage}
                          className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-40"
                        >
                          {imageBusy ? fa.createEvent.imageUploading : fa.createEvent.imageApprove}
                        </button>
                        <button
                          type="button"
                          disabled={imageBusy}
                          onClick={handleDenyImage}
                          className="flex-1 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-foreground hover:bg-background disabled:opacity-40"
                        >
                          {fa.createEvent.imageDeny}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={resetImageChoice}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-foreground hover:bg-background"
                      >
                        <ImagePlus className="h-4 w-4" />
                        {fa.createEvent.imageChange}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {VOTING_ENABLED && (
              <div>
                <h3 className="mb-2 text-sm font-bold text-foreground">{fa.createEvent.chooseType}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <TypeChip
                    selected={eventType === 'publish'}
                    title={fa.createEvent.typePublish}
                    onSelect={() => setEventType('publish')}
                  />
                  <TypeChip
                    selected={eventType === 'voting'}
                    title={fa.createEvent.typeVoting}
                    onSelect={() => setEventType('voting')}
                  />
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-background/60 p-4 text-sm">
              <p className="font-bold text-foreground">
                {icon} {title || fa.createEvent.titleLabel}
              </p>
              <p className="mt-1 text-muted line-clamp-2">{description}</p>
              <p className="mt-2 text-xs font-semibold text-primary">
                {selectedBroad?.emoji} {selectedBroad?.label}
                {relatedLabels.length > 0 ? ` · ${relatedLabels.join('، ')}` : ''}
                {lessLabels.length > 0
                  ? ` · ${fa.createEvent.chooseLessSuitable}: ${lessLabels.join('، ')}`
                  : ''}
                {city ? ` · ${city.nameFa}` : ''}
                {ticketPrice.trim() !== ''
                  ? ` · ${
                      Number(ticketPrice) === 0
                        ? fa.createEvent.ticketFree
                        : `${Number(ticketPrice).toLocaleString('fa-IR')} ${fa.createEvent.ticketCurrency}`
                    }`
                  : ''}
              </p>
            </div>
          </section>
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
                : VOTING_ENABLED && eventType === 'voting'
                  ? fa.createEvent.submitVoting
                  : fa.createEvent.publishEvent}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TypeChip({
  selected,
  title,
  onSelect,
}: {
  selected: boolean;
  title: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border-2 px-4 py-3 text-sm font-black transition ${
        selected
          ? 'border-primary bg-primary-light/50 text-primary'
          : 'border-border bg-white text-foreground hover:border-primary'
      }`}
    >
      {title}
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
