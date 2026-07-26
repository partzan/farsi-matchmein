import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import {
  BROAD_INTERESTS,
  MAX_BROAD,
  MAX_SPECIFIC,
  broadParents,
} from '../../lib/broadInterests';
import { getLeavesForBranch, type Category } from '../../lib/interestTree';
import { fa } from '../../locale/fa';
import { categoryFa, groupFa } from '../../locale/categoriesFa';

/** Flat list of English group names used for detailed interests */
const SPECIFIC_GROUPS = [
  'Sports & Fitness',
  'Outdoors & Adventure',
  'Tech & Science',
  'Arts & Culture',
  'Games & Hobbies',
  'Social & Nightlife',
  'Food & Drink',
  'Wellness & Lifestyle',
] as const;

type Props = {
  categories: Category[];
  broadIds: string[];
  specificIds: string[];
  onToggleBroad: (id: string) => void;
  onToggleSpecific: (id: string) => void;
};

export function ProfileInterestsStep({
  categories,
  broadIds,
  specificIds,
  onToggleBroad,
  onToggleSpecific,
}: Props) {
  const [broadSearch, setBroadSearch] = useState('');
  const [specificSearch, setSpecificSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const parents = broadParents();

  const filteredBroad = useMemo(() => {
    const q = broadSearch.trim();
    if (!q) return BROAD_INTERESTS;
    return BROAD_INTERESTS.filter((b) => b.label.includes(q));
  }, [broadSearch]);

  const filteredSpecific = useMemo(() => {
    const q = specificSearch.trim();
    if (!q) return [] as Category[];
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        categoryFa(c.name).includes(q) ||
        groupFa(c.group_name).includes(q)
    );
  }, [categories, specificSearch]);

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  return (
    <div className="space-y-10">
      {/* علایق اصلی — 5 categories × inclusive chips (15 total), max 3 */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black text-foreground">{fa.profileSetup.mainInterests}</h3>
            <p className="mt-0.5 text-sm text-muted">{fa.profileSetup.mainInterestsHint}</p>
          </div>
          <span
            className={`rounded-xl px-3 py-1.5 text-sm font-black tabular-nums ${
              broadIds.length >= 1 && broadIds.length <= MAX_BROAD
                ? broadIds.length >= 1
                  ? 'bg-emerald-500/15 text-emerald-700'
                  : 'bg-accent-red/10 text-accent-red'
                : 'bg-accent-red/10 text-accent-red'
            }`}
          >
            {broadIds.length}/{MAX_BROAD}
          </span>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={broadSearch}
            onChange={(e) => setBroadSearch(e.target.value)}
            placeholder={fa.profileSetup.searchMain}
            className="w-full rounded-xl border border-border bg-background py-3 pe-10 ps-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-5">
          {parents.map((parent) => {
            const opts = filteredBroad.filter((b) => b.parentId === parent.id);
            if (opts.length === 0) return null;
            return (
              <div key={parent.id} className="rounded-2xl border border-border bg-background/50 p-4">
                <p className="mb-3 text-sm font-black text-primary">
                  <span className="me-1.5">{parent.emoji}</span>
                  {parent.name}
                </p>
                <div className="flex flex-wrap gap-2">
                  {opts.map((opt) => {
                    const selected = broadIds.includes(opt.id);
                    const disabled = !selected && broadIds.length >= MAX_BROAD;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => onToggleBroad(opt.id)}
                        className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                          selected
                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                            : 'border border-border bg-white text-foreground hover:border-primary disabled:cursor-not-allowed disabled:opacity-35'
                        }`}
                      >
                        <span className="me-1">{opt.emoji}</span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* علایق تفکیکی — expandable categories, specific chips, max 10 */}
      <section className="space-y-4 border-t border-border pt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black text-foreground">{fa.profileSetup.specificInterests}</h3>
            <p className="mt-0.5 text-sm text-muted">{fa.profileSetup.specificInterestsHint}</p>
          </div>
          <span
            className={`rounded-xl px-3 py-1.5 text-sm font-black tabular-nums ${
              specificIds.length > 0
                ? 'bg-emerald-500/15 text-emerald-700'
                : 'bg-muted/20 text-muted'
            }`}
          >
            {specificIds.length}/{MAX_SPECIFIC}
          </span>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={specificSearch}
            onChange={(e) => setSpecificSearch(e.target.value)}
            placeholder={fa.profileSetup.searchSpecific}
            className="w-full rounded-xl border border-border bg-background py-3 pe-10 ps-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {specificSearch.trim() ? (
          <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-white p-4">
            {filteredSpecific.length === 0 ? (
              <p className="text-sm text-muted">{fa.interestPicker.noResults}</p>
            ) : (
              filteredSpecific.map((cat) => {
                const selected = specificIds.includes(cat.id);
                const disabled = !selected && specificIds.length >= MAX_SPECIFIC;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onToggleSpecific(cat.id)}
                    className={`rounded-full px-3 py-1.5 text-sm font-bold ${
                      selected
                        ? 'bg-accent-purple text-white'
                        : 'border border-border bg-background disabled:opacity-35'
                    }`}
                  >
                    {cat.emoji ? `${cat.emoji} ` : ''}
                    {categoryFa(cat.name)}
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {SPECIFIC_GROUPS.map((groupName) => {
              const leaves = getLeavesForBranch(groupName, categories);
              if (leaves.length === 0) return null;
              const open = openGroups.has(groupName);
              const selectedInGroup = leaves.filter((l) => specificIds.includes(l.id)).length;
              return (
                <div key={groupName} className="overflow-hidden rounded-2xl border border-border bg-white">
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupName)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start hover:bg-primary-light/40"
                  >
                    <span className="font-bold text-foreground">{groupFa(groupName)}</span>
                    <span className="flex items-center gap-2 text-xs font-bold text-muted">
                      {selectedInGroup > 0 && (
                        <span className="rounded-lg bg-accent-purple/15 px-2 py-0.5 text-accent-purple">
                          {selectedInGroup}
                        </span>
                      )}
                      <ChevronDown
                        className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`}
                      />
                    </span>
                  </button>
                  {open && (
                    <div className="flex flex-wrap gap-2 border-t border-border bg-background/40 px-4 py-3">
                      {leaves.map((cat) => {
                        const selected = specificIds.includes(cat.id);
                        const disabled = !selected && specificIds.length >= MAX_SPECIFIC;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => onToggleSpecific(cat.id)}
                            className={`rounded-full px-3 py-1.5 text-sm font-bold ${
                              selected
                                ? 'bg-accent-purple text-white'
                                : 'border border-border bg-white disabled:opacity-35'
                            }`}
                          >
                            {cat.emoji ? `${cat.emoji} ` : ''}
                            {categoryFa(cat.name)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {specificIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {specificIds.map((id) => {
              const cat = categories.find((c) => c.id === id);
              if (!cat) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onToggleSpecific(id)}
                  className="rounded-full bg-accent-purple px-3 py-1 text-xs font-bold text-white"
                >
                  {categoryFa(cat.name)} ✕
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
