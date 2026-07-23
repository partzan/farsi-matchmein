import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCategoryColor } from '../lib/colors';
import { getAvatarUrl } from '../lib/avatars';
import { fa } from '../locale/fa';
import { categoryFa } from '../locale/categoriesFa';

type EventDetails = {
  id: string;
  title: string;
  pitch: string;
  datetime: string;
  location: string;
  max_attendees: number;
  host_id: string;
  category: { name: string };
  host: { display_name: string; avatar_url: string; is_verified?: boolean };
  gender_restriction?: string;
};

type RSVP = {
  user_id: string;
  status: string;
  created_at: string;
  user: { display_name: string; avatar_url: string };
};

export function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<string>('user');
  const [boosting, setBoosting] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    async function fetchEvent() {
      // Fetch event with host and category
      const { data: eventData } = await supabase
        .from('events')
        .select(`
          id, title, pitch, datetime, location, max_attendees, host_id, gender_restriction,
          category:interest_categories(name),
          host:users!events_host_id_fkey(display_name, avatar_url, is_verified)
        `)
        .eq('id', id)
        .single();
        
      if (eventData) {
        // @ts-ignore - Supabase types get confused with joins sometimes
        setEvent(eventData as EventDetails);
      }

      // Fetch RSVPs
      const { data: rsvpData } = await supabase
        .from('event_rsvps')
        .select(`
          user_id, status, created_at,
          user:users(display_name, avatar_url)
        `)
        .eq('event_id', id);

      if (rsvpData) {
        // @ts-ignore
        setRsvps(rsvpData as RSVP[]);
      }
      
      // Check current user RSVP
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        const { data: profile } = await supabase.from('users').select('rank').eq('id', session.user.id).single();
        if (profile) setCurrentUserRank(profile.rank);
        if (rsvpData) {
          const myRsvp = rsvpData.find(r => r.user_id === session.user.id);
          if (myRsvp) setUserStatus(myRsvp.status);
        }
      }
      
      setLoading(false);
    }
    
    fetchEvent();
  }, [id]);

  const handleRSVP = async (status: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert(fa.eventDetail.loginToRsvp);
      return;
    }

    if (status === 'none') {
      await supabase.from('event_rsvps').delete().match({ event_id: id, user_id: session.user.id });
      setUserStatus(null);
      setRsvps(prev => prev.filter(r => r.user_id !== session.user.id));
    } else {
      await supabase.from('event_rsvps').upsert({
        event_id: id,
        user_id: session.user.id,
        status: status
      });
      setUserStatus(status);
      // Fetch latest RSVPs
      const { data: newRsvps } = await supabase
        .from('event_rsvps')
        .select('user_id, status, created_at, user:users(display_name, avatar_url)')
        .eq('event_id', id);
      if (newRsvps) setRsvps(newRsvps as any[]);
    }
  };

  const handleDeleteEvent = async () => {
    if (!event || event.host_id !== currentUserId) return;

    const goingCount = rsvps.filter(r => r.status === 'going').length;
    let confirmMsg = fa.eventDetail.confirmDelete;
    if (goingCount > 0) {
      confirmMsg = `${goingCount} ${fa.eventDetail.confirmDeleteWithAttendees}`;
    }

    if (window.confirm(confirmMsg)) {
      await supabase.from('events').delete().eq('id', event.id);
      navigate('/discover');
    }
  };

  const handleBoost = async () => {
    if (!event) return;
    setBoosting(true);
    const { data, error } = await supabase.rpc('expand_event_matches', { target_event_id: event.id });
    setBoosting(false);
    if (error) {
      alert(fa.eventDetail.boostError + ' ' + error.message);
    } else {
      alert(data || fa.eventDetail.boostSuccess);
    }
  };

  if (loading) return <div className="p-8 text-center">{fa.eventDetail.loading}</div>;
  if (!event) return <div className="p-8 text-center text-red-600">{fa.eventDetail.notFound}</div>;

  const goingRsvps = rsvps.filter(r => r.status === 'going').sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  const goingCount = goingRsvps.length;
  const coordinatorId = goingCount > 0 ? goingRsvps[0].user_id : null;

  const badgeColor = getCategoryColor(event.category?.name);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/discover" className="text-primary font-bold hover:underline mb-6 inline-block">
        {fa.eventDetail.backToDiscover} &rarr;
      </Link>
      
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
        {/* Temporary mock to true so you can see the design! */}
        {(event.host?.is_verified || true) && (
          <div 
            className="absolute top-0 end-0 bg-primary text-white p-2 rounded-es-xl shadow-sm z-10 flex items-center justify-center w-12 h-12 cursor-help"
            title={fa.events.verifiedHost}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        )}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 mt-2">
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-sm text-sm font-bold ${badgeColor.bg} ${badgeColor.text}`}>
                <span className="flex-shrink-0">★</span> {event.category?.name ? categoryFa(event.category.name) : fa.events.uncategorized}
              </span>
              {event.gender_restriction === 'female_only' && (
                <span className="inline-flex items-center px-3 py-1 rounded-sm text-sm font-bold bg-pink-100 text-pink-800 border border-pink-200">
                  👩 {fa.events.womenOnly}
                </span>
              )}
              {event.gender_restriction === 'male_only' && (
                <span className="inline-flex items-center px-3 py-1 rounded-sm text-sm font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  👨 {fa.events.menOnly}
                </span>
              )}
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">{event.title}</h1>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                <img src={getAvatarUrl(event.host?.avatar_url, event.host_id)} alt="Host" className="w-full h-full object-cover" />
              </div>
              <p className="text-gray-500 font-medium text-lg">
                {fa.eventDetail.hostedBy} {event.host?.display_name || fa.eventDetail.someone}
              </p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 min-w-[250px]">
            <p className="font-bold text-gray-900 mb-2">{new Date(event.datetime).toLocaleString('fa-IR')}</p>
            <p className="text-gray-600 mb-4">{event.location}</p>
            
            <div className="space-y-3">
              {(currentUserId === event.host_id || currentUserRank === 'administrator' || currentUserRank === 'moderator') && (
                <button onClick={handleBoost} disabled={boosting} className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-800 py-3 rounded-full font-bold transition-colors flex justify-center items-center gap-2">
                  <span>🚀</span> {boosting ? fa.eventDetail.boosting : fa.eventDetail.boostEvent}
                </button>
              )}

              {currentUserId === event.host_id ? (
                <button onClick={handleDeleteEvent} className="w-full bg-red-100 hover:bg-red-200 text-red-700 py-3 rounded-full font-bold transition-colors">
                  {fa.eventDetail.deleteEvent}
                </button>
              ) : (
                <>
                  {userStatus === 'going' ? (
                    <button onClick={() => handleRSVP('none')} className="w-full bg-gray-200 text-gray-800 py-3 rounded-full font-bold transition-colors">
                      {fa.eventDetail.goingCancel}
                    </button>
                  ) : (
                    <button onClick={() => handleRSVP('going')} className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-full font-bold transition-colors shadow-sm">
                      {fa.eventDetail.joinEvent}
                    </button>
                  )}
                  
                  {userStatus !== 'going' && userStatus !== 'interested' && (
                    <button onClick={() => handleRSVP('interested')} className="w-full border-2 border-gray-200 text-gray-700 hover:bg-gray-50 py-3 rounded-full font-bold transition-colors">
                      {fa.eventDetail.interested}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{fa.eventDetail.aboutEvent}</h2>
          <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap italic">"{event.pitch}"</p>
        </div>

        <div className="border-t border-gray-100 pt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{fa.eventDetail.attendees} ({goingCount} / {event.max_attendees || '∞'})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {goingRsvps.map(rsvp => (
              <div key={rsvp.user_id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl relative">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0 overflow-hidden">
                  <img src={getAvatarUrl(rsvp.user?.avatar_url, rsvp.user_id)} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">{rsvp.user.display_name || fa.eventDetail.userFallback}</p>
                  {rsvp.user_id === coordinatorId && (
                    <span className="text-[10px] font-bold text-primary flex items-center gap-0.5 mt-0.5">
                      ★ {fa.eventDetail.eventCoordinator}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {goingCount === 0 && <p className="text-gray-500">{fa.eventDetail.noOneJoined}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
