import { useMemo, useState } from 'react';
import { ChevronRight, Search, Sparkles, Star } from 'lucide-react';
import {
  PARENT_CATEGORIES,
  getLeavesForBranch,
  getParentForGroup,
  countSelectedInParent,
  type Category,
} from '../lib/interestTree';
import { fa } from '../locale/fa';
import { categoryFa, groupFa } from '../locale/categoriesFa';

export type { Category };

type TreeLevel = 'root' | 'branch' | 'leaf';

type InterestPickerProps = {
  categories: Category[];
  selectedInterests: string[];
  onToggle: (id: string) => void;
  maxSelections?: number;
  getSelectionTier?: (id: string) => 'high' | 'normal' | null;
};

export function InterestPicker({
  categories,
  selectedInterests,
  onToggle,
  maxSelections = 15,
  getSelectionTier,
}: InterestPickerProps) {
  const [treeLevel, setTreeLevel] = useState<TreeLevel>('root');
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const activeParent = PARENT_CATEGORIES.find((p) => p.id === activeParentId);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        categoryFa(c.name).includes(searchQuery) ||
        c.group_name?.toLowerCase().includes(q) ||
        groupFa(c.group_name).includes(searchQuery)
    );
  }, [categories, searchQuery]);

  const branchLeaves = activeBranch ? getLeavesForBranch(activeBranch, categories) : [];
  const xpPercent = Math.min(100, (selectedInterests.length / maxSelections) * 100);

  const goRoot = () => {
    setTreeLevel('root');
    setActiveParentId(null);
    setActiveBranch(null);
  };

  const goBranch = (parentId: string) => {
    setActiveParentId(parentId);
    setActiveBranch(null);
    setTreeLevel('branch');
  };

  const goLeaf = (groupName: string) => {
    setActiveBranch(groupName);
    setTreeLevel('leaf');
  };

  const goBack = () => {
    if (treeLevel === 'leaf') {
      setTreeLevel('branch');
      setActiveBranch(null);
    } else if (treeLevel === 'branch') {
      goRoot();
    }
  };

  if (categories.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-4 flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        {fa.interestPicker.loading}
      </div>
    );
  }

  const renderLeafNode = (cat: Category, compact = false) => {
    const isSelected = selectedInterests.includes(cat.id);
    const tier = getSelectionTier?.(cat.id);
    const disabled = !isSelected && selectedInterests.length >= maxSelections;
    const label = categoryFa(cat.name);

    return (
      <button
        key={cat.id}
        type="button"
        onClick={() => onToggle(cat.id)}
        disabled={disabled}
        title={cat.tagline}
        className={`skill-tree-node skill-tree-node--leaf ${compact ? 'skill-tree-node--compact' : ''} ${
          isSelected
            ? tier === 'high'
              ? 'skill-tree-node--high'
              : tier === 'normal'
                ? 'skill-tree-node--normal'
                : 'skill-tree-node--selected'
            : ''
        } ${disabled ? 'skill-tree-node--locked' : ''}`}
      >
        <span className="skill-tree-node__emoji">{cat.emoji || '✦'}</span>
        <span className="skill-tree-node__label">{label}</span>
        {isSelected && (
          <span className="skill-tree-node__badge">
            {tier === 'high' ? <Star className="w-3 h-3" /> : '✓'}
          </span>
        )}
      </button>
    );
  };

  const levelNum = treeLevel === 'root' ? 1 : treeLevel === 'branch' ? 2 : 3;

  return (
    <div className="skill-tree-panel text-right">
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-gray-500">
            {selectedInterests.length} / {maxSelections}
          </span>
          <span className="text-xs font-extrabold text-primary flex items-center gap-1">
            {fa.interestPicker.unlocked} <Sparkles className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden border border-gray-300/50">
          <div
            className="h-full bg-gradient-to-l from-accent-orange via-primary to-accent-purple transition-all duration-500 rounded-full ms-auto"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder={fa.interestPicker.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pe-9 ps-4 py-2.5 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          dir="rtl"
        />
      </div>

      {searchQuery ? (
        <div className="space-y-2 max-h-[420px] overflow-y-auto ps-1">
          {searchResults.length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-sm">{fa.interestPicker.noResults} &quot;{searchQuery}&quot;</p>
          ) : (
            searchResults.map((cat) => {
              const parent = getParentForGroup(cat.group_name);
              return (
                <div key={cat.id} className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 px-1">
                    {parent?.emoji} {parent?.name} ← {groupFa(cat.group_name)}
                  </span>
                  {renderLeafNode(cat, true)}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-5 flex-row-reverse">
            <span className="text-[10px] font-extrabold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              {fa.interestPicker.level} {levelNum}
            </span>
            <div className="flex-1 flex items-center gap-1.5 text-xs font-bold text-gray-500 overflow-hidden justify-end">
              {activeBranch && (
                <>
                  <span className="text-primary truncate">{groupFa(activeBranch)}</span>
                  <span>/</span>
                </>
              )}
              {activeParent && (
                <>
                  <button
                    type="button"
                    onClick={() => goBranch(activeParent.id)}
                    className={treeLevel === 'branch' ? 'text-primary truncate' : 'hover:text-gray-700 truncate'}
                  >
                    {activeParent.name}
                  </button>
                  <span>/</span>
                </>
              )}
              <button type="button" onClick={goRoot} className={treeLevel === 'root' ? 'text-primary' : 'hover:text-gray-700'}>
                {fa.interestPicker.world}
              </button>
            </div>
            {treeLevel !== 'root' && (
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-dark transition-colors"
              >
                {fa.interestPicker.back} <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {treeLevel === 'root' && (
            <div className="skill-tree-level">
              <div className="skill-tree-connector skill-tree-connector--root" />
              <div className="skill-tree-root-hub">
                <span className="text-lg">{fa.interestPicker.you}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-6">
                {PARENT_CATEGORIES.map((parent) => {
                  const unlocked = countSelectedInParent(parent, categories, selectedInterests);
                  return (
                    <button
                      key={parent.id}
                      type="button"
                      onClick={() => goBranch(parent.id)}
                      className={`skill-tree-node skill-tree-node--parent bg-gradient-to-br ${parent.gradient} ${parent.glow}`}
                    >
                      <span className="skill-tree-node__level">{fa.interestPicker.level} ۱</span>
                      <span className="skill-tree-node__emoji text-3xl">{parent.emoji}</span>
                      <span className="skill-tree-node__title">{parent.name}</span>
                      <span className="skill-tree-node__desc">{parent.tagline}</span>
                      {unlocked > 0 && (
                        <span className="skill-tree-node__count">{unlocked} {fa.interestPicker.picked}</span>
                      )}
                      <span className="skill-tree-node__enter">{fa.interestPicker.enterBranch}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {treeLevel === 'branch' && activeParent && (
            <div className="skill-tree-level">
              <p className="text-center text-sm text-gray-300 mb-4 font-medium">{activeParent.tagline}</p>
              <div className="skill-tree-connector skill-tree-connector--branch" />
              <div className={`skill-tree-root-hub bg-gradient-to-br ${activeParent.gradient}`}>
                <span className="text-2xl">{activeParent.emoji}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                {activeParent.groups.map((groupName) => {
                  const leaves = getLeavesForBranch(groupName, categories);
                  const selectedInBranch = leaves.filter((l) => selectedInterests.includes(l.id)).length;
                  const branchEmoji = leaves[0]?.emoji || '📂';
                  return (
                    <button
                      key={groupName}
                      type="button"
                      onClick={() => goLeaf(groupName)}
                      className={`skill-tree-node skill-tree-node--branch ring-2 ${activeParent.ring}`}
                    >
                      <span className="skill-tree-node__level">{fa.interestPicker.level} ۲</span>
                      <span className="skill-tree-node__emoji text-2xl">{branchEmoji}</span>
                      <span className="skill-tree-node__title text-gray-900">{groupFa(groupName)}</span>
                      <span className="skill-tree-node__desc text-gray-500">{leaves.length} {fa.interestPicker.specialties}</span>
                      {selectedInBranch > 0 && (
                        <span className="skill-tree-node__count text-primary">{selectedInBranch} {fa.interestPicker.unlockedCount}</span>
                      )}
                      <span className="skill-tree-node__enter text-primary">{fa.interestPicker.goDeeper}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {treeLevel === 'leaf' && activeBranch && (
            <div className="skill-tree-level">
              <p className="text-center text-sm font-bold text-gray-200 mb-4">{groupFa(activeBranch)}</p>
              <div className="flex flex-wrap gap-3 justify-center">
                {branchLeaves.map((cat) => renderLeafNode(cat))}
              </div>
              {branchLeaves.length === 0 && (
                <p className="text-gray-400 text-center py-8 text-sm">{fa.interestPicker.noInterests}</p>
              )}
            </div>
          )}
        </>
      )}

      {getSelectionTier && (
        <div className="mt-5 flex gap-4 text-[10px] font-bold text-gray-400 justify-center">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary" /> {fa.interestPicker.highPriority}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-800" /> {fa.interestPicker.normal}</span>
        </div>
      )}
    </div>
  );
}
