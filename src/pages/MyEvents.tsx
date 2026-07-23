import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCategoryColor } from '../lib/colors';
import { fa } from '../locale/fa';
import { categoryFa } from '../locale/categoriesFa';

type Event = {
  id: string;
  title: string;
  pitch: string;
  datetime: string;
  max_attendees: number | null;
  category: { id: string; name: string };
  host: { display_name: string; is_verified?: boolean };
  rsvps: [{ count: number }];
};

export function MyEvents() {
  const [activeTab, setActiveTab] = useState<'attending' | 'attended'>('attending');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyEvents() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('event_rsvps')
        .select(`
          event:events (
            id, title, pitch, datetime, max_attendees,
            category:interest_categories(id, name),
            host:users!events_host_id_fkey(display_name, is_verified),
            rsvps:event_rsvps(count)
          )
        `)
        .eq('user_id', session.user.id)
        .in('status', ['going', 'interested']);

      if (error) {
        console.error("Error fetching my events:", error);
      } else if (data) {
        const extractedEvents = data.map((d: any) => d.event).filter((e: any) => e !== null);
        
        const filtered = extractedEvents.filter((e: any) => {
          if (activeTab === 'attending') return new Date(e.datetime) >= new Date();
          return new Date(e.datetime) < new Date();
        });

        filtered.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
        setEvents(filtered);
      }
      setLoading(false);
    }
    fetchMyEvents();
  }, [activeTab]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-12 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">{fa.myEvents.title}</h1>
        
        <div className="flex justify-center border-b border-gray-200">
          <button
            onClick={() => setActiveTab('attending')}
            className={`px-8 py-4 text-lg font-bold border-b-4 transition-colors ${
              activeTab === 'attending' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {fa.myEvents.attending}
          </button>
          <button
            onClick={() => setActiveTab('attended')}
            className={`px-8 py-4 text-lg font-bold border-b-4 transition-colors ${
              activeTab === 'attended' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {fa.myEvents.attended}
          </button>
        </div>
      </div>

      <div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col h-64 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <p className="text-gray-500 font-medium text-lg">
              {activeTab === 'attending' 
                ? fa.myEvents.notAttendingUpcoming 
                : fa.myEvents.notAttendedAny}
            </p>
            {activeTab === 'attending' && (
              <Link to="/events" className="text-primary font-bold hover:underline mt-4 inline-block">{fa.myEvents.findEvents}</Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const rsvpCount = Array.isArray(event.rsvps) && event.rsvps[0] ? event.rsvps[0].count || 0 : 0;
              const badgeColor = getCategoryColor(event.category?.name);
              
              return (
                <div key={event.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4 gap-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-sm text-sm font-bold max-w-[70%] ${badgeColor.bg} ${badgeColor.text}`}>
                      <span className="truncate">{event.category?.name ? categoryFa(event.category.name) : fa.events.uncategorized}</span>
                    </span>
                    <span className="text-sm font-bold flex-shrink-0 text-gray-400">
                      {new Date(event.datetime).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  
                  <h3 className="font-extrabold text-xl text-gray-900 mb-2 truncate" title={event.title}>
                    {event.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2 italic">
                    "{event.pitch}"
                  </p>
                  
                  <div className="flex items-center gap-2 mb-6 text-sm text-gray-500 font-medium mt-auto">
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex-shrink-0"></div>
                    <span className="truncate">{fa.events.byHost} {event.host?.display_name || fa.events.anonymous}</span>
                    <span className="mx-1">•</span>
                    <span className="flex-shrink-0">
                      {rsvpCount} / {event.max_attendees || '∞'} {fa.events.goingCount}
                    </span>
                  </div>
                  
                  <Link 
                    to={`/event/${event.id}`}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-full font-bold transition-colors text-center inline-block"
                  >
                    {fa.events.viewDetails}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
