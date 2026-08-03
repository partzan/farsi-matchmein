import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { canAccessAdmin } from '../lib/admin';
import { VOTING_ENABLED } from '../lib/features';
import { supabase } from '../lib/supabase';
import { getCategoryColor } from '../lib/colors';
import { VoteCounterRail } from '../components/VoteCounterRail';
import { VotingEventCard } from '../components/VotingEventCard';
import { SignupModal } from '../components/SignupModal';
import type { User } from '@supabase/supabase-js';
import { fa } from '../locale/fa';
import { categoryFa } from '../locale/categoriesFa';

type Event = {
  id: string;
  title: string;
  pitch: string;
  description?: string | null;
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
  icon?: string | null;
  gender_restriction?: string;
};

export function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [votingEvents, setVotingEvents] = useState<Event[]>([]);
  const [voteTokens, setVoteTokens] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
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
      setUserEmail(session?.user?.email ?? null);

      if (VOTING_ENABLED) {
        const { data: vEvents } = await supabase
          .from('events')
          .select(`
            id, title, pitch, description, datetime, max_attendees, image_url, icon, status, gender_restriction,
            category:interest_categories(id, name),
            host:users!events_host_id_fkey(display_name, is_verified),
            event_votes(count)
          `)
          .eq('status', 'voting')
          .order('created_at', { ascending: false });

        if (vEvents) {
          setVotingEvents(vEvents as unknown as Event[]);
        }
      } else {
        setVotingEvents([]);
      }

      if (!session && VOTING_ENABLED) {
        setLoading(false);
        return;
      }

      let preferredSlots: string[] = [];
      let profileGender: string | null = null;
      if (session) {
        const { data: profile } = await supabase
          .from('users')
          .select(
            VOTING_ENABLED
              ? 'preferred_time_slots, rank, vote_tokens, gender'
              : 'preferred_time_slots, rank, gender',
          )
          .eq('id', session.user.id)
          .single();
        if (profile?.preferred_time_slots) {
          preferredSlots = profile.preferred_time_slots;
        }
        if (profile?.rank) {
          setUserRank(profile.rank);
        }
        profileGender = profile?.gender ?? null;
        if (VOTING_ENABLED && profile?.vote_tokens !== undefined) {
          setVoteTokens(profile.vote_tokens);
        }

        if (VOTING_ENABLED) {
          const { data: myVotes } = await supabase
            .from('event_votes')
            .select('event_id')
            .eq('user_id', session.user.id);

          if (myVotes) {
            setUserVotes(new Set(myVotes.map((v) => v.event_id)));
          }
        } else {
          setUserVotes(new Set());
        }
      }

      const { data, error } = await supabase
        .from('events')
        .select(`
          id, title, pitch, datetime, max_attendees, targeted_interest_ids, gender_restriction, status,
          category:interest_categories(id, name),
          host:users!events_host_id_fkey(display_name, is_verified),
          rsvps:event_rsvps(count),
          event_matches (match_tier, user_id, is_active)
        `)
        .eq('status', 'available')
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
          .filter(e => !e.gender_restriction || e.gender_restriction === 'everyone' || (profileGender && e.gender_restriction === profileGender + '_only'))
          .map(e => {
            const myMatches = session && Array.isArray(e.event_matches)
              ? e.event_matches.filter(
                  (m: any) => m.user_id === session.user.id && m.is_active,
                )
              : [];
            return {
              ...e,
              isHighMatch: myMatches.some((m: any) => m.match_tier === 'high'),
              isPreferredTime: isPreferredTime(e.datetime),
            };
          });
        
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
      setUserEmail(session?.user?.email ?? null);
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
    <div className="relative min-h-[60vh]" dir="rtl">
      <SignupModal open={showSignup} onClose={() => setShowSignup(false)} />
      {VOTING_ENABLED && <VoteCounterRail remaining={user ? voteTokens : null} />}
      {/* Keep stackRef for flying-ticket animation origin */}
      <div ref={stackRef} className="pointer-events-none fixed left-4 top-1/2 -z-10 h-1 w-1 opacity-0" aria-hidden />

      <div className={`mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 ${VOTING_ENABLED ? 'lg:ps-28' : ''}`}>
      <div id="events-hero" className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8 text-center scroll-mt-24">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
          {VOTING_ENABLED ? fa.events.title : fa.events.upcoming}
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          {VOTING_ENABLED
            ? user
              ? fa.events.subtitleUser
              : fa.events.subtitleGuest
            : user
              ? fa.events.browseSubtitleUser
              : fa.events.browseSubtitleGuest}
        </p>
      </div>

      {VOTING_ENABLED && !loading && votingEvents.length > 0 && (
        <div className="mb-12">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{fa.events.votingStage}</h2>
              <p className="text-gray-500 mt-1">{fa.events.votingHint}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {votingEvents.map((event) => {
              const currentVotes =
                Array.isArray(event.event_votes) && event.event_votes[0]
                  ? event.event_votes[0].count
                  : 0;
              return (
                <VotingEventCard
                  key={event.id}
                  event={event}
                  hasVoted={userVotes.has(event.id)}
                  voteCount={currentVotes}
                  animating={animatingEventId === event.id}
                  unAnimating={unanimatingEventId === event.id}
                  badgeRef={(el) => {
                    eventBadgeRefs.current[event.id] = el;
                  }}
                  onVote={() => handleVote(event.id)}
                  onUnvote={() => handleUnvote(event.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {VOTING_ENABLED && !loading && votingEvents.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 mb-12">
          <p className="text-gray-500 font-medium text-lg">{fa.events.noVoting}</p>
          <p className="text-gray-400 mt-2">{fa.events.checkBack}</p>
        </div>
      )}

      {/* Render flying tickets */}
      {VOTING_ENABLED && flyingTickets.map(ticket => (
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

      {(user || !VOTING_ENABLED) && (
      <div>
        {VOTING_ENABLED && (
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{fa.events.upcoming}</h2>
        )}
        
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
            {VOTING_ENABLED ? (
              <a
                href="#events-hero"
                className="mt-5 inline-flex rounded-full bg-gradient-to-l from-primary to-accent-purple px-6 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5"
              >
                {fa.events.noUpcomingVoteCta}
              </a>
            ) : null}
            {canAccessAdmin(userEmail, userRank) && (
              <Link to="/admin/events" className="text-primary font-bold hover:underline mt-4 block">{fa.events.createFirst}</Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const rsvpCount = Array.isArray(event.rsvps) && event.rsvps[0] ? event.rsvps[0].count || 0 : 0;
              const badgeColor = getCategoryColor(event.category?.name);
              
              return (
                <div key={event.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col hover:shadow-md transition-shadow relative overflow-hidden">
                  
                  <div className="absolute top-4 end-4 flex flex-col gap-2 z-10 items-end">
                    {/* Verified badge */}
                    {(event.host?.is_verified || true) && (
                      <div 
                        className="bg-primary text-white p-1 rounded-es-lg shadow-sm flex items-center justify-center w-8 h-8 cursor-help"
                        title={fa.events.verifiedHost}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    )}
                    
                    {event.gender_restriction === 'female_only' && (
                      <div className="bg-pink-100 px-2 py-1 rounded-md text-[10px] font-bold text-pink-800 shadow-sm border border-pink-200">
                        👩 {fa.events.womenOnly}
                      </div>
                    )}
                    {event.gender_restriction === 'male_only' && (
                      <div className="bg-blue-100 px-2 py-1 rounded-md text-[10px] font-bold text-blue-800 shadow-sm border border-blue-200">
                        👨 {fa.events.menOnly}
                      </div>
                    )}
                  </div>
                  {event.isMatch && (
                    <div className="mb-3 flex max-w-full overflow-hidden">
                       <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-sm text-sm font-bold w-full ${badgeColor.bg} ${badgeColor.text}`}>
                        <span className="flex-shrink-0">★</span> 
                        <span className="truncate">{fa.events.matchesInterests}: {categoryFa(event.category?.name)}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-4 gap-2">
                    {!event.isMatch && !event.isPreferredTime && (
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-sm text-sm font-bold max-w-[70%] ${badgeColor.bg} ${badgeColor.text}`}>
                        <span className="truncate">{event.category?.name ? categoryFa(event.category.name) : fa.events.uncategorized}</span>
                      </span>
                    )}
                    {event.isPreferredTime && !event.isMatch && (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-900 px-3 py-1 rounded-sm text-sm font-bold max-w-[70%]">
                        <span className="text-blue-500 flex-shrink-0">⏱</span>
                        <span className="truncate">{fa.events.matchesSchedule}</span>
                      </span>
                    )}
                    <span className={`text-sm font-bold flex-shrink-0 ${event.isMatch || event.isPreferredTime ? 'ms-auto text-gray-500' : 'text-gray-400'}`}>
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
      )}
      </div>
    </div>
  );
}
