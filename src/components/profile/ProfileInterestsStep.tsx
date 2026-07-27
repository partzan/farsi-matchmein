import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import {
  BROAD_INTERESTS,
  MAX_BROAD,
  MAX_SPECIFIC,
  categoriesForNames,
  isAllowedInterestName,
  section2AccordionRows,
  type BroadInterest,
} from '../../lib/broadInterests';
import type { Category } from '../../lib/interestTree';
import { fa } from '../../locale/fa';
import { categoryFa } from '../../locale/categoriesFa';

type Props = {
  categories: Category[];
  broadIds: string[];
  specificIds: string[];
  onToggleBroad: (id: string) => void;
  onToggleSpecific: (id: string) => void;
};

/** White → green (mid) → red (near max). Shakes when nearly full. */
function PickMeter({ current, max }: { current: number; max: number }) {
  const ratio = max <= 0 ? 0 : Math.min(1, current / max);
  const pct = Math.round(ratio * 100);

  let fill = 'rgb(229, 231, 235)';
  if (ratio <= 0) {
    fill = 'transparent';
  } else if (ratio <= 0.5) {
    const t = ratio / 0.5;
    fill = `rgb(${Math.round(245 + (34 - 245) * t)}, ${Math.round(245 + (197 - 245) * t)}, ${Math.round(245 + (94 - 245) * t)})`;
  } else {
    const t = (ratio - 0.5) / 0.5;
    fill = `rgb(${Math.round(34 + (239 - 34) * t)}, ${Math.round(197 + (68 - 197) * t)}, ${Math.round(94 + (68 - 94) * t)})`;
  }

  const shaky = ratio >= 0.75;

  return (
    <div className={`w-full min-w-[7rem] max-w-[11rem] shrink-0 ${shaky ? 'animate-pick-shake' : ''}`}>
      <div className="mb-1 flex items-center justify-end gap-2">
        <span
          className={`text-xs font-black tabular-nums ${
            ratio >= 0.75 ? 'text-accent-red' : ratio >= 0.35 ? 'text-emerald-700' : 'text-muted'
          }`}
        >
          {current}/{max}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 ring-1 ring-border/60">
        <div
          className="h-full rounded-full transition-all duration-400 ease-out"
          style={{ width: `${pct}%`, backgroundColor: fill }}
        />
      </div>
    </div>
  );
}

/** Sticks under the navbar until the next section's header replaces it. */
function SectionStickyHeader({
  title,
  hint,
  current,
  max,
}: {
  title: string;
  hint: string;
  current: number;
  max: number;
}) {
  return (
    <div className="sticky top-[5rem] z-20 -mx-5 mb-4 border-b border-border bg-white/95 px-5 py-3 backdrop-blur-md sm:-mx-8 sm:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-black text-foreground sm:text-xl">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">{hint}</p>
        </div>
        <PickMeter current={current} max={max} />
      </div>
    </div>
  );
}

function CategoryCard({
  opt,
  selected,
  disabled,
  onToggle,
}: {
  opt: BroadInterest;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={`group relative flex h-full min-h-[6.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 text-center transition-all duration-200 active:scale-[0.97] sm:min-h-[7.25rem] sm:rounded-3xl sm:p-4 ${
        selected
          ? `border-transparent bg-gradient-to-br ${opt.gradient} text-white shadow-lg`
          : 'border-border bg-white text-foreground hover:-translate-y-0.5 hover:border-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0'
      }`}
    >
      {selected && (
        <span className="absolute -top-2 -start-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-primary shadow-md sm:h-7 sm:w-7">
          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={3.5} />
        </span>
      )}
      <span
        className={`text-3xl transition-transform duration-200 sm:text-4xl ${
          selected ? 'scale-110' : 'group-hover:scale-110'
        }`}
      >
        {opt.emoji}
      </span>
      <span className="text-xs font-black leading-snug sm:text-sm">{opt.label}</span>
    </button>
  );
}

function InterestChip({
  cat,
  gradient,
  selected,
  disabled,
  onToggle,
}: {
  cat: Category;
  gradient: string;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={`flex h-full min-h-[2.75rem] w-full items-center justify-center rounded-xl px-2.5 py-2 text-center text-xs font-bold leading-snug transition-all duration-150 active:scale-[0.97] sm:rounded-2xl sm:px-3 sm:text-sm ${
        selected
          ? `bg-gradient-to-l ${gradient} text-white shadow-md`
          : 'border border-border bg-white text-foreground hover:border-primary hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-35'
      }`}
    >
      <span className="line-clamp-2">
        {cat.emoji ? `${cat.emoji} ` : ''}
        {categoryFa(cat.name)}
      </span>
    </button>
  );
}

function sortCategories(cats: Category[]) {
  return [...cats].sort((a, b) =>
    categoryFa(a.name).localeCompare(categoryFa(b.name), 'fa')
  );
}

export function ProfileInterestsStep({
  categories,
  broadIds,
  specificIds,
  onToggleBroad,
  onToggleSpecific,
}: Props) {
  const [specificSearch, setSpecificSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());

  const allowedCategories = useMemo(
    () => categories.filter((c) => isAllowedInterestName(c.name)),
    [categories]
  );

  const filteredSpecific = useMemo(() => {
    const q = specificSearch.trim();
    if (!q) return [] as { cat: Category; gradient: string }[];
    const seen = new Set<string>();
    const results: { cat: Category; gradient: string }[] = [];
    for (const row of section2AccordionRows()) {
      for (const cat of categoriesForNames(row.specifics, allowedCategories)) {
        if (seen.has(cat.id)) continue;
        if (
          cat.name.toLowerCase().includes(q.toLowerCase()) ||
          categoryFa(cat.name).includes(q)
        ) {
          seen.add(cat.id);
          results.push({ cat, gradient: row.gradient });
        }
      }
    }
    return results.sort((a, b) =>
      categoryFa(a.cat.name).localeCompare(categoryFa(b.cat.name), 'fa')
    );
  }, [allowedCategories, specificSearch]);

  const toggleGroup = (groupKey: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const accordionRows = useMemo(
    () =>
      section2AccordionRows().filter(
        (row) => categoriesForNames(row.specifics, allowedCategories).length > 0
      ),
    [allowedCategories]
  );

  const findStyleForCat = (cat: Category) => {
    for (const row of section2AccordionRows()) {
      if (row.specifics.includes(cat.name)) {
        return { gradient: row.gradient };
      }
    }
    const broad = BROAD_INTERESTS.find((b) => b.specifics.includes(cat.name));
    return { gradient: broad?.gradient ?? 'from-accent-purple to-primary' };
  };

  const selectedSpecificCats = useMemo(() => {
    return specificIds
      .map((id) => categories.find((c) => c.id === id))
      .filter((c): c is Category => Boolean(c))
      .sort((a, b) => categoryFa(a.name).localeCompare(categoryFa(b.name), 'fa'));
  }, [categories, specificIds]);

  return (
    <div className="space-y-0">
      {/* Section 1 — main categories */}
      <section className="pb-8">
        <SectionStickyHeader
          title={fa.profileSetup.mainInterests}
          hint={fa.profileSetup.mainInterestsHint}
          current={broadIds.length}
          max={MAX_BROAD}
        />

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {BROAD_INTERESTS.map((opt) => (
            <CategoryCard
              key={opt.id}
              opt={opt}
              selected={broadIds.includes(opt.id)}
              disabled={!broadIds.includes(opt.id) && broadIds.length >= MAX_BROAD}
              onToggle={() => onToggleBroad(opt.id)}
            />
          ))}
        </div>
      </section>

      {/* Section 2 — specific interests (header replaces section 1 when it reaches the top) */}
      <section>
        <SectionStickyHeader
          title={fa.profileSetup.specificInterests}
          hint={fa.profileSetup.specificInterestsHint}
          current={specificIds.length}
          max={MAX_SPECIFIC}
        />

        <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={specificSearch}
            onChange={(e) => setSpecificSearch(e.target.value)}
            placeholder={fa.profileSetup.searchSpecific}
            className="w-full rounded-2xl border border-border bg-background py-3 pe-10 ps-4 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {specificSearch.trim() ? (
          <div className="rounded-2xl border border-border bg-background/40 p-3 sm:p-4">
            {filteredSpecific.length === 0 ? (
              <p className="text-sm text-muted">{fa.interestPicker.noResults}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {filteredSpecific.map(({ cat, gradient }) => (
                  <InterestChip
                    key={cat.id}
                    cat={cat}
                    gradient={gradient}
                    selected={specificIds.includes(cat.id)}
                    disabled={!specificIds.includes(cat.id) && specificIds.length >= MAX_SPECIFIC}
                    onToggle={() => onToggleSpecific(cat.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {accordionRows.map((row) => {
              const leaves = sortCategories(
                categoriesForNames(row.specifics, allowedCategories)
              );
              const open = openGroups.has(row.key);
              const selectedInGroup = leaves.filter((l) => specificIds.includes(l.id)).length;
              return (
                <div
                  key={row.key}
                  className={`overflow-hidden rounded-2xl border transition-colors sm:rounded-3xl ${
                    open ? 'border-primary/30 bg-white shadow-sm' : 'border-border bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(row.key)}
                    className={`flex w-full items-center justify-between gap-3 px-3.5 py-3 text-start transition-colors sm:px-4 sm:py-3.5 ${
                      open ? row.tint : 'hover:bg-background'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5 font-black text-foreground">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg sm:h-10 sm:w-10 sm:rounded-2xl sm:text-xl ${row.gradient}`}
                      >
                        {row.emoji}
                      </span>
                      <span className="truncate">{row.label}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-muted">
                      {selectedInGroup > 0 && (
                        <span
                          className={`rounded-full bg-gradient-to-l px-2.5 py-1 text-white ${row.gradient}`}
                        >
                          {selectedInGroup} ✓
                        </span>
                      )}
                      <ChevronDown
                        className={`h-5 w-5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                      />
                    </span>
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="border-t border-border px-3 py-3 sm:px-4 sm:py-4">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                          {leaves.map((cat) => (
                            <InterestChip
                              key={cat.id}
                              cat={cat}
                              gradient={row.gradient}
                              selected={specificIds.includes(cat.id)}
                              disabled={
                                !specificIds.includes(cat.id) && specificIds.length >= MAX_SPECIFIC
                              }
                              onToggle={() => onToggleSpecific(cat.id)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedSpecificCats.length > 0 && (
          <div className="rounded-2xl border border-dashed border-accent-purple/40 bg-background/50 p-3 sm:p-4">
            <p className="mb-2.5 text-xs font-black text-accent-purple">
              {fa.profileSetup.yourPicks}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {selectedSpecificCats.map((cat) => {
                const style = findStyleForCat(cat);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onToggleSpecific(cat.id)}
                    className={`flex min-h-[2.5rem] items-center justify-center rounded-xl bg-gradient-to-l px-2.5 py-2 text-center text-xs font-bold text-white transition-transform active:scale-[0.97] sm:text-sm ${style.gradient}`}
                  >
                    <span className="line-clamp-2">
                      {cat.emoji ? `${cat.emoji} ` : ''}
                      {categoryFa(cat.name)} ✕
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        </div>
      </section>
    </div>
  );
}
