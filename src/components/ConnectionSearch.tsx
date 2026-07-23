import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getAvatarUrl } from '../lib/avatars';
import { fa } from '../locale/fa';
import { categoryFa } from '../locale/categoriesFa';

export function ConnectionSearch({ currentUserId }: { currentUserId: string }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  
  // Filters
  const [city, setCity] = useState('');
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [events, setEvents] = useState<{id: string, title: string}[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  useEffect(() => {
    // Load filter options
    supabase.from('interest_categories').select('id, name').order('name').then(({data}) => {
      if (data) setCategories(data);
    });
    supabase.from('events').select('id, title').gte('datetime', new Date().toISOString()).then(({data}) => {
      if (data) setEvents(data);
    });
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      let query = supabase.from('users').select(`
        id, display_name, city, avatar_url, bio,
        user_interests!inner(category_id)
      `);

      // We only want to see OTHER people
      query = query.neq('id', currentUserId);

      // Apply City filter
      if (city.trim()) {
        query = query.ilike('city', `%${city.trim()}%`);
      }

      // Apply Interests filter
      if (selectedInterests.length > 0) {
        query = query.in('user_interests.category_id', selectedInterests);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by Event Participation (client side or requires another query if doing inner joins on both)
      let finalResults = data || [];

      if (selectedEventId) {
        // Find which of these users RSVP'd to the event
        const userIds = finalResults.map(u => u.id);
        if (userIds.length > 0) {
          const { data: rsvps } = await supabase
            .from('event_rsvps')
            .select('user_id')
            .eq('event_id', selectedEventId)
            .in('user_id', userIds);
            
          const rsvpUserIds = new Set((rsvps || []).map(r => r.user_id));
          finalResults = finalResults.filter(u => rsvpUserIds.has(u.id));
        }
      }

      // De-duplicate if the inner join created multiples
      const uniqueUsers = Array.from(new Map(finalResults.map(item => [item.id, item])).values());
      setResults(uniqueUsers);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (userId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.textContent = fa.connectionSearch.requestSent;
    e.currentTarget.disabled = true;
    e.currentTarget.className = "w-full py-2 bg-primary-light text-primary rounded-xl font-bold transition-colors mt-4";
    
    await supabase.from('connections').insert({
      requester_id: currentUserId,
      recipient_id: userId,
      status: 'pending'
    });
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-extrabold text-gray-900 mb-6">{fa.connectionSearch.title}</h2>
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{fa.connectionSearch.locationLabel}</label>
            <input 
              type="text" 
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder={fa.connectionSearch.cityPlaceholder} 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{fa.connectionSearch.interestLabel}</label>
            <select 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              onChange={(e) => {
                const val = e.target.value;
                setSelectedInterests(val ? [val] : []);
              }}
            >
              <option value="">{fa.connectionSearch.anyInterest}</option>
              {categories.map(c => <option key={c.id} value={c.id}>{categoryFa(c.name)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{fa.connectionSearch.eventLabel}</label>
            <select 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
            >
              <option value="">{fa.connectionSearch.anyEvent}</option>
              {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button type="submit" className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-full transition-colors shadow-sm">
              {loading ? fa.connectionSearch.searching : fa.connectionSearch.findPeople}
            </button>
          </div>
        </form>
      </div>

      <div>
        {results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map(user => (
              <div key={user.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full flex-shrink-0 overflow-hidden bg-gray-100">
                    <img src={getAvatarUrl(user.avatar_url, user.id)} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-gray-900 truncate">{user.display_name || fa.connectionSearch.anonymous}</h3>
                    <p className="text-gray-500 text-sm truncate">{user.city || fa.connectionSearch.unknownLocation}</p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-1">
                  {user.bio || fa.connectionSearch.noBio}
                </p>
                <button 
                  onClick={(e) => handleConnect(user.id, e)}
                  className="w-full py-2 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors mt-auto"
                >
                  {fa.connectionSearch.connect}
                </button>
              </div>
            ))}
          </div>
        ) : !loading && (
          <div className="text-center py-20 text-gray-500 font-medium">
            {fa.connectionSearch.adjustFilters}
          </div>
        )}
      </div>
    </div>
  );
}
