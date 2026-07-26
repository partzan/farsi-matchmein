import { PARENT_CATEGORIES } from './interestTree';

/** Inclusive “main” interests — up to 3 picks across 5 wide parents (~15 options). */
export type BroadInterest = {
  id: string;
  label: string;
  emoji: string;
  parentId: string;
  /** Maps to interest_categories.group_name for DB resolution */
  group_name: string;
};

export const BROAD_INTERESTS: BroadInterest[] = [
  // حرکت و ماجراجویی
  { id: 'sports', label: 'ورزش', emoji: '⚽', parentId: 'move', group_name: 'Sports & Fitness' },
  { id: 'fitness', label: 'تناسب اندام', emoji: '💪', parentId: 'move', group_name: 'Sports & Fitness' },
  { id: 'outdoors', label: 'طبیعت', emoji: '🏔️', parentId: 'move', group_name: 'Outdoors & Adventure' },
  // خلق و کشف
  { id: 'arts', label: 'هنر', emoji: '🎨', parentId: 'create', group_name: 'Arts & Culture' },
  { id: 'culture', label: 'فرهنگ', emoji: '🎭', parentId: 'create', group_name: 'Arts & Culture' },
  { id: 'tech', label: 'فناوری', emoji: '💻', parentId: 'create', group_name: 'Tech & Science' },
  { id: 'science', label: 'علم', emoji: '🔬', parentId: 'create', group_name: 'Tech & Science' },
  { id: 'games', label: 'بازی', emoji: '🎮', parentId: 'create', group_name: 'Games & Hobbies' },
  // ارتباط و اجتماع
  { id: 'social', label: 'اجتماعی', emoji: '🤝', parentId: 'connect', group_name: 'Social & Nightlife' },
  { id: 'nightlife', label: 'شب‌زندگی', emoji: '🌙', parentId: 'connect', group_name: 'Social & Nightlife' },
  { id: 'conversation', label: 'گفت‌وگو', emoji: '💬', parentId: 'connect', group_name: 'Social & Nightlife' },
  // طعم
  { id: 'food', label: 'غذا', emoji: '🍽️', parentId: 'taste', group_name: 'Food & Drink' },
  { id: 'drink', label: 'نوشیدنی', emoji: '☕', parentId: 'taste', group_name: 'Food & Drink' },
  // رشد
  { id: 'wellness', label: 'سلامت', emoji: '🧘', parentId: 'grow', group_name: 'Wellness & Lifestyle' },
  { id: 'growth', label: 'رشد فردی', emoji: '🌱', parentId: 'grow', group_name: 'Wellness & Lifestyle' },
];

export const MAX_BROAD = 3;
export const MAX_SPECIFIC = 10;
export const MIN_INTERESTS_TOTAL = 3;

export function broadParents() {
  return PARENT_CATEGORIES.filter((p) =>
    BROAD_INTERESTS.some((b) => b.parentId === p.id)
  );
}

export function broadForParent(parentId: string) {
  return BROAD_INTERESTS.filter((b) => b.parentId === parentId);
}

/** Resolve selected broad ids → unique category UUIDs (one per group). */
export function resolveBroadToCategoryIds(
  broadIds: string[],
  categories: { id: string; group_name?: string }[]
): string[] {
  const ids: string[] = [];
  const usedGroups = new Set<string>();
  for (const bid of broadIds) {
    const broad = BROAD_INTERESTS.find((b) => b.id === bid);
    if (!broad || usedGroups.has(broad.group_name)) continue;
    const match = categories.find((c) => c.group_name === broad.group_name);
    if (match) {
      ids.push(match.id);
      usedGroups.add(broad.group_name);
    }
  }
  return ids;
}

/** Reverse: DB high-priority category ids → broad option ids (one per group). */
export function categoryIdsToBroadIds(
  categoryIds: string[],
  categories: { id: string; group_name?: string }[]
): string[] {
  const result: string[] = [];
  const usedGroups = new Set<string>();
  for (const cid of categoryIds) {
    const cat = categories.find((c) => c.id === cid);
    if (!cat?.group_name || usedGroups.has(cat.group_name)) continue;
    const broad = BROAD_INTERESTS.find((b) => b.group_name === cat.group_name);
    if (broad) {
      result.push(broad.id);
      usedGroups.add(cat.group_name);
    }
  }
  return result.slice(0, MAX_BROAD);
}
