import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCategoryColor } from '../lib/colors';

type RecentEvent = {
  id: string;
  title: string;
  location: string;
  created_at: string;
  category: {
    name: string;
  };
  host: {
    is_verified: boolean;
  };
};

function getEmojiForCategory(name: string | undefined) {
  if (!name) return '🌟';
  const n = name.toLowerCase();
  if (n.includes('sport') || n.includes('fitness')) return '🏃';
  if (n.includes('tech') || n.includes('code') || n.includes('program')) return '💻';
  if (n.includes('food') || n.includes('drink') || n.includes('coffee') || n.includes('dine')) return '🍽️';
  if (n.includes('art') || n.includes('music') || n.includes('creative')) return '🎨';
  if (n.includes('game') || n.includes('board') || n.includes('video')) return '🎮';
  if (n.includes('book') || n.includes('read') || n.includes('lit')) return '📚';
  if (n.includes('outdoor') || n.includes('hike') || n.includes('nature')) return '⛰️';
  if (n.includes('movie') || n.includes('film') || n.includes('cinema')) return '🍿';
  if (n.includes('business') || n.includes('career') || n.includes('network')) return '💼';
  if (n.includes('photo') || n.includes('camera')) return '📸';
  return '🌟';
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Created just now';
  if (minutes < 60) return `Created ${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Created ${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `Created ${days} day${days > 1 ? 's' : ''} ago`;
}

export function HappeningNow() {
  const [events, setEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentEvents() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, location, created_at, category:interest_categories(name), host:users!events_host_id_fkey(is_verified)')
          .order('created_at', { ascending: false })
          .limit(8);

        if (error) throw error;
        
        const mappedData = data?.map(e => ({
          ...e,
          category: Array.isArray(e.category) ? e.category[0] : e.category,
          host: Array.isArray(e.host) ? e.host[0] : e.host
        }));

        setEvents(mappedData as RecentEvent[]);
      } catch (err) {
        console.error("Error fetching happening now events:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecentEvents();
  }, []);

  if (loading || events.length === 0) return null;

  return (
    <div className="py-12 bg-background border-b border-gray-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 flex items-center gap-3">
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Happening now</h2>
        <span className="relative flex h-3 w-3 mt-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-orange opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-orange"></span>
        </span>
      </div>

      <div className="flex overflow-x-auto pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto gap-4 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {events.map((evt) => {
          const color = getCategoryColor(evt.category?.name);
          return (
            <Link 
              key={evt.id} 
              to={`/event/${evt.id}`}
              className="flex-shrink-0 w-72 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all snap-start relative overflow-hidden"
            >
              {/* Temporary mock to true so you can see the design! */}
              {(evt.host?.is_verified || true) && (
                <div 
                  className="absolute top-0 right-0 bg-primary text-white p-1 rounded-bl-lg shadow-sm z-10 flex items-center justify-center w-8 h-8 cursor-help"
                  title="Verified host"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${color.bg} ${color.text}`}>
                  <span>{getEmojiForCategory(evt.category?.name)}</span> {evt.category?.name}
                </span>
              </div>
              <h3 className="font-extrabold text-lg text-gray-900 leading-snug mb-1 line-clamp-2">{evt.title}</h3>
              <p className="text-gray-500 text-sm font-medium mb-3">{evt.location}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{timeAgo(evt.created_at)}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
