import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getAvatarUrl } from '../lib/avatars';
import { Check, X } from 'lucide-react';

type ConnectionRequest = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined';
  event_id?: string;
  other_user: {
    id: string;
    display_name: string;
    avatar_url: string;
    city: string;
  };
  event?: {
    id: string;
    title: string;
    datetime: string;
  };
};

export function Connections() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConnections() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      setCurrentUserId(session.user.id);

      // Fetch pending requests where user is recipient
      const { data: incomingData, error: inError } = await supabase
        .from('connections')
        .select(`
          id, requester_id, recipient_id, status, event_id,
          other_user:users!connections_requester_id_fkey(id, display_name, avatar_url, city),
          event:events(id, title, datetime)
        `)
        .eq('recipient_id', session.user.id)
        .eq('status', 'pending');

      // Fetch accepted connections
      const { data: acceptedData, error: accError } = await supabase
        .from('connections')
        .select(`
          id, requester_id, recipient_id, status, event_id,
          requester:users!connections_requester_id_fkey(id, display_name, avatar_url, city),
          recipient:users!connections_recipient_id_fkey(id, display_name, avatar_url, city),
          event:events(id, title, datetime)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`);

      if (!inError && !accError) {
        // Format accepted connections
        const formattedAccepted = (acceptedData || []).map((conn: any) => {
          const isRequester = conn.requester_id === session.user.id;
          const otherUser = isRequester ? conn.recipient : conn.requester;
          return {
            id: conn.id,
            requester_id: conn.requester_id,
            recipient_id: conn.recipient_id,
            status: conn.status,
            event_id: conn.event_id,
            other_user: otherUser,
            event: conn.event
          };
        });

        setRequests([...(incomingData || []), ...formattedAccepted] as ConnectionRequest[]);
      }
      setLoading(false);
    }

    fetchConnections();
  }, []);

  const handleAccept = async (id: string) => {
    await supabase.from('connections').update({ status: 'accepted' }).eq('id', id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'accepted' } : r));
  };

  const handleDecline = async (id: string) => {
    await supabase.from('connections').update({ status: 'declined' }).eq('id', id);
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-500 font-bold flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      Loading connections...
    </div>;
  }

  if (!currentUserId) {
    return <div className="text-center py-20 text-gray-500 font-bold">Please sign in to view connections.</div>;
  }

  const pending = requests.filter(r => r.status === 'pending');
  const accepted = requests.filter(r => r.status === 'accepted');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Connections</h1>
      
      {pending.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Pending Requests ({pending.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pending.map(req => (
              <div key={req.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src={getAvatarUrl(req.other_user.avatar_url, req.other_user.id)} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{req.other_user.display_name || 'Anonymous'}</h3>
                    <p className="text-sm text-gray-500 truncate">{req.other_user.city || 'No location'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleDecline(req.id)} className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors" title="Decline">
                      <X className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleAccept(req.id)} className="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center hover:bg-primary/20 transition-colors" title="Accept">
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                {req.event && (
                  <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 flex items-center gap-2">
                    <span className="text-xl">🎟️</span>
                    <div>
                      <p className="text-xs font-bold text-primary uppercase">Event Invitation</p>
                      <p className="text-sm font-medium text-gray-900">{req.event.title}</p>
                      <p className="text-xs text-gray-500">{new Date(req.event.datetime).toLocaleDateString()} at {new Date(req.event.datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your Connections ({accepted.length})</h2>
        {accepted.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="text-4xl mb-4">👋</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No connections yet</h3>
            <p className="text-gray-500 mb-6">Start discovering people in your area to connect with!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accepted.map(req => (
              <div key={req.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src={getAvatarUrl(req.other_user.avatar_url, req.other_user.id)} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{req.other_user.display_name || 'Anonymous'}</h3>
                    <p className="text-sm text-gray-500 truncate">{req.other_user.city || 'No location'}</p>
                  </div>
                  <div className="bg-primary-light text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20">
                    Connected
                  </div>
                </div>
                {req.event && (
                  <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 flex items-center gap-2">
                    <span className="text-xl">🎟️</span>
                    <div>
                      <p className="text-xs font-bold text-primary uppercase">Going Together</p>
                      <p className="text-sm font-medium text-gray-900">{req.event.title}</p>
                      <p className="text-xs text-gray-500">{new Date(req.event.datetime).toLocaleDateString()} at {new Date(req.event.datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
