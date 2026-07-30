import { useEffect, useMemo } from 'react';
import { RangeSlider } from './RangeSlider';
import {
  PERSONALITY_QUESTIONS,
  personalityComplete,
  type PersonalityAnswers,
} from '../../lib/personalityQuestions';
import { fa } from '../../locale/fa';

export type MaritalStatus = 'single' | 'married';

const AGE_DELTA = 15;
const ABS_AGE_MIN = 15;
const ABS_AGE_MAX = 80;

export function eventAgeBounds(userAge: number | null): { min: number; max: number } | null {
  if (userAge == null || userAge < 1) return null;
  return {
    min: Math.max(ABS_AGE_MIN, userAge - AGE_DELTA),
    max: Math.min(ABS_AGE_MAX, userAge + AGE_DELTA),
  };
}

export function clampEventAge(
  range: [number, number],
  userAge: number | null,
): [number, number] {
  const bounds = eventAgeBounds(userAge);
  if (!bounds) return range;
  let lo = Math.min(Math.max(range[0], bounds.min), bounds.max);
  let hi = Math.min(Math.max(range[1], bounds.min), bounds.max);
  if (lo > hi) [lo, hi] = [hi, lo];
  return [lo, hi];
}

type ProfilePreferencesStepProps = {
  userAge: number | null;
  eventAge: [number, number];
  onEventAgeChange: (next: [number, number]) => void;
  introversion: [number, number];
  onIntroversionChange: (next: [number, number]) => void;
  personality: PersonalityAnswers;
  onPersonalityChange: (next: PersonalityAnswers) => void;
};

const INTRO_HINTS = [1, 3, 5, 8, 10] as const;

export function ProfilePreferencesStep({
  userAge,
  eventAge,
  onEventAgeChange,
  introversion,
  onIntroversionChange,
  personality,
  onPersonalityChange,
}: ProfilePreferencesStepProps) {
  const introLabel = (n: number) => {
    const map = fa.profileSetup.introversionMarks as Record<string, string>;
    return map[String(n)] || String(n);
  };

  const labels = fa.profileSetup.personality as Record<string, string>;
  const answered = PERSONALITY_QUESTIONS.filter((q) => personality[q.id]).length;
  const total = PERSONALITY_QUESTIONS.length;
  const bounds = useMemo(() => eventAgeBounds(userAge), [userAge]);

  useEffect(() => {
    if (!bounds) return;
    const next = clampEventAge(eventAge, userAge);
    if (next[0] !== eventAge[0] || next[1] !== eventAge[1]) {
      onEventAgeChange(next);
    }
  }, [bounds, userAge]); // eslint-disable-line react-hooks/exhaustive-deps

  const setAnswer = (questionId: string, optionId: string) => {
    onPersonalityChange({ ...personality, [questionId]: optionId });
  };

  return (
    <div className="space-y-8" dir="rtl">
      <p className="text-center text-lg font-black text-foreground">{fa.profileSetup.step3Fun}</p>

      {/* Event age range */}
      <section className="rounded-2xl border border-border bg-background/60 p-4 sm:p-5">
        <h3 className="text-base font-black text-foreground">
          {fa.profileSetup.eventAgeRange}{' '}
          <span className="text-accent-red">*</span>
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{fa.profileSetup.eventAgeHint}</p>
        <p className="mt-1.5 text-xs font-semibold text-accent-orange">{fa.profileSetup.eventAgeNote}</p>
        {userAge != null && (
          <p className="mt-2 text-xs font-bold text-primary">
            {fa.profileSetup.eventAgeYourAge.replace(
              '{age}',
              userAge.toLocaleString('fa-IR'),
            )}
          </p>
        )}
        <div className="mt-5">
          {!bounds ? (
            <p className="rounded-xl border border-dashed border-border bg-white px-4 py-6 text-center text-sm font-bold text-muted">
              {fa.profileSetup.eventAgeNeedBirth}
            </p>
          ) : (
            <RangeSlider
              min={bounds.min}
              max={bounds.max}
              step={1}
              value={clampEventAge(eventAge, userAge)}
              onChange={(next) => onEventAgeChange(clampEventAge(next, userAge))}
              minLabel={fa.profileSetup.ageYoung}
              maxLabel={fa.profileSetup.ageOlder}
              formatValue={(n) => `${n} ${fa.profileSetup.years}`}
              aria-label={fa.profileSetup.eventAgeRange}
            />
          )}
        </div>
      </section>

      {/* Introversion range */}
      <section className="rounded-2xl border border-border bg-background/60 p-4 sm:p-5">
        <h3 className="text-base font-black text-foreground">
          {fa.profileSetup.introversionRange}{' '}
          <span className="text-accent-red">*</span>
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{fa.profileSetup.introversionHint}</p>
        <div className="mt-5">
          <RangeSlider
            min={1}
            max={10}
            step={1}
            value={introversion}
            onChange={onIntroversionChange}
            minLabel={fa.profileSetup.introversionMarks['1']}
            maxLabel={fa.profileSetup.introversionMarks['10']}
            formatValue={introLabel}
            aria-label={fa.profileSetup.introversionRange}
          />
        </div>
        <ul className="mt-4 space-y-1.5 text-xs text-muted">
          {INTRO_HINTS.map((n) => (
            <li key={n} className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-primary-light text-[10px] font-black text-primary">
                {n}
              </span>
              <span>{fa.profileSetup.introversionMarks[String(n)]}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Personality questions */}
      <section className="space-y-4">
        <div className="rounded-2xl border border-border bg-gradient-to-l from-primary-light/50 to-white p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-foreground">
                {fa.profileSetup.personalityTitle}{' '}
                <span className="text-accent-red">*</span>
              </h3>
              <p className="mt-1 text-sm text-muted">{fa.profileSetup.personalityHint}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                personalityComplete(personality)
                  ? 'bg-emerald-500/15 text-emerald-700'
                  : 'bg-primary-light text-primary'
              }`}
            >
              {fa.profileSetup.personalityProgress
                .replace('{done}', answered.toLocaleString('fa-IR'))
                .replace('{total}', total.toLocaleString('fa-IR'))}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-gradient-to-l from-primary to-accent-purple transition-all duration-500"
              style={{ width: `${(answered / total) * 100}%` }}
            />
          </div>
        </div>

        {PERSONALITY_QUESTIONS.map((q, idx) => {
          const selected = personality[q.id];
          return (
            <article
              key={q.id}
              className={`rounded-2xl border p-4 transition-colors sm:p-5 ${
                selected
                  ? 'border-primary/30 bg-primary-light/20'
                  : 'border-border bg-white'
              }`}
            >
              <p className="text-sm font-black leading-relaxed text-foreground sm:text-base">
                <span className="me-2 inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-primary text-[11px] font-black text-white">
                  {(idx + 1).toLocaleString('fa-IR')}
                </span>
                {labels[q.id]}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {q.options.map((opt) => {
                  const active = selected === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAnswer(q.id, opt.id)}
                      className={`rounded-full px-3.5 py-2 text-sm font-bold transition-all active:scale-95 ${
                        active
                          ? 'bg-primary text-white shadow-md shadow-primary/25'
                          : 'border border-border bg-background text-foreground hover:border-primary hover:bg-primary-light/50'
                      }`}
                    >
                      {labels[opt.labelKey]}
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
