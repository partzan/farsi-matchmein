import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fa } from '../locale/fa';
import {
  collapseRepeatedPhrase,
  eventBroadCategoryLabel,
} from '../lib/matchmaking';

type ArchiveEvent = {
  id: string;
  title: string;
  datetime: string;
  image_url?: string;
  status?: string;
  most_suitable_broad_ids?: string[] | null;
  category?: { name: string } | null;
  rsvps?: [{ count: number }];
};

/** Past / completed events archive. */
export function Archive() {
  const [events, setEvents] = useState<ArchiveEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from('events')
        .select(`
          id, title, datetime, image_url, status,
          most_suitable_broad_ids,
          category:interest_categories(name),
          rsvps:event_rsvps(count)
        `)
        .in('status', ['active', 'completed'])
        .lt('datetime', nowIso)
        .order('datetime', { ascending: false })
        .limit(60);

      setEvents((data as unknown as ArchiveEvent[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" dir="rtl">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-foreground sm:text-3xl">{fa.archive.title}</h1>
        <p className="mt-1 text-sm text-muted">{fa.archive.subtitle}</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-border/60" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <p className="text-muted">{fa.archive.empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
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
                <h3 className="font-bold text-foreground">
                  {collapseRepeatedPhrase(event.title)}
                </h3>
                <p className="text-xs font-bold text-primary">
                  {eventBroadCategoryLabel(event, fa.events.uncategorized)}
                </p>
                <p className="text-xs text-muted">
                  {new Date(event.datetime).toLocaleDateString('fa-IR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                  {' · '}
                  {fa.archive.heldBadge}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
