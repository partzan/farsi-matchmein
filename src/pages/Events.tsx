import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCategoryColor } from '../lib/colors';
import { SignupModal } from '../components/SignupModal';
import type { User } from '@supabase/supabase-js';
import { fa } from '../locale/fa';
import { categoryFa } from '../locale/categoriesFa';

type Event = {
  id: string;
  title: string;
  pitch: string;
  datetime: string;
  max_attendees: number | null;
  targeted_interest_ids: string[] | null;
  category: { id: string; name: string };
  host: { display_name: string; is_verified?: boolean };
  rsvps: [{ count: number }];
  event_votes?: [{ count: number }];
  isMatch?: boolean;
  isPreferredTime?: boolean;
  status?: string;
  image_url?: string;
  gender_restriction?: string;
};

export function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [votingEvents, setVotingEvents] = useState<Event[]>([]);
  const [voteTokens, setVoteTokens] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userRank, setUserRank] = useState('user');
  const [showSignup, setShowSignup] = useState(false);
  const [animatingEventId, setAnimatingEventId] = useState<string | null>(null);
  const [unanimatingEventId, setUnanimatingEventId] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  
  type FlyingTicket = { id: string; startX: number; startY: number; endX: number; endY: number; animating: boolean };
  const [flyingTickets, setFlyingTickets] = useState<FlyingTicket[]>([]);
  const stackRef = useRef<HTMLDivElement>(null);
  const eventBadgeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    async function fetchEventsAndMatches() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      // Voting events are public — guests can browse before signing up
      const { data: vEvents } = await supabase
        .from('events')
        .select(`
          id, title, pitch, description, datetime, max_attendees, image_url, status, gender_restriction,
          category:interest_categories(id, name),
          host:users!events_host_id_fkey(display_name, is_verified),
          event_votes(count)
        `)
        .eq('status', 'voting')
        .order('created_at', { ascending: false });

      if (vEvents) {
        setVotingEvents(vEvents as unknown as Event[]);
      }

      if (!session) {
        setLoading(false);
        return;
      }

      let preferredSlots: string[] = [];
      const { data: profile } = await supabase
        .from('users')
        .select('preferred_time_slots, rank, vote_tokens, gender')
        .eq('id', session.user.id)
        .single();
      if (profile?.preferred_time_slots) {
        preferredSlots = profile.preferred_time_slots;
      }
      if (profile?.rank) {
        setUserRank(profile.rank);
      }
      if (profile?.vote_tokens !== undefined) {
        setVoteTokens(profile.vote_tokens);
      }

      const { data: myVotes } = await supabase
        .from('event_votes')
        .select('event_id')
        .eq('user_id', session.user.id);
        
      if (myVotes) {
        setUserVotes(new Set(myVotes.map(v => v.event_id)));
      }

      const { data, error } = await supabase
        .from('events')
        .select(`
          id, title, pitch, datetime, max_attendees, targeted_interest_ids, gender_restriction,
          category:interest_categories(id, name),
          host:users!events_host_id_fkey(display_name, is_verified),
          rsvps:event_rsvps(count),
          event_matches!inner (match_tier)
        `)
        .eq('event_matches.user_id', session.user.id)
        .eq('event_matches.is_active', true)
        .gte('datetime', new Date().toISOString())
        .order('datetime', { ascending: true });

      if (error) {
        console.error("Error fetching events:", error);
      } else if (data) {
        const isPreferredTime = (datetimeStr: string) => {
          if (preferredSlots.length === 0) return false;
          const d = new Date(datetimeStr);
          const day = d.getDay();
          const hour = d.getHours();

          const isWeekend = day === 0 || day === 6;
          if (isWeekend) return preferredSlots.includes('weekend');

          if (hour >= 6 && hour < 12) return preferredSlots.includes('weekday_morning');
          if (hour >= 12 && hour < 17) return preferredSlots.includes('weekday_afternoon');
          return preferredSlots.includes('weekday_evening');
        };

        let processedEvents = (data as any[])
          .filter(e => !e.gender_restriction || e.gender_restriction === 'everyone' || e.gender_restriction === profile?.gender + '_only')
          .map(e => ({
            ...e,
            isHighMatch: (e as any).event_matches && (e as any).event_matches.length > 0 && (e as any).event_matches[0].match_tier === 'high',
            isPreferredTime: isPreferredTime(e.datetime)
          }));
        
        processedEvents.sort((a, b) => {
          if (a.isHighMatch && !b.isHighMatch) return -1;
          if (!a.isHighMatch && b.isHighMatch) return 1;
          if (a.isPreferredTime && !b.isPreferredTime) return -1;
          if (!a.isPreferredTime && b.isPreferredTime) return 1;
          return 0;
        });
        
        setEvents(processedEvents);
      }
      setLoading(false);
    }

    fetchEventsAndMatches();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchEventsAndMatches();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleVote = async (eventId: string) => {
    if (!user) {
      setShowSignup(true);
      return;
    }

    if (voteTokens <= 0) {
      alert(fa.events.noTokens);
      return;
    }
    
    const { error } = await supabase.rpc('vote_for_event', { target_event_id: eventId });
    if (error) {
      if (error.message.includes('unique constraint')) {
        alert(fa.events.alreadyVoted);
      } else {
        alert(fa.events.voteError + ' ' + error.message);
      }
    } else {
      let startX = 0, startY = 0, endX = 0, endY = 0;
      if (stackRef.current && eventBadgeRefs.current[eventId]) {
        const sourceRect = stackRef.current.getBoundingClientRect();
        const targetRect = eventBadgeRefs.current[eventId]!.getBoundingClientRect();
        
        startX = sourceRect.left + sourceRect.width / 2;
        startY = sourceRect.top + sourceRect.height / 2;
        endX = targetRect.left + targetRect.width / 2;
        endY = targetRect.top + targetRect.height / 2;
      }

      const ticketId = Math.random().toString(36).substr(2, 9);
      if (startX !== 0) {
        setFlyingTickets(prev => [...prev, { id: ticketId, startX, startY, endX, endY, animating: false }]);
        setTimeout(() => {
          setFlyingTickets(prev => prev.map(t => t.id === ticketId ? { ...t, animating: true } : t));
        }, 10);
      }

      setVoteTokens(prev => prev - 1);
      setUserVotes(prev => {
        const next = new Set(prev);
        next.add(eventId);
        return next;
      });
      
      setTimeout(() => {
        setFlyingTickets(prev => prev.filter(t => t.id !== ticketId));
        setAnimatingEventId(eventId);
        
        setVotingEvents(prev => prev.map(e => {
          if (e.id === eventId) {
            const currentVotes = Array.isArray(e.event_votes) && e.event_votes[0] ? e.event_votes[0].count : 0;
            return { ...e, event_votes: [{ count: currentVotes + 1 }] };
          }
          return e;
        }));
        
        setTimeout(() => setAnimatingEventId(null), 300);
      }, 600);
    }
  };

  const handleUnvote = async (eventId: string) => {
    const { error } = await supabase.rpc('unvote_for_event', { target_event_id: eventId });
    if (error) {
      alert(fa.events.unvoteError + ' ' + error.message);
    } else {
      // Optimistically update UI
      setUserVotes(prev => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
      setVoteTokens(prev => prev + 1);
      
      setUnanimatingEventId(eventId);
      
      setVotingEvents(prev => prev.map(e => {
        if (e.id === eventId) {
          const currentVotes = Array.isArray(e.event_votes) && e.event_votes[0] ? e.event_votes[0].count : 0;
          return { ...e, event_votes: [{ count: Math.max(0, currentVotes - 1) }] };
        }
        return e;
      }));
      
      setTimeout(() => setUnanimatingEventId(null), 300);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" dir="rtl">
      <SignupModal open={showSignup} onClose={() => setShowSignup(false)} />

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">{fa.events.title}</h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          {user ? fa.events.subtitleUser : fa.events.subtitleGuest}
        </p>
      </div>

      {!loading && votingEvents.length > 0 && (
        <div className="mb-12">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{fa.events.votingStage}</h2>
              <p className="text-gray-500 mt-1">{fa.events.votingHint}</p>
            </div>
            
            {user && (
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-gray-500 mb-1">{fa.events.yourTokens}</span>
              <div ref={stackRef} className="relative flex items-center justify-center w-16 h-14">
                {/* Stack of tickets visualization */}
                <div className="absolute transform -rotate-6 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm opacity-50 border border-primary-dark/20">🎟️</div>
                <div className="absolute transform rotate-3 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded shadow-md opacity-80 border border-primary-dark/20">🎟️</div>
                <div className="absolute z-10 bg-white border-2 border-primary text-primary font-black rounded-full w-8 h-8 flex items-center justify-center shadow-lg transform translate-y-3 translate-x-5 text-sm">
                  {voteTokens}
                </div>
              </div>
            </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {votingEvents.map(event => {
              const currentVotes = Array.isArray(event.event_votes) && event.event_votes[0] ? event.event_votes[0].count : 0;
              return (
                <div key={event.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="h-48 w-full bg-gray-200 relative overflow-hidden">
                    {event.image_url ? (
                      <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">No Image</div>
                    )}
                    
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                      {event.gender_restriction === 'female_only' && (
                        <div className="bg-pink-100/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-pink-800 shadow-sm border border-pink-200">
                          👩 {fa.events.womenOnly}
                        </div>
                      )}
                      {event.gender_restriction === 'male_only' && (
                        <div className="bg-blue-100/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-blue-800 shadow-sm border border-blue-200">
                          👨 {fa.events.menOnly}
                        </div>
                      )}
                    </div>
                    
                    <div 
                      ref={el => { eventBadgeRefs.current[event.id] = el; }}
                      className={`absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-gray-900 shadow-md flex items-center gap-1 transition-all duration-300 ${animatingEventId === event.id ? 'scale-125 ring-4 ring-primary/40 bg-primary text-white' : unanimatingEventId === event.id ? 'scale-90 opacity-80 bg-red-50 text-red-600 border border-red-200' : ''}`}
                    >
                      <span className="text-sm">⭐</span> {currentVotes} {fa.events.votes}
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <div className="text-xs font-bold text-primary mb-2">{categoryFa(event.category?.name)}</div>
                    <h3 className="font-extrabold text-lg text-gray-900 mb-2 leading-tight">{event.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.pitch}</p>
                    
                    {user && userVotes.has(event.id) ? (
                      <button 
                        onClick={() => handleUnvote(event.id)}
                        className="mt-auto w-full bg-transparent border-2 border-gray-200 text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 py-2.5 rounded-full font-bold transition-colors text-sm"
                      >
                        {fa.events.removeVote}
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleVote(event.id)}
                        className="mt-auto w-full bg-primary/10 hover:bg-primary hover:text-white text-primary py-2.5 rounded-full font-bold transition-colors text-sm"
                      >
                        {fa.events.vote}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && votingEvents.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 mb-12">
          <p className="text-gray-500 font-medium text-lg">{fa.events.noVoting}</p>
          <p className="text-gray-400 mt-2">{fa.events.checkBack}</p>
        </div>
      )}

      {/* Render flying tickets */}
      {flyingTickets.map(ticket => (
        <div
          key={ticket.id}
          className="fixed z-[100] pointer-events-none flex items-center justify-center transition-all ease-in-out"
          style={{
            left: ticket.startX,
            top: ticket.startY,
            transitionDuration: '600ms',
            transform: ticket.animating 
              ? `translate(${ticket.endX - ticket.startX}px, ${ticket.endY - ticket.startY}px) scale(0.3) rotate(360deg)` 
              : 'translate(0px, 0px) scale(1) rotate(0deg)',
            opacity: ticket.animating ? 0 : 1,
            marginLeft: '-20px',
            marginTop: '-20px'
          }}
        >
          <div className="bg-primary text-white text-xl font-bold px-3 py-1.5 rounded shadow-xl border-2 border-white">🎟️</div>
        </div>
      ))}

      {user && (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{fa.events.upcoming}</h2>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col h-64 animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
                <div className="mt-auto flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <p className="text-gray-500 font-medium text-lg">{fa.events.noUpcoming}</p>
            {(userRank === 'administrator' || userRank === 'moderator') && (
              <Link to="/create-event" className="text-primary font-bold hover:underline mt-2 inline-block">{fa.events.createFirst}</Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const rsvpCount = Array.isArray(event.rsvps) && event.rsvps[0] ? event.rsvps[0].count || 0 : 0;
              const badgeColor = getCategoryColor(event.category?.name);
              
              return (
                <div key={event.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col hover:shadow-md transition-shadow relative overflow-hidden">
                  
                  <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 items-end">
                    {/* Verified badge */}
                    {(event.host?.is_verified || true) && (
                      <div 
                        className="bg-primary text-white p-1 rounded-bl-lg shadow-sm flex items-center justify-center w-8 h-8 cursor-help"
                        title="Verified host"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    )}
                    
                    {event.gender_restriction === 'female_only' && (
                      <div className="bg-pink-100 px-2 py-1 rounded-md text-[10px] font-bold text-pink-800 shadow-sm border border-pink-200">
                        👩 Women Only
                      </div>
                    )}
                    {event.gender_restriction === 'male_only' && (
                      <div className="bg-blue-100 px-2 py-1 rounded-md text-[10px] font-bold text-blue-800 shadow-sm border border-blue-200">
                        👨 Men Only
                      </div>
                    )}
                  </div>
                  {event.isMatch && (
                    <div className="mb-3 flex max-w-full overflow-hidden">
                       <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-sm text-sm font-bold w-full ${badgeColor.bg} ${badgeColor.text}`}>
                        <span className="flex-shrink-0">★</span> 
                        <span className="truncate">Matches your interests: {event.category?.name}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-4 gap-2">
                    {!event.isMatch && !event.isPreferredTime && (
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-sm text-sm font-bold max-w-[70%] ${badgeColor.bg} ${badgeColor.text}`}>
                        <span className="truncate">{event.category?.name || 'Uncategorized'}</span>
                      </span>
                    )}
                    {event.isPreferredTime && !event.isMatch && (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-900 px-3 py-1 rounded-sm text-sm font-bold max-w-[70%]">
                        <span className="text-blue-500 flex-shrink-0">⏱</span>
                        <span className="truncate">Matches your schedule</span>
                      </span>
                    )}
                    <span className={`text-sm font-bold flex-shrink-0 ${event.isMatch || event.isPreferredTime ? 'ml-auto text-gray-500' : 'text-gray-400'}`}>
                      {new Date(event.datetime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
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
                    <span className="truncate">By {event.host?.display_name || 'Anonymous'}</span>
                    <span className="mx-1">•</span>
                    <span className="flex-shrink-0">
                      {rsvpCount} / {event.max_attendees || '∞'} going
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
      )}
    </div>
  );
}
