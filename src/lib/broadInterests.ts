import type { Category } from './interestTree';

export type InterestGroup = {
  id: string;
  label: string;
  emoji: string;
  gradient?: string;
  tint?: string;
  specifics: string[];
};

/**
 * Profile step 1 — main categories (کتگوری اصلی).
 * Step 2 — curated specifics per category (دیگه چه چیزهایی رو دوست داری؟).
 * Specifics use English `interest_categories.name` keys from the DB.
 * Optional `groups` split section-2 accordions while keeping one main card.
 */
export type BroadInterest = {
  id: string;
  label: string;
  emoji: string;
  /** Tailwind gradient for selected state / accents */
  gradient: string;
  /** Soft tint for headers */
  tint: string;
  /** English DB category names under this main category */
  specifics: string[];
  /** When set, section 2 shows these rows instead of one combined accordion */
  groups?: InterestGroup[];
};

/** Never offer these in profile interest pickers */
export const BANNED_INTEREST_NAMES = new Set([
  'Pub Crawls',
  'Clubbing',
  'Speed Dating',
  'Mixology',
  'Wine Tasting',
  'Craft Beer',
]);

export const BROAD_INTERESTS: BroadInterest[] = [
  {
    id: 'food_fun',
    label: 'غذا و دورهمی',
    emoji: '🍕',
    gradient: 'from-amber-400 to-rose-500',
    tint: 'bg-amber-50',
    specifics: [
      'Fine Dining',
      'Street Food',
      'Vegan Cooking',
      'BBQ & Grilling',
      'Sushi Making',
      'Baking Bread',
      'Food Photography',
      'Coffee Socials',
      'Baking',
      'Cooking Classes',
      'Picnics',
    ],
  },
  {
    id: 'nature_travel',
    label: 'طبیعت و گشت',
    emoji: '🏔️',
    gradient: 'from-emerald-400 to-teal-600',
    tint: 'bg-emerald-50',
    specifics: [
      'Hiking',
      'Camping',
      'Surfing',
      'Skiing & Snowboarding',
      'Scuba Diving',
      'Kayaking',
      'Birdwatching',
      'Fishing',
      'Mountain Biking',
      'Sailing',
      'Rock Climbing',
      'Day Trips',
      'City Walks',
    ],
  },
  {
    id: 'culture_lit',
    label: 'کتاب و فرهنگ',
    emoji: '📚',
    gradient: 'from-indigo-400 to-purple-600',
    tint: 'bg-indigo-50',
    specifics: [
      'Creative Writing',
      'Reading & Book Clubs',
      'Museums & Galleries',
      'Language Exchange',
      'Live Podcasts',
      'Journaling',
      'Poetry',
      'Calligraphy',
    ],
  },
  {
    id: 'games_fun',
    label: 'بازی و سرگرمی',
    emoji: '🎮',
    gradient: 'from-violet-500 to-fuchsia-500',
    tint: 'bg-violet-50',
    specifics: [
      'Board Games',
      'Video Gaming',
      'Chess',
      'Dungeons & Dragons',
      'Magic: The Gathering',
      'Trivia Nights',
      'Karaoke',
      'Model Building',
      'Board Game Cafes',
    ],
  },
  {
    id: 'theater_cinema',
    label: 'تئاتر و سینما',
    emoji: '🎬',
    gradient: 'from-rose-500 to-red-600',
    tint: 'bg-rose-50',
    specifics: [
      'Theater & Acting',
      'Film & Cinema',
      'Live Music',
      'Dance',
      'Comedy Clubs',
    ],
  },
  {
    id: 'sports_lifestyle',
    label: 'ورزش و حال‌خوبی',
    emoji: '⚽',
    gradient: 'from-lime-400 to-emerald-600',
    tint: 'bg-lime-50',
    specifics: [
      'Soccer',
      'Wrestling',
      'Basketball',
      'Tennis',
      'Martial Arts',
      'Bodybuilding',
      'Yoga',
      'Meditation',
      'Running',
      'Cycling',
      'Swimming',
      'Minimalism',
      'Self-Improvement',
      'Journaling',
      'Sustainable Living',
      'Personal Finance',
      'Gardening',
    ],
    groups: [
      {
        id: 'sports',
        label: 'ورزش',
        emoji: '⚽',
        gradient: 'from-lime-400 to-green-600',
        tint: 'bg-lime-50',
        specifics: [
          'Soccer',
          'Wrestling',
          'Basketball',
          'Tennis',
          'Martial Arts',
          'Bodybuilding',
          'Running',
          'Cycling',
          'Swimming',
        ],
      },
      {
        id: 'lifestyle',
        label: 'سبک زندگی',
        emoji: '🧘',
        gradient: 'from-teal-400 to-emerald-600',
        tint: 'bg-teal-50',
        specifics: [
          'Yoga',
          'Meditation',
          'Minimalism',
          'Self-Improvement',
          'Journaling',
          'Sustainable Living',
          'Personal Finance',
          'Gardening',
        ],
      },
    ],
  },
  {
    id: 'arts_creative',
    label: 'هنر و ساختن',
    emoji: '🎨',
    gradient: 'from-fuchsia-500 to-purple-700',
    tint: 'bg-fuchsia-50',
    specifics: [
      'Painting',
      'Photography',
      'Fashion & Design',
      'Pottery & Ceramics',
      'Architecture',
      'DIY & Woodworking',
      'Knitting & Crochet',
      'Baking',
      'Calligraphy',
    ],
  },
  {
    id: 'civic_social',
    label: 'دورهمی و ارتباط',
    emoji: '🤝',
    gradient: 'from-sky-400 to-blue-600',
    tint: 'bg-sky-50',
    specifics: [
      'Volunteering',
      'Networking',
      'Language Exchange',
      'Coffee Socials',
      'Community Service',
      'Charity Events',
      'Local Meetups',
    ],
  },
];

export const MAX_BROAD = 3;
export const MAX_SPECIFIC = 10;
export const MIN_INTERESTS_TOTAL = 3;

export function isAllowedInterestName(name: string) {
  return !BANNED_INTEREST_NAMES.has(name);
}

export function categoriesForNames(
  names: string[],
  categories: Category[]
): Category[] {
  const wanted = new Set(names);
  return categories.filter(
    (c) => wanted.has(c.name) && isAllowedInterestName(c.name)
  );
}

/** Section-2 accordion rows (splits combined mains via `groups`). */
export function section2AccordionRows() {
  return BROAD_INTERESTS.flatMap((broad) => {
    if (broad.groups?.length) {
      return broad.groups.map((g) => ({
        key: g.id,
        label: g.label,
        emoji: g.emoji,
        gradient: g.gradient ?? broad.gradient,
        tint: g.tint ?? broad.tint,
        specifics: g.specifics,
        parent: broad,
      }));
    }
    return [
      {
        key: broad.id,
        label: broad.label,
        emoji: broad.emoji,
        gradient: broad.gradient,
        tint: broad.tint,
        specifics: broad.specifics,
        parent: broad,
      },
    ];
  });
}

export function specificsForBroad(
  broadId: string,
  categories: Category[]
): Category[] {
  const broad = BROAD_INTERESTS.find((b) => b.id === broadId);
  if (!broad) return [];
  return categoriesForNames(broad.specifics, categories);
}

/** Resolve selected broad ids → unique category UUIDs (anchor leaf per broad). */
export function resolveBroadToCategoryIds(
  broadIds: string[],
  categories: { id: string; name: string; group_name?: string }[]
): string[] {
  const ids: string[] = [];
  const used = new Set<string>();
  for (const bid of broadIds) {
    const leaves = specificsForBroad(bid, categories as Category[]);
    const match = leaves[0];
    if (match && !used.has(match.id)) {
      ids.push(match.id);
      used.add(match.id);
    }
  }
  return ids;
}

/** Normalize DB category names (emoji prefixes, casing, punctuation). */
export function normalizeCategoryName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const CATEGORY_ALIASES: Record<string, string> = {
  'coffee social clubs': 'Coffee Socials',
  'coffee socials': 'Coffee Socials',
  'coffee social': 'Coffee Socials',
};

/** Canonical English interest name used in BROAD_INTERESTS.specifics */
export function canonicalCategoryName(name: string | null | undefined): string {
  const raw = (name || '').trim();
  if (!raw) return '';
  const key = normalizeCategoryName(raw);
  if (CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key];
  for (const broad of BROAD_INTERESTS) {
    const hit = broad.specifics.find((s) => normalizeCategoryName(s) === key);
    if (hit) return hit;
    for (const g of broad.groups ?? []) {
      const gHit = g.specifics.find((s) => normalizeCategoryName(s) === key);
      if (gHit) return gHit;
    }
  }
  return raw;
}

/** Map a leaf interest category name → its broad (primary) interest, if any. */
export function broadInterestForCategoryName(
  categoryName: string | null | undefined,
): BroadInterest | null {
  const canonical = canonicalCategoryName(categoryName);
  if (!canonical) return null;
  return (
    BROAD_INTERESTS.find((b) => b.specifics.includes(canonical)) ??
    BROAD_INTERESTS.find((b) =>
      b.groups?.some((g) => g.specifics.includes(canonical)),
    ) ??
    null
  );
}

/** Reverse: DB high-priority category ids → broad option ids. */
export function categoryIdsToBroadIds(
  categoryIds: string[],
  categories: { id: string; name: string; group_name?: string }[]
): string[] {
  const result: string[] = [];
  const usedBroad = new Set<string>();
  for (const cid of categoryIds) {
    const cat = categories.find((c) => c.id === cid);
    if (!cat) continue;
    const broad = BROAD_INTERESTS.find((b) => b.specifics.includes(cat.name));
    if (broad && !usedBroad.has(broad.id)) {
      result.push(broad.id);
      usedBroad.add(broad.id);
    }
  }
  return result.slice(0, MAX_BROAD);
}
