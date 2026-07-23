import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fa } from '../locale/fa';
import { categoryFa } from '../locale/categoriesFa';

type Category = { id: string; name: string };

type AdminEvent = {
  id: string;
  title: string;
  location: string;
  max_attendees: number | null;
  gender_restriction?: string | null;
  status?: string | null;
  ticket_price?: number | null;
  category: { id: string; name: string } | null;
  targeted_interest_ids: string[] | null;
  rsvps: { count: number }[] | null;
};

type Tab = 'available' | 'voting';

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

export function AdminEvents() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('voting');
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState<AdminEvent[]>([]);
  const [voting, setVoting] = useState<AdminEvent[]>([]);
  const [categoriesById, setCategoriesById] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('rank')
        .eq('id', session.user.id)
        .single();

      if (!profile || (profile.rank !== 'administrator' && profile.rank !== 'moderator')) {
        navigate('/');
        return;
      }

      const { data: cats } = await supabase.from('interest_categories').select('id, name');
      if (cats) {
        const map: Record<string, string> = {};
        (cats as Category[]).forEach((c) => {
          map[c.id] = categoryFa(c.name);
        });
        setCategoriesById(map);
      }

      const { data: events, error } = await supabase
        .from('events')
        .select(`
          id, title, location, max_attendees, gender_restriction, status,
          targeted_interest_ids,
          category:interest_categories(id, name),
          rsvps:event_rsvps(count)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const rows = (events || []) as unknown as AdminEvent[];
      setVoting(rows.filter((e) => !e.status || e.status === 'voting'));
      setAvailable(rows.filter((e) => e.status && e.status !== 'voting'));
      setLoading(false);
    }

    load();
  }, [navigate]);

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
          className="inline-flex justify-center bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-full font-bold transition-colors text-sm"
        >
          {fa.nav.createEvent}
        </Link>
      </div>

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
                    <th className="px-4 py-3 font-bold whitespace-nowrap">{fa.adminEvents.colAttendeesCapacity}</th>
                  ) : (
                    <th className="px-4 py-3 font-bold whitespace-nowrap">{fa.adminEvents.colCapacity}</th>
                  )}
                  <th className="px-4 py-3 font-bold whitespace-nowrap">{fa.adminEvents.colDetails}</th>
                  {tab === 'available' && (
                    <th className="px-4 py-3 font-bold whitespace-nowrap">{fa.adminEvents.colTicketPrice}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900 max-w-[220px]">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
