import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Check,
  ImagePlus,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { JalaliEventDatePicker } from '../components/JalaliEventDatePicker';
import { canAccessAdmin, ensureAdministratorRank } from '../lib/admin';
import {
  BROAD_INTERESTS,
  categoriesForNames,
  canonicalCategoryName,
  categoryIdsToBroadIds,
  type BroadInterest,
} from '../lib/broadInterests';
import { EVENT_CITIES, searchCities, type CityOption } from '../lib/cities';
import { uploadEventImage, uploadEventImageFromDataUrl } from '../lib/eventImages';
import { EVENT_ICONS, iconsForEventSelection } from '../lib/eventIcons';
import { VOTING_ENABLED } from '../lib/features';
import { getLlmApi, isLlmApiEnabled, readEdgeFunctionError } from '../lib/llmApis';
import { supabase } from '../lib/supabase';
import { fa } from '../locale/fa';
import { categoryFa } from '../locale/categoriesFa';

type Category = { id: string; name: string; emoji?: string; group_name?: string };

type AdminEvent = {
  id: string;
  title: string;
  description?: string | null;
  pitch?: string | null;
  location: string;
  datetime?: string | null;
  max_attendees: number | null;
  gender_restriction?: string | null;
  status?: string | null;
  ticket_price?: number | null;
  icon?: string | null;
  image_url?: string | null;
  category: { id: string; name: string } | null;
  targeted_interest_ids: string[] | null;
  most_suitable_interest_ids?: string[] | null;
  less_suitable_interest_ids?: string[] | null;
  most_suitable_broad_ids?: string[] | null;
  rsvps: { count: number }[] | null;
};

type Tab = 'available' | 'voting';
type ImagePhase = 'choose' | 'preview' | 'approved';

type EditForm = {
  title: string;
  description: string;
  date: string;
  time: string;
  max_attendees: string;
  gender_restriction: string;
  status: string;
  ticket_price: string;
  icon: string;
  broadId: string;
  relatedIds: string[];
  lessSuitableIds: string[];
  imageUrl: string | null;
};

const RELATED_MAX = 3;
const LESS_MAX = 3;
const DEFAULT_TIME = '18:00';
const generateEnabled = isLlmApiEnabled('image_generator');

function genderLabel(restriction?: string | null) {
  if (!restriction || restriction === 'everyone') return fa.adminEvents.genderEveryone;
  if (restriction === 'male_only') return fa.adminEvents.genderMen;
  if (restriction === 'female_only') return fa.adminEvents.genderWomen;
  return restriction;
}

function formatPrice(price?: number | null) {
  if (price == null) return fa.adminEvents.priceUnset;
  if (price === 0) return fa.adminEvents.free;
  return `${price.toLocaleString('fa-IR')} ${fa.adminEvents.currency}`;
}

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

function resolveCity(location: string): { city: CityOption | null; query: string } {
  const trimmed = (location || '').trim();
  const match =
    EVENT_CITIES.find((c) => c.nameFa === trimmed) ||
    searchCities(trimmed).find((c) => c.nameFa === trimmed) ||
    null;
  return { city: match, query: trimmed };
}

function toEditForm(event: AdminEvent, categories: Category[]): EditForm {
  const dt = event.datetime ? new Date(event.datetime) : null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const relatedIds = [
    ...(event.most_suitable_interest_ids || event.targeted_interest_ids || []),
  ].slice(0, RELATED_MAX);
  const lessSuitableIds = (event.less_suitable_interest_ids || [])
    .filter((id) => !relatedIds.includes(id))
    .slice(0, LESS_MAX);
  const storedBroad = event.most_suitable_broad_ids?.[0] || '';
  const derivedBroad = categoryIdsToBroadIds(relatedIds, categories)[0] || '';
  return {
    title: event.title || '',
    description: event.description || event.pitch || '',
    date: dt ? `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}` : '',
    time: dt ? `${pad(dt.getHours())}:${pad(dt.getMinutes())}` : DEFAULT_TIME,
    max_attendees: event.max_attendees != null ? String(event.max_attendees) : '',
    gender_restriction: event.gender_restriction || 'everyone',
    status:
      event.status === 'active' ||
      event.status === 'completed' ||
      event.status === 'cancelled' ||
      event.status === 'voting'
        ? event.status
        : 'active',
    ticket_price: event.ticket_price != null ? String(event.ticket_price) : '',
    icon: event.icon || EVENT_ICONS[0],
    broadId: storedBroad || derivedBroad,
    relatedIds,
    lessSuitableIds,
    imageUrl: event.image_url || null,
  };
}

export function AdminEvents() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(VOTING_ENABLED ? 'voting' : 'available');
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState<AdminEvent[]>([]);
  const [voting, setVoting] = useState<AdminEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesById, setCategoriesById] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<AdminEvent | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [city, setCity] = useState<CityOption | null>(null);
  const [cityQuery, setCityQuery] = useState('');
  const [cityOpen, setCityOpen] = useState(false);
  const [imagePhase, setImagePhase] = useState<ImagePhase>('choose');
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [pendingDataUrl, setPendingDataUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const cityBoxRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedBroad = useMemo(
    () => BROAD_INTERESTS.find((b) => b.id === form?.broadId) ?? null,
    [form?.broadId],
  );

  const relatedSpecifics = useMemo(() => {
    if (!selectedBroad) return [] as Category[];
    return categoriesForNames(selectedBroad.specifics, categories as any);
  }, [selectedBroad, categories]);

  const lessSuitableOptions = useMemo(() => {
    if (!selectedBroad || !form) return [] as Category[];
    const otherNames = BROAD_INTERESTS.filter((b) => b.id !== selectedBroad.id).flatMap(
      (b) => b.specifics,
    );
    const relatedSet = new Set(form.relatedIds);
    return categoriesForNames(otherNames, categories as any).filter((c) => !relatedSet.has(c.id));
  }, [selectedBroad, categories, form]);

  const relatedNames = useMemo(() => {
    if (!form) return [] as string[];
    return form.relatedIds
      .map((id) => {
        const cat = categories.find((c) => c.id === id);
        return cat ? canonicalCategoryName(cat.name) : '';
      })
      .filter(Boolean);
  }, [form, categories]);

  const availableIcons = useMemo(() => {
    const base = iconsForEventSelection(form?.broadId, relatedNames);
    if (form?.icon && !base.includes(form.icon)) return [form.icon, ...base];
    return base;
  }, [form?.broadId, form?.icon, relatedNames]);

  const cityResults = useMemo(() => searchCities(cityQuery), [cityQuery]);

  const loadEvents = useCallback(async () => {
    const { data: events, error: fetchError } = await supabase
      .from('events')
      .select(`
        id, title, description, pitch, location, datetime, max_attendees, gender_restriction, status,
        ticket_price, icon, image_url, targeted_interest_ids, most_suitable_interest_ids, less_suitable_interest_ids,
        most_suitable_broad_ids,
        category:interest_categories(id, name),
        rsvps:event_rsvps(count)
      `)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error(fetchError);
      setError(fetchError.message);
      return;
    }

    const rows = (events || []) as unknown as AdminEvent[];
    setVoting(rows.filter((e) => !e.status || e.status === 'voting'));
    setAvailable(rows.filter((e) => e.status === 'active' || e.status === 'completed'));
  }, []);

  useEffect(() => {
    async function boot() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
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
      if (cats) {
        const list = cats as Category[];
        setCategories(list);
        const map: Record<string, string> = {};
        list.forEach((c) => {
          map[c.id] = categoryFa(c.name);
        });
        setCategoriesById(map);
      }

      await loadEvents();
      setLoading(false);
    }

    boot();
  }, [navigate, loadEvents]);

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

  useEffect(() => {
    if (!form) return;
    if (form.icon && availableIcons.includes(form.icon)) return;
    if (availableIcons[0]) {
      setForm((prev) => (prev ? { ...prev, icon: availableIcons[0] } : prev));
    }
  }, [availableIcons, form?.icon]);

  const categoryCell = (event: AdminEvent) => {
    const names: string[] = [];
    if (event.category?.name) names.push(categoryFa(event.category.name));
    const mostIds = event.most_suitable_interest_ids || event.targeted_interest_ids || [];
    mostIds.forEach((id) => {
      const label = categoriesById[id];
      if (label && !names.includes(label)) names.push(label);
    });
    const lessNames = (event.less_suitable_interest_ids || [])
      .map((id) => categoriesById[id])
      .filter((label): label is string => !!label && !names.includes(label));
    if (lessNames.length) {
      return `${names.join('، ') || fa.events.uncategorized} · ${fa.adminEvents.lessSuitableShort}: ${lessNames.join('، ')}`;
    }
    return names.length > 0 ? names.join('، ') : fa.events.uncategorized;
  };

  const attendeeCount = (event: AdminEvent) => {
    const count = Array.isArray(event.rsvps) && event.rsvps[0] ? event.rsvps[0].count : 0;
    return `${count} / ${event.max_attendees ?? '∞'}`;
  };

  const resetImageUi = () => {
    if (pendingPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingPreviewUrl(null);
    setPendingDataUrl(null);
    setPendingFile(null);
    setImageBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openEdit = (event: AdminEvent) => {
    setError(null);
    setMessage(null);
    setEditError(null);
    resetImageUi();
    const next = toEditForm(event, categories);
    setEditing(event);
    setForm(next);
    const resolved = resolveCity(event.location || '');
    setCity(resolved.city);
    setCityQuery(resolved.query);
    setCityOpen(false);
    if (next.imageUrl) {
      setPendingPreviewUrl(next.imageUrl);
      setImagePhase('approved');
    } else {
      setImagePhase('choose');
    }
  };

  const closeEdit = () => {
    resetImageUi();
    setEditing(null);
    setForm(null);
    setCity(null);
    setCityQuery('');
    setCityOpen(false);
    setImagePhase('choose');
    setSaving(false);
    setEditError(null);
  };

  const selectBroad = (id: string) => {
    if (!form) return;
    setForm({
      ...form,
      broadId: id,
      relatedIds: [],
      lessSuitableIds: [],
      icon: '',
    });
  };

  const toggleRelated = (id: string) => {
    if (!form) return;
    setForm((prev) => {
      if (!prev) return prev;
      const has = prev.relatedIds.includes(id);
      const relatedIds = has
        ? prev.relatedIds.filter((x) => x !== id)
        : prev.relatedIds.length >= RELATED_MAX
          ? prev.relatedIds
          : [...prev.relatedIds, id];
      return {
        ...prev,
        relatedIds,
        lessSuitableIds: prev.lessSuitableIds.filter((x) => x !== id),
      };
    });
  };

  const toggleLessSuitable = (id: string) => {
    if (!form) return;
    setForm((prev) => {
      if (!prev) return prev;
      const has = prev.lessSuitableIds.includes(id);
      const lessSuitableIds = has
        ? prev.lessSuitableIds.filter((x) => x !== id)
        : prev.lessSuitableIds.length >= LESS_MAX
          ? prev.lessSuitableIds
          : [...prev.lessSuitableIds, id];
      return { ...prev, lessSuitableIds };
    });
  };

  const pickCity = (c: CityOption) => {
    setCity(c);
    setCityQuery(c.nameFa);
    setCityOpen(false);
  };

  const resetImageChoice = () => {
    resetImageUi();
    setForm((prev) => (prev ? { ...prev, imageUrl: null } : prev));
    setImagePhase('choose');
  };

  const onPickUploadFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setEditError(fa.createEvent.imageUploadFailed);
      return;
    }
    if (pendingPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(pendingPreviewUrl);
    const url = URL.createObjectURL(file);
    setPendingFile(file);
    setPendingDataUrl(null);
    setPendingPreviewUrl(url);
    setForm((prev) => (prev ? { ...prev, imageUrl: null } : prev));
    setImagePhase('preview');
    setEditError(null);
  };

  const handleGenerateImage = async () => {
    if (!form) return;
    if (!generateEnabled) {
      setEditError(fa.createEvent.imageGenerateDisabled);
      return;
    }
    setEditError(null);
    setImageBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error(fa.createEvent.mustLoginError);
      }

      const interests = form.relatedIds
        .map((id) => categoryFa(categories.find((c) => c.id === id)?.name))
        .filter(Boolean);
      const when = [form.date, form.time].filter(Boolean).join(' ');
      const { data, error: fnError } = await supabase.functions.invoke(
        getLlmApi('image_generator').edgeFunction,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            title: form.title.trim(),
            description: form.description.trim(),
            city: city?.nameFa || cityQuery.trim() || undefined,
            category: selectedBroad?.label,
            interests,
            moodEmoji: form.icon,
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
      setForm((prev) => (prev ? { ...prev, imageUrl: null } : prev));
      setImagePhase('preview');
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : fa.createEvent.imageGenerateFailed;
      setEditError(message || fa.createEvent.imageGenerateFailed);
    } finally {
      setImageBusy(false);
    }
  };

  const handleApproveImage = async () => {
    setEditError(null);
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
      setForm((prev) => (prev ? { ...prev, imageUrl: url } : prev));
      setPendingPreviewUrl(url);
      setPendingFile(null);
      setPendingDataUrl(null);
      setImagePhase('approved');
    } catch (err: any) {
      console.error(err);
      setEditError(err?.message || fa.createEvent.imageUploadFailed);
    } finally {
      setImageBusy(false);
    }
  };

  const handleSave = async () => {
    if (!editing || !form) return;

    if (imagePhase === 'preview') {
      setEditError(fa.createEvent.imageNeedApprove);
      return;
    }
    if (!form.relatedIds.length) {
      setEditError(fa.createEvent.needRelated);
      return;
    }

    setSaving(true);
    setEditError(null);
    setError(null);
    setMessage(null);

    const location = (city?.nameFa || cityQuery.trim() || editing.location || '').trim();
    const datetime =
      form.date && form.time
        ? new Date(`${form.date}T${form.time}`).toISOString()
        : editing.datetime;

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim(),
      pitch: form.description.trim(),
      location,
      datetime,
      max_attendees: form.max_attendees ? Number(form.max_attendees) : null,
      gender_restriction: form.gender_restriction,
      status: form.status,
      ticket_price: form.ticket_price === '' ? null : Number(form.ticket_price),
      icon: form.icon,
      image_url: form.imageUrl,
      category_id: form.relatedIds[0],
      most_suitable_interest_ids: form.relatedIds,
      targeted_interest_ids: form.relatedIds,
      less_suitable_interest_ids: form.lessSuitableIds.length ? form.lessSuitableIds : null,
      most_suitable_broad_ids: form.broadId ? [form.broadId] : null,
    };

    const prevStatus = editing.status;
    const { error: updateError } = await supabase
      .from('events')
      .update(payload)
      .eq('id', editing.id);

    setSaving(false);
    if (updateError) {
      console.error(updateError);
      setEditError(fa.adminEvents.saveFailed);
      return;
    }

    if (form.status === 'active' && prevStatus !== 'active') {
      await supabase.rpc('compute_event_matches', { new_event_id: editing.id });
    }

    setMessage(fa.adminEvents.saved);
    closeEdit();
    await loadEvents();
  };

  const handleDelete = async (event: AdminEvent) => {
    if (!window.confirm(fa.adminEvents.confirmDelete)) return;
    setDeletingId(event.id);
    setError(null);
    setMessage(null);

    const { error: deleteError } = await supabase.from('events').delete().eq('id', event.id);
    setDeletingId(null);

    if (deleteError) {
      console.error(deleteError);
      setError(fa.adminEvents.deleteFailed);
      return;
    }

    setMessage(fa.adminEvents.deleted);
    if (editing?.id === event.id) closeEdit();
    await loadEvents();
  };

  const rows = tab === 'available' ? available : voting;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">{fa.adminEvents.title}</h1>
          <p className="text-gray-500 mt-1">{fa.adminEvents.subtitle}</p>
        </div>
        <Link
          to="/create-event"
          className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-full font-bold transition-colors text-sm"
        >
          <Plus className="h-4 w-4" />
          {fa.adminEvents.createNew}
        </Link>
      </div>

      {(message || error) && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm font-bold ${
            error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => setTab('available')}
          className={`px-5 py-3 text-sm font-bold border-b-4 transition-colors ${
            tab === 'available'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {fa.adminEvents.tabAvailable} ({available.length})
        </button>
        {VOTING_ENABLED && (
          <button
            type="button"
            onClick={() => setTab('voting')}
            className={`px-5 py-3 text-sm font-bold border-b-4 transition-colors ${
              tab === 'voting'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {fa.adminEvents.tabVoting} ({voting.length})
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500 font-medium">{fa.adminEvents.loading}</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-gray-500 font-medium">
            {tab === 'available' ? fa.adminEvents.emptyAvailable : fa.adminEvents.emptyVoting}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">{fa.adminEvents.colName}</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">{fa.adminEvents.colCategories}</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">{fa.adminEvents.colLocation}</th>
                  {tab === 'available' ? (
                    <th className="px-4 py-3 font-bold whitespace-nowrap">
                      {fa.adminEvents.colAttendeesCapacity}
                    </th>
                  ) : (
                    <th className="px-4 py-3 font-bold whitespace-nowrap">{fa.adminEvents.colCapacity}</th>
                  )}
                  <th className="px-4 py-3 font-bold whitespace-nowrap">{fa.adminEvents.colDetails}</th>
                  {tab === 'available' && (
                    <th className="px-4 py-3 font-bold whitespace-nowrap">
                      {fa.adminEvents.colTicketPrice}
                    </th>
                  )}
                  <th className="px-4 py-3 font-bold whitespace-nowrap">{fa.adminEvents.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900 max-w-[220px]">
                      <span className="me-1">{event.icon || ''}</span>
                      <Link to={`/event/${event.id}`} className="hover:text-primary transition-colors">
                        {event.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[260px]">{categoryCell(event)}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{event.location || '—'}</td>
                    {tab === 'available' ? (
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{attendeeCount(event)}</td>
                    ) : (
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {event.max_attendees ?? '∞'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                        {genderLabel(event.gender_restriction)}
                      </span>
                    </td>
                    {tab === 'available' && (
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {formatPrice(event.ticket_price)}
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(event)}
                          className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {fa.adminEvents.edit}
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === event.id}
                          onClick={() => handleDelete(event)}
                          className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {fa.adminEvents.remove}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && form && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
              <h2 className="text-lg font-black text-gray-900">{fa.adminEvents.editTitle}</h2>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label={fa.adminEvents.cancelEdit}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-5 py-5">
              {editError && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {editError}
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-gray-700">{fa.createEvent.titleLabel}</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-gray-700">
                  {fa.createEvent.descriptionLabel}
                </span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>

              <div className="space-y-3">
                <div>
                  <span className="block text-sm font-bold text-gray-700">
                    {fa.adminEvents.editMostSuitable}
                  </span>
                  <p className="mt-1 text-xs text-gray-500">{fa.createEvent.mostSuitableHint}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {BROAD_INTERESTS.map((opt) => (
                    <BroadCard
                      key={opt.id}
                      opt={opt}
                      selected={form.broadId === opt.id}
                      onToggle={() => selectBroad(opt.id)}
                    />
                  ))}
                </div>
              </div>

              {selectedBroad && (
                <>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <span className="block text-sm font-bold text-gray-700">
                          {fa.adminEvents.editRelatedInterests}
                        </span>
                        <p className="mt-1 text-xs text-gray-500">
                          {fa.createEvent.relatedHint.replace('{broad}', selectedBroad.label)}
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                        {fa.createEvent.relatedSelected.replace(
                          '{count}',
                          form.relatedIds.length.toLocaleString('fa-IR'),
                        )}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {relatedSpecifics.map((cat) => {
                        const selected = form.relatedIds.includes(cat.id);
                        const atLimit = form.relatedIds.length >= RELATED_MAX && !selected;
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
                                  ? 'border border-gray-200 bg-gray-50 text-gray-400 opacity-50'
                                  : 'border border-gray-200 bg-gray-50 text-gray-800 hover:border-primary'
                            }`}
                          >
                            {cat.emoji ? `${cat.emoji} ` : ''}
                            {categoryFa(cat.name)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <span className="block text-sm font-bold text-gray-700">
                          {fa.createEvent.chooseLessSuitable}
                        </span>
                        <p className="mt-1 text-xs text-gray-500">{fa.createEvent.lessSuitableHint}</p>
                      </div>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">
                        {fa.createEvent.lessSuitableSelected.replace(
                          '{count}',
                          form.lessSuitableIds.length.toLocaleString('fa-IR'),
                        )}
                      </span>
                    </div>
                    <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                      {lessSuitableOptions.map((cat) => {
                        const selected = form.lessSuitableIds.includes(cat.id);
                        const atLimit = form.lessSuitableIds.length >= LESS_MAX && !selected;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleLessSuitable(cat.id)}
                            disabled={atLimit}
                            className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                              selected
                                ? 'border-2 border-primary bg-primary/10 text-primary'
                                : atLimit
                                  ? 'border border-gray-200 bg-gray-50 text-gray-400 opacity-50'
                                  : 'border border-gray-200 bg-gray-50 text-gray-800 hover:border-primary'
                            }`}
                          >
                            {cat.emoji ? `${cat.emoji} ` : ''}
                            {categoryFa(cat.name)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <div>
                <span className="mb-1.5 block text-sm font-bold text-gray-700">{fa.createEvent.iconLabel}</span>
                <p className="mb-2 text-xs text-gray-500">{fa.createEvent.iconHint}</p>
                <div className="flex flex-wrap gap-2">
                  {availableIcons.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setForm({ ...form, icon: ic })}
                      className={`h-10 w-10 rounded-xl text-lg transition ${
                        form.icon === ic
                          ? 'bg-primary/15 ring-2 ring-primary'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <JalaliEventDatePicker value={form.date} onChange={(date) => setForm({ ...form, date })} />

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-gray-700">{fa.createEvent.timeLabel}</span>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>

              <div ref={cityBoxRef} className="relative">
                <span className="mb-1.5 block text-sm font-bold text-gray-700">{fa.createEvent.cityLabel}</span>
                <p className="mb-2 text-xs text-gray-500">{fa.createEvent.cityHint}</p>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
                    className="w-full rounded-xl border border-gray-200 py-2.5 pe-3 ps-10 text-sm outline-none focus:border-primary"
                    autoComplete="off"
                  />
                </div>
                {cityOpen && (
                  <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                    {cityResults.length === 0 ? (
                      <li className="px-4 py-3 text-sm text-gray-500">{fa.createEvent.cityEmpty}</li>
                    ) : (
                      cityResults.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => pickCity(c)}
                            className={`flex w-full items-center gap-2 px-4 py-2.5 text-start text-sm font-bold hover:bg-primary/10 ${
                              city?.id === c.id ? 'bg-primary/10 text-primary' : 'text-gray-800'
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

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-gray-700">
                    {fa.adminEvents.colCapacity}
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={form.max_attendees}
                    onChange={(e) => setForm({ ...form, max_attendees: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-gray-700">
                    {fa.createEvent.ticketPriceLabel}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={form.ticket_price}
                    onChange={(e) => setForm({ ...form, ticket_price: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-gray-700">
                    {fa.adminEvents.statusLabel}
                  </span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    <option value="active">{fa.adminEvents.statusActive}</option>
                    {VOTING_ENABLED && (
                      <option value="voting">{fa.adminEvents.statusVoting}</option>
                    )}
                    <option value="completed">{fa.adminEvents.statusCompleted}</option>
                    <option value="cancelled">{fa.adminEvents.statusCancelled}</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-gray-700">
                    {fa.createEvent.genderRestriction}
                  </span>
                  <select
                    value={form.gender_restriction}
                    onChange={(e) => setForm({ ...form, gender_restriction: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    <option value="everyone">{fa.adminEvents.genderEveryone}</option>
                    <option value="male_only">{fa.adminEvents.genderMen}</option>
                    <option value="female_only">{fa.adminEvents.genderWomen}</option>
                  </select>
                </label>
              </div>

              <div className="space-y-3 border-t border-gray-100 pt-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{fa.createEvent.imageSectionLabel}</h3>
                  <p className="mt-1 text-xs text-gray-500">{fa.createEvent.imageSectionHint}</p>
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
                        className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm font-bold text-gray-800 transition hover:border-primary hover:bg-primary/5"
                      >
                        <Upload className="h-4 w-4" />
                        {fa.createEvent.imageUpload}
                      </button>
                      <button
                        type="button"
                        disabled={imageBusy || !generateEnabled}
                        title={!generateEnabled ? fa.createEvent.imageGenerateDisabled : undefined}
                        onClick={handleGenerateImage}
                        className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm font-bold text-gray-800 transition hover:border-primary hover:bg-primary/5 disabled:opacity-40"
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
                      <p className="text-xs text-gray-500">{fa.createEvent.imageGenerateDisabled}</p>
                    )}
                  </div>
                )}

                {(imagePhase === 'preview' || imagePhase === 'approved') && pendingPreviewUrl && (
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                    <div className="relative aspect-[4/3] bg-primary/10">
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
                            onClick={resetImageChoice}
                            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-40"
                          >
                            {fa.createEvent.imageDeny}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={resetImageChoice}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50"
                        >
                          <ImagePlus className="h-4 w-4" />
                          {fa.createEvent.imageChange}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 flex gap-2 border-t border-gray-100 bg-white px-5 py-4">
              <button
                type="button"
                disabled={saving || imageBusy || !form.title.trim()}
                onClick={handleSave}
                className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-50"
              >
                {saving ? fa.adminEvents.saving : fa.adminEvents.saveEdit}
              </button>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-full border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                {fa.adminEvents.cancelEdit}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
      className={`relative flex min-h-[5.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-2.5 text-center transition active:scale-[0.97] ${
        selected
          ? `border-transparent bg-gradient-to-br ${opt.gradient} text-white shadow-lg`
          : 'border-gray-200 bg-white text-gray-800 hover:border-primary hover:shadow-md'
      }`}
    >
      {selected && (
        <span className="absolute -top-2 -start-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-primary shadow">
          <Check className="h-3 w-3" strokeWidth={3.5} />
        </span>
      )}
      <span className="text-2xl">{opt.emoji}</span>
      <span className="text-[11px] font-black leading-snug">{opt.label}</span>
    </button>
  );
}
