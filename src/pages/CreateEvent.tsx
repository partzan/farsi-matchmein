import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCategoryColor } from '../lib/colors';
import { InterestPicker } from '../components/InterestPicker';
import { fa } from '../locale/fa';
import { categoryFa } from '../locale/categoriesFa';

type Category = { id: string; name: string; emoji?: string; group_name?: string };

export function CreateEvent() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [city, setCity] = useState('');
  const [targetedInterests, setTargetedInterests] = useState<string[]>([]);
  const [pitch, setPitch] = useState('');
  const [genderRestriction, setGenderRestriction] = useState('everyone');

  // 10-word limit logic
  const pitchWords = pitch.trim() ? pitch.trim().split(/\s+/) : [];
  const wordCount = pitchWords.length;

  useEffect(() => {
    async function checkAccess() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
        return;
      }
      
      const { data } = await supabase.from('users').select('rank').eq('id', session.user.id).single();
      if (!data || data.rank !== 'administrator') {
        navigate('/');
      }
    }
    
    checkAccess();
    
    supabase.from('interest_categories').select('*').order('name').then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  const handleNext = () => {
    if (step === 3 && targetedInterests.length !== 3) {
      setError(fa.createEvent.errorExactly3);
      return;
    }
    setError(null);
    setStep(s => s + 1);
  };
  const handleBack = () => setStep(s => s - 1);

  const toggleTargetedInterest = (id: string) => {
    if (targetedInterests.includes(id)) {
      setTargetedInterests(prev => prev.filter(i => i !== id));
    } else if (targetedInterests.length < 3) {
      setTargetedInterests(prev => [...prev, id]);
    }
  };

  const handlePublish = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(fa.createEvent.mustLoginError);

      const selectedCategory = categories.find(c => c.id === categoryId);
      const generatedTitle = `${selectedCategory?.name || 'Event'} in ${city}`;

      const { data, error: insertError } = await supabase
        .from('events')
        .insert({
          host_id: user.id,
          title: generatedTitle,
          pitch,
          category_id: categoryId,
          location: city, // Storing city as location
          datetime: new Date(`${date}T${time}`).toISOString(),
          targeted_interest_ids: targetedInterests.length === 3 ? targetedInterests : null,
          gender_restriction: genderRestriction,
          status: 'voting',
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      // Match Making Engine Trigger
      if (data && data.id) {
        await supabase.rpc('compute_event_matches', { new_event_id: data.id });
      }

      // RSVP the host
      await supabase.from('event_rsvps').insert({
        event_id: data.id,
        user_id: user.id,
        status: 'going'
      });

      navigate(`/event/${data.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || fa.createEvent.publishFailedError);
      setLoading(false);
    }
  };

  const getStepIndicator = () => {
    if (step === 5) return fa.createEvent.stepReview;
    return `${fa.createEvent.stepPrefix} ${step} ${fa.createEvent.stepOf}`;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">{fa.createEvent.title}</h1>
          <span className="text-primary font-bold bg-primary-light px-3 py-1 rounded-full text-sm">
            {getStepIndicator()}
          </span>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <div className="space-y-6">
          {/* Frame 1: Category */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <label className="block text-xl font-bold text-gray-900 mb-4">{fa.createEvent.chooseCategory}</label>
              <p className="text-gray-500 text-sm mb-4">{fa.createEvent.categoryHint}</p>
              <InterestPicker
                categories={categories}
                selectedInterests={categoryId ? [categoryId] : []}
                maxSelections={1}
                onToggle={(id) => setCategoryId(categoryId === id ? '' : id)}
              />
            </div>
          )}

          {/* Frame 2: When & Where */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">{fa.createEvent.dateLabel}</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">{fa.createEvent.timeLabel}</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">{fa.createEvent.cityLabel}</label>
                <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder={fa.createEvent.cityPlaceholder} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all" required />
              </div>
            </div>
          )}

          {/* Frame 3: Audience Preference */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="animate-in fade-in slide-in-from-top-2">
                  <div className="mb-6">
                    <label className="block text-xl font-bold text-gray-900 mb-2">{fa.createEvent.genderRestriction}</label>
                    <select 
                      value={genderRestriction}
                      onChange={e => setGenderRestriction(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all font-bold"
                    >
                      <option value="everyone">{fa.createEvent.everyone}</option>
                      <option value="female_only">👩 {fa.events.womenOnly}</option>
                      <option value="male_only">👨 {fa.events.menOnly}</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <label className="block text-xl font-bold text-gray-900">{fa.createEvent.targetAudience}</label>
                      <p className="text-gray-500 mt-1">{fa.createEvent.audienceHint}</p>
                    </div>
                    <span className={`text-sm font-bold ${targetedInterests.length === 3 ? 'text-primary' : 'text-gray-500'}`}>
                      {targetedInterests.length} / 3 {fa.createEvent.selected}
                    </span>
                  </div>
                  
                  {targetedInterests.length > 0 && (
                    <div className="mb-4 bg-primary/10 rounded-xl p-4 flex flex-wrap gap-2">
                      {targetedInterests.map(id => {
                        const c = categories.find(cat => cat.id === id);
                        if (!c) return null;
                        return (
                          <button
                            key={`target-${c.id}`}
                            onClick={() => toggleTargetedInterest(c.id)}
                            className="px-4 py-2 bg-primary text-white rounded-full text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-primary-dark transition-colors"
                          >
                            {c.emoji} {categoryFa(c.name)} <span className="opacity-70">✕</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <InterestPicker
                    categories={categories}
                    selectedInterests={targetedInterests}
                    maxSelections={3}
                    onToggle={toggleTargetedInterest}
                  />
                </div>
            </div>
          )}

          {/* Frame 4: Pitch */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-sm font-bold text-gray-900">{fa.createEvent.pitchLabel}</label>
                  <span className={`text-sm font-bold flex-shrink-0 ms-4 ${wordCount > 10 ? 'text-red-500' : wordCount === 10 ? 'text-primary' : 'text-gray-500'}`}>
                    {wordCount}/10 {fa.createEvent.words}
                  </span>
                </div>
                <textarea 
                  rows={4} 
                  value={pitch} 
                  onChange={e => {
                    const newPitch = e.target.value;
                    const words = newPitch.trim() ? newPitch.trim().split(/\s+/) : [];
                    if (words.length <= 10 || newPitch.length < pitch.length) {
                      setPitch(newPitch);
                    }
                  }} 
                  placeholder={fa.createEvent.pitchPlaceholder} 
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 transition-all resize-none ${
                    wordCount > 10 ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-primary'
                  }`}
                  required 
                />
              </div>
            </div>
          )}

          {/* Frame 5: Review */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <h2 className="text-xl font-extrabold text-gray-900">{fa.createEvent.reviewTitle}</h2>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div className="mb-4">
                  {(() => {
                    const catName = categories.find(c => c.id === categoryId)?.name || 'Event';
                    const color = getCategoryColor(catName);
                    return (
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-sm text-sm font-bold ${color.bg} ${color.text}`}>
                        <span className="flex-shrink-0">★</span> {categoryFa(catName)}
                      </span>
                    );
                  })()}
                </div>
                <h3 className="font-extrabold text-2xl text-gray-900 mb-2">
                  {categories.find(c => c.id === categoryId)?.name || 'Event'} in {city}
                </h3>
                <p className="text-gray-500 font-bold mb-4">
                  {date && time ? new Date(`${date}T${time}`).toLocaleString('fa-IR') : fa.createEvent.noDateSet}
                </p>
                <p className="text-gray-700 mb-4 whitespace-pre-wrap text-lg leading-relaxed italic">"{pitch}"</p>
                
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-bold text-gray-600 mb-2">{fa.createEvent.audienceTargeting}</p>
                  {targetedInterests.length === 3 ? (
                    <div className="flex flex-wrap gap-2">
                      {targetedInterests.map(id => {
                        const cat = categories.find(c => c.id === id);
                        const color = getCategoryColor(cat?.name || '');
                        return (
                          <span key={id} className={`px-2 py-1 rounded-sm text-xs font-bold ${color.bg} ${color.text}`}>
                            {categoryFa(cat?.name)}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-red-500">{fa.createEvent.mustSelect3}</p>
                  )}
                  
                  <p className="text-sm font-bold text-gray-600 mt-4 mb-2">{fa.createEvent.genderRestriction}:</p>
                  <p className="text-gray-900 font-bold">
                    {genderRestriction === 'everyone' ? fa.createEvent.everyone : genderRestriction === 'female_only' ? `👩 ${fa.events.womenOnly}` : `👨 ${fa.events.menOnly}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-gray-100 flex gap-4">
            {step > 1 && (
              <button type="button" onClick={handleBack} className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full font-bold transition-colors">
                {fa.interestPicker.back}
              </button>
            )}
            {step < 5 ? (
              <button 
                type="button" 
                onClick={handleNext}
                disabled={
                  (step === 1 && !categoryId) || 
                  (step === 2 && (!date || !time || !city)) ||
                  (step === 3 && targetedInterests.length !== 3) ||
                  (step === 4 && (!pitch.trim() || wordCount > 10))
                }
                className="flex-[2] bg-primary hover:bg-primary-dark text-white py-4 rounded-full font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {fa.createEvent.continueBtn}
              </button>
            ) : (
              <button 
                type="button" 
                onClick={handlePublish}
                disabled={loading}
                className="flex-[2] bg-primary hover:bg-primary-dark text-white py-4 rounded-full font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? fa.createEvent.publishing : fa.createEvent.publishEvent}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
