import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  gregorianToJalali,
  isoFromJalali,
  jalaliFromIso,
  jalaliMonthLength,
  jalaliToGregorian,
} from '../../lib/jalali';
import { fa } from '../../locale/fa';

type BirthDatePickerProps = {
  value: string;
  onChange: (next: string) => void;
};

const MIN_YEAR = 1320;
const MAX_YEAR = 1388;
const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const; // Sat → Fri

function ageFromIso(iso: string) {
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !n)) return null;
  const [y, m, d] = parts;
  const today = new Date();
  let age = today.getFullYear() - y;
  const md = today.getMonth() + 1 - m;
  if (md < 0 || (md === 0 && today.getDate() < d)) age -= 1;
  return age >= 0 ? age : null;
}

/** Saturday-first weekday index for a Jalali date */
function jalaliWeekdaySat0(jy: number, jm: number, jd: number) {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  const jsDay = new Date(gy, gm - 1, gd).getDay(); // 0=Sun
  return (jsDay + 1) % 7; // 0=Sat
}

export function BirthDatePicker({ value, onChange }: BirthDatePickerProps) {
  const todayJ = useMemo(() => {
    const n = new Date();
    return gregorianToJalali(n.getFullYear(), n.getMonth() + 1, n.getDate());
  }, []);

  const selected = value ? jalaliFromIso(value) : null;

  const [viewYear, setViewYear] = useState(() => {
    if (selected) return Math.min(MAX_YEAR, Math.max(MIN_YEAR, selected[0]));
    return Math.min(MAX_YEAR, Math.max(MIN_YEAR, todayJ[0] - 20));
  });
  const [viewMonth, setViewMonth] = useState(() => selected?.[1] ?? 1);

  useEffect(() => {
    if (!selected) return;
    setViewYear(Math.min(MAX_YEAR, Math.max(MIN_YEAR, selected[0])));
    setViewMonth(selected[1]);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const daysInView = jalaliMonthLength(viewYear, viewMonth);
  const startPad = jalaliWeekdaySat0(viewYear, viewMonth, 1);

  const canPrev =
    viewYear > MIN_YEAR || (viewYear === MIN_YEAR && viewMonth > 1);
  const canNext =
    viewYear < MAX_YEAR || (viewYear === MAX_YEAR && viewMonth < 12);

  const goPrev = () => {
    if (!canPrev) return;
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else setViewMonth((m) => m - 1);
  };

  const goNext = () => {
    if (!canNext) return;
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else setViewMonth((m) => m + 1);
  };

  const pickDay = (day: number) => {
    onChange(isoFromJalali(viewYear, viewMonth, day));
  };

  const age = value ? ageFromIso(value) : null;
  const months = fa.profileSetup.birthMonths;

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = MAX_YEAR; y >= MIN_YEAR; y -= 1) list.push(y);
    return list;
  }, []);

  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold">
        {fa.profileSetup.birthDate} <span className="text-accent-red">*</span>
      </label>

      <div className="mx-auto w-full max-w-[23rem] overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="flex items-center gap-2 bg-gradient-to-l from-primary via-primary-mid to-accent-purple px-3 py-2.5 text-white">
          <span className="text-lg leading-none" aria-hidden>
            🎂
          </span>
          <p className="min-w-0 flex-1 truncate text-xs font-black sm:text-sm">
            {fa.profileSetup.birthDate}
          </p>
          {selected && (
            <span className="rounded-lg bg-white/20 px-2 py-1 text-xs font-black tabular-nums">
              {selected[2].toLocaleString('fa-IR')} {months[selected[1] - 1]}
            </span>
          )}
        </div>

        <div className="space-y-2 p-2.5 sm:p-3" dir="rtl">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background disabled:opacity-30"
              aria-label={fa.profileSetup.birthNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="max-w-[7rem] truncate rounded-lg border border-border bg-background px-1.5 py-1.5 text-xs font-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label={fa.profileSetup.birthMonth}
              >
                {months.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-1.5 py-1.5 text-xs font-black tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label={fa.profileSetup.birthYear}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y.toLocaleString('fa-IR')}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={goPrev}
              disabled={!canPrev}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background disabled:opacity-30"
              aria-label={fa.profileSetup.birthPrevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1 text-center text-[10px] font-black text-muted">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: startPad }).map((_, i) => (
              <div key={`pad-${i}`} className="h-9" />
            ))}
            {Array.from({ length: daysInView }, (_, i) => i + 1).map((day) => {
              const isSelected =
                !!selected &&
                selected[0] === viewYear &&
                selected[1] === viewMonth &&
                selected[2] === day;
              const isToday =
                todayJ[0] === viewYear &&
                todayJ[1] === viewMonth &&
                todayJ[2] === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => pickDay(day)}
                  className={`flex h-9 items-center justify-center rounded-lg text-xs font-black tabular-nums transition-colors sm:text-sm ${
                    isSelected
                      ? 'bg-gradient-to-br from-primary to-accent-purple text-white shadow-md shadow-primary/25'
                      : isToday
                        ? 'bg-primary-light text-primary'
                        : 'text-foreground hover:bg-primary-light/70'
                  }`}
                >
                  {day.toLocaleString('fa-IR')}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selected && age != null ? (
        <p className="mt-2 text-center text-sm font-bold text-primary">
          {fa.profileSetup.birthAgePreview.replace('{age}', age.toLocaleString('fa-IR'))}
        </p>
      ) : (
        <p className="mt-2 text-center text-xs font-semibold text-muted">
          {fa.profileSetup.birthIncomplete}
        </p>
      )}
    </div>
  );
}
