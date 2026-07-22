export type Category = {
  id: string;
  name: string;
  group_name?: string;
  emoji?: string;
  tagline?: string;
};

export type ParentCategory = {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  level: number;
  gradient: string;
  ring: string;
  glow: string;
  groups: string[];
};

export const PARENT_CATEGORIES: ParentCategory[] = [
  {
    id: 'move',
    name: 'حرکت و ماجراجویی',
    emoji: '⚡',
    tagline: 'ورزش، تناسب اندام و طبیعت',
    level: 1,
    gradient: 'from-accent-orange via-amber-500 to-accent-red',
    ring: 'ring-accent-orange/50',
    glow: 'shadow-accent-orange/30',
    groups: ['Sports & Fitness', 'Outdoors & Adventure'],
  },
  {
    id: 'create',
    name: 'خلق و کشف',
    emoji: '🧠',
    tagline: 'فناوری، هنر، بازی و ساخت',
    level: 1,
    gradient: 'from-primary via-accent-purple to-primary-dark',
    ring: 'ring-primary/50',
    glow: 'shadow-primary/30',
    groups: ['Tech & Science', 'Arts & Culture', 'Games & Hobbies'],
  },
  {
    id: 'connect',
    name: 'ارتباط و اجتماع',
    emoji: '🌙',
    tagline: 'شب‌زندگی، گفت‌وگو و جامعه',
    level: 1,
    gradient: 'from-indigo-500 via-primary to-accent-purple',
    ring: 'ring-indigo-400/50',
    glow: 'shadow-indigo-400/30',
    groups: ['Social & Nightlife'],
  },
  {
    id: 'taste',
    name: 'طعم و هنر آشپزی',
    emoji: '🍽️',
    tagline: 'غذا، نوشیدنی و تجربه‌های آشپزی',
    level: 1,
    gradient: 'from-rose-500 via-accent-red to-accent-orange',
    ring: 'ring-rose-400/50',
    glow: 'shadow-rose-400/30',
    groups: ['Food & Drink'],
  },
  {
    id: 'grow',
    name: 'رشد و شکوفایی',
    emoji: '🌱',
    tagline: 'سلامت، رشد و زندگی آگاهانه',
    level: 1,
    gradient: 'from-emerald-500 via-teal-500 to-primary',
    ring: 'ring-emerald-400/50',
    glow: 'shadow-emerald-400/30',
    groups: ['Wellness & Lifestyle'],
  },
];

const GROUP_TO_PARENT = new Map<string, ParentCategory>();
for (const parent of PARENT_CATEGORIES) {
  for (const group of parent.groups) {
    GROUP_TO_PARENT.set(group, parent);
  }
}

export function getParentForGroup(groupName: string | undefined): ParentCategory | undefined {
  if (!groupName) return undefined;
  return GROUP_TO_PARENT.get(groupName);
}

export function getLeavesForBranch(groupName: string, categories: Category[]) {
  return categories.filter((c) => c.group_name === groupName);
}

export function countSelectedInParent(parent: ParentCategory, categories: Category[], selectedIds: string[]) {
  const groupSet = new Set(parent.groups);
  return categories.filter((c) => groupSet.has(c.group_name || '') && selectedIds.includes(c.id)).length;
}
