import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MapPin } from 'lucide-react';
import { InterestPicker } from '../components/InterestPicker';
import { fa } from '../locale/fa';

type Category = {
  id: string;
  name: string;
};

export function Onboarding() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);

  const [gender, setGender] = useState('');
  const [preferredGenders, setPreferredGenders] = useState<string[]>(['everyone']);
  const [preferredTimeSlots, setPreferredTimeSlots] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>(['friends']);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    async function fetchData() {
      // Fetch Categories
      const { data: cats } = await supabase.from('interest_categories').select('id, name, group_name, emoji, tagline').order('name');
      if (cats) setCategories(cats);

      // Fetch User
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch Profile Data
      const { data: profile } = await supabase.from('users').select('display_name, bio, city, gender, preferred_genders, preferred_time_slots, looking_for').eq('id', user.id).single();
      if (profile) {
        if (profile.display_name) setDisplayName(profile.display_name);
        if (profile.bio) setBio(profile.bio);
        if (profile.city) setCity(profile.city);
        if (profile.gender) setGender(profile.gender);
        if (profile.preferred_genders) setPreferredGenders(profile.preferred_genders);
        if (profile.preferred_time_slots) setPreferredTimeSlots(profile.preferred_time_slots);
        if (profile.looking_for) setLookingFor(profile.looking_for);
      }

      // Fetch existing interests
      const { data: interests } = await supabase.from('user_interests').select('category_id').eq('user_id', user.id);
      if (interests) {
        setSelectedInterests(interests.map(i => i.category_id));
      }
    }
    fetchData();
  }, []);

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev => 
      prev.includes(id) 
        ? prev.filter(catId => catId !== id)
        : [...prev, id]
    );
  };

  const handleGetLocation = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      setError(fa.onboarding.errors.geoNotSupported);
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=10`);
          const data = await res.json();
          if (data && data.address) {
            const detectedCity = data.address.city || data.address.town || data.address.village || data.address.state;
            if (detectedCity) {
              setCity(detectedCity);
            }
          }
        } catch (err) {
          console.error("Reverse geocoding failed", err);
        }

        setLocating(false);
      },
      (error) => {
        console.error(error);
        setError(fa.onboarding.errors.geoFailed);
        setLocating(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (selectedInterests.length < 5 || selectedInterests.length > 15) {
      setError(fa.onboarding.errors.interestsRange);
      setIsLoading(false);
      return;
    }

    if (!displayName || !city) {
      setError(fa.onboarding.errors.requiredFields);
      setIsLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(fa.onboarding.errors.notLoggedIn);

      // Format location for PostGIS if we have coordinates
      const locationWKT = coordinates ? `SRID=4326;POINT(${coordinates.lng} ${coordinates.lat})` : null;

      // 1. Update user profile
      const { error: profileError } = await supabase
        .from('users')
        .update({
          display_name: displayName,
          bio: bio,
          city: city,
          gender: gender || null,
          preferred_genders: preferredGenders,
          preferred_time_slots: preferredTimeSlots,
          looking_for: lookingFor,
          profile_updated_at: new Date().toISOString(),
          ...(locationWKT ? { location: locationWKT } : {})
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Insert user interests
      const interestRows = selectedInterests.map(categoryId => ({
        user_id: user.id,
        category_id: categoryId
      }));

      // Delete existing just in case (e.g. if they redo onboarding)
      await supabase.from('user_interests').delete().eq('user_id', user.id);
      
      const { error: interestsError } = await supabase
        .from('user_interests')
        .insert(interestRows);

      if (interestsError) throw interestsError;

      // 3. Trigger Edge Function to generate embedding (fire-and-forget)
      supabase.functions.invoke('generate-embedding', {
        body: { user_id: user.id }
      }).catch(console.error);

      // 4. Redirect to Discover
      navigate('/discover');
    } catch (err: any) {
      console.error(err);
      setError(err.message || fa.onboarding.errors.genericFail);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
          {fa.onboarding.title}
        </h1>
        <p className="text-lg text-gray-600">
          {fa.onboarding.subtitle}
        </p>
      </div>

      <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        <form className="space-y-8" onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">{fa.onboarding.displayName}</label>
              <input 
                type="text" 
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder={fa.onboarding.displayNamePlaceholder}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">{fa.onboarding.shortBio}</label>
              <textarea 
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                placeholder={fa.onboarding.bioPlaceholder}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
              />
            </div>
          </div>

          {/* Location */}
          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-bold text-gray-900 mb-2">{fa.onboarding.basedWhere}</label>
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locating || !!coordinates}
                className={`flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold border-2 transition-colors ${
                  coordinates 
                    ? 'bg-primary-light border-primary text-primary' 
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <MapPin className={`h-5 w-5 ${coordinates ? 'text-primary' : 'text-gray-500'}`} />
                {locating ? fa.common.locating : coordinates ? fa.onboarding.locationSavedButton : fa.common.detectLocation}
              </button>
              <input 
                type="text" 
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder={fa.onboarding.cityPlaceholder}
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
            </div>
            <p className="text-sm text-gray-500">
              {coordinates ? fa.onboarding.locationSaved : fa.onboarding.detectHint}
            </p>
          </div>

          {/* Interests */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex justify-between items-end mb-3">
              <label className="block text-sm font-bold text-gray-900">{fa.onboarding.interestsTitle}</label>
              <span className={`text-sm font-medium ${selectedInterests.length >= 5 && selectedInterests.length <= 15 ? 'text-primary' : 'text-gray-500'}`}>
                {selectedInterests.length} / 15 {fa.onboarding.selected}
              </span>
            </div>
            
            <InterestPicker 
              categories={categories} 
              selectedInterests={selectedInterests} 
              onToggle={toggleInterest} 
              maxSelections={15} 
            />
            <p className="mt-3 text-sm text-gray-500">{fa.onboarding.interestsHint}</p>
          </div>

          {/* Match Preferences */}
          <div className="pt-8 border-t border-gray-100">
            <h2 className="text-xl font-extrabold text-gray-900 mb-6">{fa.onboarding.matchPreferences}</h2>
            
            <div className="space-y-6">
              {/* Gender */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">{fa.onboarding.myGender} <span className="text-gray-400 font-normal">{fa.common.optional}</span></label>
                <select 
                  value={gender} 
                  onChange={e => setGender(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                >
                  <option value="">{fa.common.skip}</option>
                  <option value="male">{fa.common.male}</option>
                  <option value="female">{fa.common.female}</option>
                  <option value="non_binary">{fa.common.nonBinary}</option>
                  <option value="prefer_not_to_say">{fa.common.preferNotToSay}</option>
                </select>
              </div>

              {/* Show me */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">{fa.onboarding.showMe}</label>
                <div className="flex flex-wrap gap-2">
                  {['everyone', 'male', 'female', 'non_binary'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        if (opt === 'everyone') {
                          setPreferredGenders(['everyone']);
                        } else {
                          let next = preferredGenders.filter(g => g !== 'everyone');
                          if (next.includes(opt)) next = next.filter(g => g !== opt);
                          else next = [...next, opt];
                          if (next.length === 0) next = ['everyone'];
                          setPreferredGenders(next);
                        }
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors ${
                        preferredGenders.includes(opt)
                          ? 'bg-primary border-primary text-white' 
                          : 'bg-white border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {opt === 'everyone' ? fa.common.everyone : opt === 'male' ? fa.common.male : opt === 'female' ? fa.common.female : fa.common.nonBinary}
                    </button>
                  ))}
                </div>
              </div>

              {/* When are you usually free? */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">{fa.onboarding.freeTime} <span className="text-gray-400 font-normal">{fa.common.optional}</span></label>
                <div className="flex flex-wrap gap-2">
                  {[
                    {id: 'weekday_morning', label: fa.onboarding.weekdayMornings},
                    {id: 'weekday_afternoon', label: fa.onboarding.weekdayAfternoons},
                    {id: 'weekday_evening', label: fa.onboarding.weekdayEvenings},
                    {id: 'weekend', label: fa.onboarding.weekends}
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setPreferredTimeSlots(prev => prev.includes(opt.id) ? prev.filter(t => t !== opt.id) : [...prev, opt.id]);
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors ${
                        preferredTimeSlots.includes(opt.id)
                          ? 'bg-primary border-primary text-white' 
                          : 'bg-white border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* What are you looking for? */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">{fa.onboarding.lookingFor}</label>
                <div className="flex flex-wrap gap-2">
                  {['friends', 'events', 'dating'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setLookingFor(prev => {
                          const next = prev.includes(opt) ? prev.filter(l => l !== opt) : [...prev, opt];
                          return next.length === 0 ? prev : next;
                        });
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors ${
                        lookingFor.includes(opt)
                          ? 'bg-primary border-primary text-white' 
                          : 'bg-white border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {opt === 'friends' ? fa.onboarding.friends : opt === 'events' ? fa.onboarding.eventsOption : fa.onboarding.dating}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100">
            <button 
              type="submit" 
              disabled={isLoading || selectedInterests.length < 3}
              className="w-full bg-primary hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-full font-bold text-lg transition-colors shadow-sm"
            >
              {isLoading ? fa.onboarding.saving : fa.onboarding.saveContinue}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
