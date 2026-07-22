import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getAvatarUrl } from '../lib/avatars';
import { MapPin } from 'lucide-react';
import { InterestPicker } from '../components/InterestPicker';

type Category = { id: string; name: string; emoji?: string; group_name: string };

export function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Step 1 State
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('');
  const [city, setCity] = useState('');
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [locating, setLocating] = useState(false);
  const [bio, setBio] = useState('');
  const [voteTokens, setVoteTokens] = useState<number>(0);
  
  // Step 2 State (Interests)
  const [highPriorityInterests, setHighPriorityInterests] = useState<string[]>([]);
  const [normalPriorityInterests, setNormalPriorityInterests] = useState<string[]>([]);
  
  const bioWords = bio.trim() ? bio.trim().split(/\s+/) : [];
  const bioWordCount = bioWords.length;

  useEffect(() => {
    async function loadData() {
      // Fetch Categories
      const { data: cats } = await supabase.from('interest_categories').select('id, name, group_name, emoji, tagline').order('name');
      if (cats) setCategories(cats);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch Profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profile) {
        if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
        if (profile.display_name) setDisplayName(profile.display_name);
        if (profile.gender) setGender(profile.gender);
        if (profile.city) setCity(profile.city);
        if (profile.bio) setBio(profile.bio);
        if (profile.vote_tokens !== undefined) setVoteTokens(profile.vote_tokens);
      }

      // Fetch Interests
      const { data: interestsData } = await supabase
          .from('user_interests')
          .select('category_id, priority_level')
          .eq('user_id', user.id);
          
      if (interestsData) {
        setHighPriorityInterests(interestsData.filter(i => i.priority_level === 1).map(i => i.category_id));
        setNormalPriorityInterests(interestsData.filter(i => i.priority_level === 2).map(i => i.category_id));
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleGetLocation = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=10`);
          const data = await res.json();
          if (data && data.address) {
            const detectedCity = data.address.city || data.address.town || data.address.village || data.address.state;
            if (detectedCity) setCity(detectedCity);
          }
        } catch (err) {
          console.error("Reverse geocoding failed", err);
        }
        setLocating(false);
      },
      (error) => {
        console.error(error);
        alert('Unable to retrieve your location. Please enter your city manually.');
        setLocating(false);
      }
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large. Maximum size is 5MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch (err: any) {
      console.error(err);
      alert('Failed to upload image: ' + err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleHighPriorityInterest = (id: string) => {
    setHighPriorityInterests(prev => {
      if (prev.includes(id)) return prev.filter(c => c !== id);
      if (prev.length >= 3) {
        alert("You can only select up to 3 High Priority interests.");
        return prev;
      }
      return [...prev, id];
    });
    // Remove from normal if added to high
    setNormalPriorityInterests(prev => prev.filter(c => c !== id));
  };

  const toggleNormalPriorityInterest = (id: string) => {
    setNormalPriorityInterests(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    // Remove from high if added to normal
    setHighPriorityInterests(prev => prev.filter(c => c !== id));
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (highPriorityInterests.length === 0) {
        throw new Error("Please select at least 1 High Priority interest (max 3).");
      }
      const totalInterests = highPriorityInterests.length + normalPriorityInterests.length;
      if (totalInterests < 5 || totalInterests > 20) {
        throw new Error("Please select between 5 and 20 total interests on Step 2.");
      }
      if (!displayName || !city) {
        throw new Error("Display Name and City are required on Step 1.");
      }

      const locationWKT = coordinates ? `SRID=4326;POINT(${coordinates.lng} ${coordinates.lat})` : undefined;

      const updates: any = {
        display_name: displayName,
        bio: bio,
        city: city,
        gender: gender || null,
        avatar_url: avatarUrl,
        profile_updated_at: new Date().toISOString(),
      };
      if (locationWKT) updates.location = locationWKT;

      const { error: profileError } = await supabase.from('users').update(updates).eq('id', user.id);
      if (profileError) throw profileError;

      // Update interests
      await supabase.from('user_interests').delete().eq('user_id', user.id);
      
      const interestInserts = [
        ...highPriorityInterests.map(id => ({ user_id: user.id, category_id: id, priority_level: 1 })),
        ...normalPriorityInterests.map(id => ({ user_id: user.id, category_id: id, priority_level: 2 }))
      ];

      if (interestInserts.length > 0) {
        const { error: interestsError } = await supabase
          .from('user_interests')
          .insert(interestInserts);
        if (interestsError) throw interestsError;
      }

      navigate('/events');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Loading profile...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-extrabold text-gray-900">Edit Profile</h1>
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1" title="Monthly votes available for new events">
              🎟 {voteTokens}/4 Votes
            </span>
          </div>
          <div className="flex gap-2">
            {[1, 2].map(num => (
              <button
                key={num}
                onClick={() => setStep(num)}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                  step === num ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <div className="space-y-8">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex flex-col items-center sm:items-start sm:flex-row gap-6">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-32 h-32 bg-gray-200 rounded-full flex-shrink-0 overflow-hidden relative border-4 border-white shadow-sm">
                    <img src={avatarUrl || getAvatarUrl('', 'default')} alt="Avatar" className={`w-full h-full object-cover transition-opacity ${uploadingAvatar ? 'opacity-50' : 'group-hover:opacity-75'}`} />
                    {uploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-bold px-2 text-center">Upload Photo</span>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                </div>
                <div className="flex-1 w-full space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Display Name</label>
                    <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Gender (Optional)</label>
                    <select value={gender} onChange={e => setGender(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="">Skip</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non_binary">Non-binary</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Location</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button type="button" onClick={handleGetLocation} disabled={locating} className={`flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold border-2 transition-colors ${coordinates ? 'bg-primary-light border-primary text-primary' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                    <MapPin className={`h-5 w-5 ${coordinates ? 'text-primary' : 'text-gray-500'}`} />
                    {locating ? 'Locating...' : 'Detect Location'}
                  </button>
                  <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="City Name" className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-sm font-bold text-gray-900">In 20 words, what describes you?</label>
                  <span className={`text-sm font-bold flex-shrink-0 ml-4 ${bioWordCount > 20 ? 'text-red-500' : 'text-gray-500'}`}>
                    {bioWordCount}/20 words
                  </span>
                </div>
                <textarea 
                  rows={3} 
                  value={bio} 
                  onChange={e => {
                    const newBio = e.target.value;
                    const words = newBio.trim() ? newBio.trim().split(/\s+/) : [];
                    if (words.length <= 20 || newBio.length < bio.length) {
                      setBio(newBio);
                    }
                  }} 
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 resize-none ${bioWordCount > 20 ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-primary'}`}
                />
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-between items-end mb-4">
                <label className="block text-xl font-bold text-gray-900">What are your interests?</label>
                <span className={`text-sm font-medium ${highPriorityInterests.length + normalPriorityInterests.length >= 5 && highPriorityInterests.length + normalPriorityInterests.length <= 20 ? 'text-primary' : 'text-gray-500'}`}>
                  {highPriorityInterests.length + normalPriorityInterests.length} / 20 selected
                </span>
              </div>
              
              <p className="text-gray-500 mb-6">First, select up to 3 <strong className="text-primary">High Priority</strong> interests. These power our Match Making Engine. Additional selections will be saved as <strong className="text-gray-700">Normal</strong> interests.</p>
              
              <div className="mb-4 bg-primary/10 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-primary-dark">High Priority Favorites</span>
                  <span className="font-mono bg-white px-2 py-1 rounded text-primary-dark font-bold text-sm">
                    {highPriorityInterests.length}/3
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {highPriorityInterests.map(id => {
                    const c = categories.find(cat => cat.id === id);
                    if (!c) return null;
                    return (
                      <button
                        key={`high-${c.id}`}
                        onClick={() => toggleHighPriorityInterest(c.id)}
                        className="px-4 py-2 bg-primary text-white rounded-full text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-primary-dark transition-colors"
                      >
                        {c.emoji} {c.name} <span className="opacity-70">✕</span>
                      </button>
                    );
                  })}
                  {highPriorityInterests.length === 0 && (
                    <span className="text-sm text-primary-dark/70 italic">Select your top 3 from the categories below</span>
                  )}
                </div>
              </div>

              <div className="mb-4 bg-gray-100 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-700">Normal Favorites</span>
                  <span className="font-mono bg-white px-2 py-1 rounded text-gray-700 font-bold text-sm">
                    {normalPriorityInterests.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {normalPriorityInterests.map(id => {
                    const c = categories.find(cat => cat.id === id);
                    if (!c) return null;
                    return (
                      <button
                        key={`normal-${c.id}`}
                        onClick={() => toggleNormalPriorityInterest(c.id)}
                        className="px-3 py-1.5 bg-gray-800 text-white rounded-full text-xs font-medium shadow-sm flex items-center gap-1 hover:bg-gray-900 transition-colors"
                      >
                        {c.emoji} {c.name} <span className="opacity-70">✕</span>
                      </button>
                    );
                  })}
                  {normalPriorityInterests.length === 0 && (
                    <span className="text-sm text-gray-500 italic">Select additional interests</span>
                  )}
                </div>
              </div>
              
              <InterestPicker
                categories={categories}
                selectedInterests={[...highPriorityInterests, ...normalPriorityInterests]}
                maxSelections={20}
                getSelectionTier={(id) =>
                  highPriorityInterests.includes(id) ? 'high' : normalPriorityInterests.includes(id) ? 'normal' : null
                }
                onToggle={(id) => {
                  if (highPriorityInterests.includes(id)) toggleHighPriorityInterest(id);
                  else if (normalPriorityInterests.includes(id)) toggleNormalPriorityInterest(id);
                  else if (highPriorityInterests.length < 3) toggleHighPriorityInterest(id);
                  else toggleNormalPriorityInterest(id);
                }}
              />
            </div>
          )}

          <div className="pt-6 border-t border-gray-100 flex gap-4">
            {step > 1 && (
              <button type="button" onClick={() => setStep(s => s - 1)} className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full font-bold transition-colors">
                Back
              </button>
            )}
            {step < 2 ? (
              <button type="button" onClick={() => setStep(s => s + 1)} className="flex-[2] bg-primary hover:bg-primary-dark text-white py-4 rounded-full font-bold transition-colors shadow-sm">
                Next
              </button>
            ) : (
              <button type="button" onClick={handleSave} disabled={saving} className="flex-[2] bg-primary hover:bg-primary-dark text-white py-4 rounded-full font-bold transition-colors shadow-sm disabled:opacity-50">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
