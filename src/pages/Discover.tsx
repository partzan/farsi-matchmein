import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { VoteCounterRail } from '../components/VoteCounterRail';
import { useVoteTokens } from '../hooks/useVoteTokens';
import { signInWithGoogle } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { fa } from '../locale/fa';
import { categoryFa } from '../locale/categoriesFa';

type BrowseEvent = {
  id: string;
  title: string;
  datetime: string;
  image_url?: string;
  gender_restriction?: string;
  category?: { name: string } | null;
  rsvps?: [{ count: number }];
  isFavorite?: boolean;
};

type DateFilter = 'all' | 'today' | 'week' | 'month';
type GenderFilter = 'all' | 'everyone' | 'female_only' | 'male_only';

const PAGE_SIZE = 9;

export function Discover() {
  const { remaining, max, refresh } = useVoteTokens();
  const [events, setEvents] = useState<BrowseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [friendEvents, setFriendEvents] = useState<BrowseEvent[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);

      const { data } = await supabase
        .from('events')
        .select(`
          id, title, datetime, image_url, gender_restriction, status,
          category:interest_categories(name),
          rsvps:event_rsvps(count)
        `)
        .neq('status', 'voting')
        .gte('datetime', new Date().toISOString())
        .order('datetime', { ascending: true })
        .limit(60);

      let rows = (data as unknown as BrowseEvent[]) || [];

      // If no published upcoming, show voting as suggestions so the page isn't empty
      if (rows.length === 0) {
        const { data: voting } = await supabase
          .from('events')
          .select(`
            id, title, datetime, image_url, gender_restriction, status,
            category:interest_categories(name),
            rsvps:event_rsvps(count)
          `)
          .eq('status', 'voting')
          .order('created_at', { ascending: false })
          .limit(60);
        rows = (voting as unknown as BrowseEvent[]) || [];
      }

      setEvents(rows);

      if (session?.user) {
        const { data: matches } = await supabase
          .from('event_matches')
          .select('event_id')
          .eq('user_id', session.user.id)
          .eq('is_active', true);
        if (matches) setFavoriteIds(new Set(matches.map((m) => m.event_id)));

        // "Friends going" — approximate with high-match events for now
        const { data: friendish } = await supabase
          .from('events')
          .select(`
            id, title, datetime, image_url, gender_restriction,
            category:interest_categories(name),
            rsvps:event_rsvps(count),
            event_matches!inner (match_tier)
          `)
          .eq('event_matches.user_id', session.user.id)
          .eq('event_matches.is_active', true)
          .eq('event_matches.match_tier', 'high')
          .gte('datetime', new Date().toISOString())
          .limit(6);
        setFriendEvents((friendish as unknown as BrowseEvent[]) || []);
      }

      setLoading(false);
      refresh();
    }
    load();
  }, [refresh]);

  const filtered = useMemo(() => {
    const now = new Date();
    const endToday = new Date(now);
    endToday.setHours(23, 59, 59, 999);
    const endWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const endMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return events.filter((e) => {
      if (favoritesOnly && !favoriteIds.has(e.id)) return false;
      if (genderFilter !== 'all' && (e.gender_restriction || 'everyone') !== genderFilter) {
        return false;
      }
      const d = new Date(e.datetime);
      if (dateFilter === 'today' && d > endToday) return false;
      if (dateFilter === 'week' && d > endWeek) return false;
      if (dateFilter === 'month' && d > endMonth) return false;
      return true;
    });
  }, [events, favoritesOnly, favoriteIds, genderFilter, dateFilter]);

  const shown = filtered.slice(0, visible);

  return (
    <div className="relative min-h-[60vh]" dir="rtl">
      <VoteCounterRail remaining={remaining} max={max} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:ps-28">
        <header className="mb-6">
          <h1 className="text-2xl font-black text-foreground sm:text-3xl">{fa.discover.title}</h1>
          <p className="mt-1 text-sm text-muted">{fa.discover.subtitle}</p>
        </header>

        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-border bg-white p-3">
          <button
            type="button"
            onClick={() => setFavoritesOnly((v) => !v)}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${
              favoritesOnly ? 'bg-primary text-white' : 'bg-primary-light text-primary'
            }`}
          >
            {fa.discover.favorites}
          </button>
          {(
            [
              ['all', fa.discover.dateAll],
              ['today', fa.discover.dateToday],
              ['week', fa.discover.dateWeek],
              ['month', fa.discover.dateMonth],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setDateFilter(id);
                setVisible(PAGE_SIZE);
              }}
              className={`rounded-xl px-3 py-2 text-sm font-bold ${
                dateFilter === id ? 'bg-primary text-white' : 'bg-background text-muted'
              }`}
            >
              {label}
            </button>
          ))}
          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value as GenderFilter);
              setVisible(PAGE_SIZE);
            }}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold text-foreground"
          >
            <option value="all">{fa.discover.genderAll}</option>
            <option value="everyone">{fa.discover.genderEveryone}</option>
            <option value="female_only">{fa.events.womenOnly}</option>
            <option value="male_only">{fa.events.menOnly}</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-border/60" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
            <p className="text-muted">{fa.discover.empty}</p>
            <Link
              to="/events"
              className="mt-5 inline-flex rounded-full bg-gradient-to-l from-primary to-accent-purple px-6 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              {fa.discover.emptyVoteCta}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((event) => (
                <Link
                  key={event.id}
                  to={`/event/${event.id}`}
                  className="group overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-primary-light">
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted">
                        {fa.events.noImage}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-4">
                    <p className="text-xs font-bold text-primary">
                      {categoryFa(event.category?.name)}
                    </p>
                    <h3 className="font-bold text-foreground">{event.title}</h3>
                    <p className="text-xs text-muted">
                      {new Date(event.datetime).toLocaleDateString('fa-IR', {
                        month: 'short',
                        day: 'numeric',
                      })}
                      {' · '}
                      {(event.rsvps?.[0]?.count ?? 0).toLocaleString('fa-IR')} {fa.events.goingCount}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {visible < filtered.length && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="rounded-2xl border border-border bg-white px-8 py-3 text-sm font-bold text-primary hover:bg-primary-light"
                >
                  {fa.discover.more}
                </button>
              </div>
            )}
          </>
        )}

        <section className="mt-12">
          <h2 className="mb-4 text-xl font-black text-foreground">{fa.discover.friendsGoing}</h2>
          {!userId ? (
            <p className="rounded-2xl border border-border bg-white px-4 py-6 text-sm text-muted">
              {fa.discover.friendsLoginHint}{' '}
              <Link to="/login" className="font-bold text-primary">
                {fa.login.loginLink}
              </Link>
              {' · '}
              <button
                type="button"
                onClick={() => signInWithGoogle('/events')}
                className="font-bold text-primary"
              >
                {fa.nav.loginGoogle}
              </button>
            </p>
          ) : friendEvents.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-white px-4 py-6 text-sm text-muted">
              {fa.discover.friendsEmpty}
            </p>
          ) : (
            <ul className="space-y-3">
              {friendEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3"
                >
                  <img
                    src={event.image_url || '/images/community_meetup.png'}
                    alt=""
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-foreground">{event.title}</p>
                    <p className="text-xs text-muted">
                      {new Date(event.datetime).toLocaleDateString('fa-IR')}
                    </p>
                  </div>
                  <Link
                    to="/events"
                    className="shrink-0 rounded-xl bg-primary/10 px-3 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-white"
                  >
                    {fa.events.vote}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
