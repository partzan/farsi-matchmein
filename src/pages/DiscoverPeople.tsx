import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getAvatarUrl } from '../lib/avatars';
import { Calendar, MapPin } from 'lucide-react';

export function DiscoverPeople() {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [inviting, setInviting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchDiscoverData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      // 1. Fetch current user data and interests
      const { data: me } = await supabase
        .from('users')
        .select(`
          id, city, gender, preferred_genders, looking_for,
          user_interests(category_id)
        `)
        .eq('id', session.user.id)
        .single();
        
      if (!me) {
        setLoading(false);
        return;
      }
      
      setCurrentUser(me);
      const myInterestIds = me.user_interests?.map((ui: any) => ui.category_id) || [];

      // 2. Fetch all other users with their interests
      const { data: others } = await supabase
        .from('users')
        .select(`
          id, display_name, avatar_url, city, bio, gender, preferred_genders, looking_for,
          user_interests(category_id)
        `)
        .neq('id', session.user.id);

      // 3. Filter others based on matching criteria
      const potentialMatches = (others || []).filter(other => {
        // Location (City match)
        if (me.city && other.city && me.city.toLowerCase() !== other.city.toLowerCase()) {
          return false;
        }

        // Gender preference (if strict)
        const myPref = me.preferred_genders || ['everyone'];
        const theirPref = other.preferred_genders || ['everyone'];
        
        const iMatchThem = theirPref.includes('everyone') || (me.gender && theirPref.includes(me.gender));
        const theyMatchMe = myPref.includes('everyone') || (other.gender && myPref.includes(other.gender));
        
        if (!iMatchThem || !theyMatchMe) return false;

        // Shared interests
        const theirInterestIds = other.user_interests?.map((ui: any) => ui.category_id) || [];
        const sharedInterests = myInterestIds.filter((id: string) => theirInterestIds.includes(id));
        
        if (sharedInterests.length === 0) return false;

        (other as any).sharedInterests = sharedInterests;
        return true;
      });

      // 4. Fetch upcoming events
      const { data: upcomingEvents } = await supabase
        .from('events')
        .select(`
          id, title, description, datetime, category_id,
          interest_categories(name, emoji)
        `)
        .gte('datetime', new Date().toISOString())
        .order('datetime', { ascending: true });

      setEvents(upcomingEvents || []);
      setMatches(potentialMatches);
      setLoading(false);
    }

    fetchDiscoverData();
  }, []);

  const handleInvite = async (recipientId: string, eventId: string) => {
    const key = `${recipientId}-${eventId}`;
    setInviting(prev => ({ ...prev, [key]: true }));

    await supabase.from('connections').insert({
      requester_id: currentUser.id,
      recipient_id: recipientId,
      status: 'pending',
      event_id: eventId
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold">Finding amazing people for you...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <div className="text-center py-20 font-bold text-gray-500">Please log in to discover people.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Discover People</h1>
        <p className="text-lg text-gray-600">We've found people who share your interests in your area. Invite them to an event!</p>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="text-6xl mb-6">🔍</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No matches right now</h2>
          <p className="text-gray-500 max-w-md mx-auto">We couldn't find anyone matching your exact preferences in your city right now. Check back later or broaden your preferences!</p>
        </div>
      ) : (
        <div className="space-y-16">
          {matches.map(person => {
            // Find events that match their shared interests, or just fallback to any city events
            const suggestedEvents = events.filter(e => person.sharedInterests.includes(e.category_id)).slice(0, 3);
            
            // If no shared interest events, maybe just show random events
            const displayEvents = suggestedEvents.length > 0 ? suggestedEvents : events.slice(0, 3);

            return (
              <div key={person.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
                {/* Profile Section */}
                <div className="md:w-1/3 bg-gray-50 p-8 flex flex-col items-center text-center border-r border-gray-100">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-white mb-6 border-4 border-white shadow-md">
                    <img src={getAvatarUrl(person.avatar_url, person.id)} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{person.display_name || 'Anonymous'}</h2>
                  <div className="flex items-center gap-2 text-gray-500 mb-4">
                    <MapPin className="w-4 h-4" />
                    <span className="font-medium">{person.city || 'No location'}</span>
                  </div>
                  {person.bio && (
                    <p className="text-gray-600 italic">"{person.bio}"</p>
                  )}
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <div className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-bold">
                      {person.sharedInterests.length} Shared Interests
                    </div>
                  </div>
                </div>

                {/* Events Section */}
                <div className="md:w-2/3 p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <span>🎟️</span> Suggested Events to go together
                  </h3>
                  
                  {displayEvents.length === 0 ? (
                    <p className="text-gray-500 italic">No upcoming events found to suggest.</p>
                  ) : (
                    <div className="space-y-4">
                      {displayEvents.map(event => {
                        const date = new Date(event.datetime);
                        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
                        const shortDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        const isInviting = inviting[`${person.id}-${event.id}`];

                        return (
                          <div key={event.id} className="group p-4 rounded-2xl border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-bold uppercase tracking-wider">
                                  {event.interest_categories?.emoji} {event.interest_categories?.name}
                                </span>
                              </div>
                              <h4 className="font-bold text-gray-900 text-lg">{event.title}</h4>
                              <p className="text-sm text-gray-500 line-clamp-1 mb-2">{event.description || 'No description provided.'}</p>
                              <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{dayOfWeek}, {shortDate}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleInvite(person.id, event.id)}
                              disabled={isInviting}
                              className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold transition-all ${
                                isInviting 
                                  ? 'bg-primary-light text-primary border border-primary/20'
                                  : 'bg-gray-900 text-white hover:bg-primary hover:text-white hover:scale-105'
                              }`}
                            >
                              {isInviting ? 'Invite Sent!' : 'Invite to Event'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
