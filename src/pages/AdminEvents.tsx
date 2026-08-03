import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { canAccessAdmin, ensureAdministratorRank } from '../lib/admin';
import { EVENT_ICONS } from '../lib/eventIcons';
import { supabase } from '../lib/supabase';
import { fa } from '../locale/fa';
import { categoryFa } from '../locale/categoriesFa';

type Category = { id: string; name: string };

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
  category: { id: string; name: string } | null;
  targeted_interest_ids: string[] | null;
  rsvps: { count: number }[] | null;
};

type Tab = 'available' | 'voting';

type EditForm = {
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  max_attendees: string;
  gender_restriction: string;
  status: string;
  ticket_price: string;
  icon: string;
};

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

function toEditForm(event: AdminEvent): EditForm {
  const dt = event.datetime ? new Date(event.datetime) : null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    title: event.title || '',
    description: event.description || event.pitch || '',
    location: event.location || '',
    date: dt ? `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}` : '',
    time: dt ? `${pad(dt.getHours())}:${pad(dt.getMinutes())}` : '',
    max_attendees: event.max_attendees != null ? String(event.max_attendees) : '',
    gender_restriction: event.gender_restriction || 'everyone',
    status: event.status || 'voting',
    ticket_price: event.ticket_price != null ? String(event.ticket_price) : '',
    icon: event.icon || EVENT_ICONS[0],
  };
}

export function AdminEvents() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('voting');
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState<AdminEvent[]>([]);
  const [voting, setVoting] = useState<AdminEvent[]>([]);
  const [categoriesById, setCategoriesById] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<AdminEvent | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    const { data: events, error: fetchError } = await supabase
      .from('events')
      .select(`
        id, title, description, pitch, location, datetime, max_attendees, gender_restriction, status,
        ticket_price, icon, targeted_interest_ids,
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
    setAvailable(rows.filter((e) => e.status && e.status !== 'voting'));
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

      const { data: cats } = await supabase.from('interest_categories').select('id, name');
      if (cats) {
        const map: Record<string, string> = {};
        (cats as Category[]).forEach((c) => {
          map[c.id] = categoryFa(c.name);
        });
        setCategoriesById(map);
      }

      await loadEvents();
      setLoading(false);
    }

    boot();
  }, [navigate, loadEvents]);

  const categoryCell = (event: AdminEvent) => {
    const names: string[] = [];
    if (event.category?.name) names.push(categoryFa(event.category.name));
    (event.targeted_interest_ids || []).forEach((id) => {
      const label = categoriesById[id];
      if (label && !names.includes(label)) names.push(label);
    });
    return names.length > 0 ? names.join('، ') : fa.events.uncategorized;
  };

  const attendeeCount = (event: AdminEvent) => {
    const count = Array.isArray(event.rsvps) && event.rsvps[0] ? event.rsvps[0].count : 0;
    return `${count} / ${event.max_attendees ?? '∞'}`;
  };

  const openEdit = (event: AdminEvent) => {
    setError(null);
    setMessage(null);
    setEditing(event);
    setForm(toEditForm(event));
  };

  const closeEdit = () => {
    setEditing(null);
    setForm(null);
    setSaving(false);
  };

  const handleSave = async () => {
    if (!editing || !form) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    const datetime =
      form.date && form.time
        ? new Date(`${form.date}T${form.time}`).toISOString()
        : editing.datetime;

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim(),
      pitch: form.description.trim(),
      location: form.location.trim(),
      datetime,
      max_attendees: form.max_attendees ? Number(form.max_attendees) : null,
      gender_restriction: form.gender_restriction,
      status: form.status,
      ticket_price: form.ticket_price === '' ? null : Number(form.ticket_price),
      icon: form.icon,
    };

    const { error: updateError } = await supabase
      .from('events')
      .update(payload)
      .eq('id', editing.id);

    setSaving(false);
    if (updateError) {
      console.error(updateError);
      setError(fa.adminEvents.saveFailed);
      return;
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
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
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

            <div className="space-y-4 px-5 py-5">
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
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-gray-700">
                  {fa.createEvent.locationLabel}
                </span>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-gray-700">{fa.createEvent.dateLabel}</span>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-gray-700">{fa.createEvent.timeLabel}</span>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </label>
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
                    {fa.adminEvents.colTicketPrice}
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
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-gray-700">وضعیت</span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    <option value="voting">{fa.adminEvents.tabVoting}</option>
                    <option value="available">{fa.adminEvents.tabAvailable}</option>
                    <option value="completed">برگزار شده</option>
                    <option value="cancelled">لغو شده</option>
                  </select>
                </label>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-bold text-gray-700">{fa.createEvent.iconLabel}</span>
                <div className="flex flex-wrap gap-2">
                  {EVENT_ICONS.map((ic) => (
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
            </div>

            <div className="sticky bottom-0 flex gap-2 border-t border-gray-100 bg-white px-5 py-4">
              <button
                type="button"
                disabled={saving || !form.title.trim()}
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
