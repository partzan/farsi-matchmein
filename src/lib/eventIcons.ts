import { BROAD_INTERESTS } from './broadInterests';

/** Curated emoji icons for create-event (shown on voting cards). */
export const EVENT_ICONS = [
  '🍕', '☕', '🍔', '🍰', '🍳',
  '🏔️', '🥾', '🏕️', '🚶', '🌿',
  '📚', '✍️', '📜', '🧠',
  '🎮', '🎲', '♟️', '🎤',
  '🎬', '🎭', '🎶',
  '⚽', '🏸', '🏀', '💪', '🧘',
  '🎨', '📸', '🖌️',
  '🤝', '💬', '🌟', '🔥',
] as const;

export type EventIcon = (typeof EVENT_ICONS)[number];

/** Default icons per primary (broad) interest */
export const ICONS_BY_BROAD: Record<string, readonly string[]> = {
  food_fun: ['🍕', '☕', '🍔', '🍰', '🍳', '🌟'],
  nature_travel: ['🏔️', '🥾', '🏕️', '🚶', '🌿', '🔥'],
  culture_lit: ['📚', '✍️', '📜', '🧠', '💬'],
  games_fun: ['🎮', '🎲', '♟️', '🎤', '🌟'],
  theater_cinema: ['🎬', '🎭', '🎶', '🎤', '🌟'],
  sports_lifestyle: ['⚽', '🏸', '🏀', '💪', '🧘', '🔥'],
  arts_creative: ['🎨', '📸', '🖌️', '✍️', '🌟'],
  civic_social: ['🤝', '💬', '☕', '🌟', '🔥'],
};

/** Extra icons for specific leaf interests (English DB names) */
export const ICONS_BY_SPECIFIC: Record<string, readonly string[]> = {
  'Fine Dining': ['🍽️', '🍕', '🍰'],
  'Street Food': ['🍔', '🍕', '🔥'],
  'Coffee Socials': ['☕', '💬', '🤝'],
  Picnics: ['🌿', '🧺', '☀️'],
  Hiking: ['🥾', '🏔️', '🌿'],
  Camping: ['🏕️', '🔥', '🏔️'],
  'City Walks': ['🚶', '🌿', '📸'],
  'Day Trips': ['🚶', '🏔️', '🌟'],
  'Reading & Book Clubs': ['📚', '✍️', '💬'],
  'Creative Writing': ['✍️', '📜', '🧠'],
  Poetry: ['✍️', '📜', '💬'],
  'Board Games': ['🎲', '♟️', '🎮'],
  Chess: ['♟️', '🧠', '🎲'],
  Karaoke: ['🎤', '🎶', '🌟'],
  'Film & Cinema': ['🎬', '🍿', '🎭'],
  'Theater & Acting': ['🎭', '🎬', '🎤'],
  'Live Music': ['🎶', '🎤', '🎸'],
  Soccer: ['⚽', '💪', '🔥'],
  Basketball: ['🏀', '💪', '🔥'],
  Yoga: ['🧘', '🌿', '💪'],
  Painting: ['🎨', '🖌️', '📸'],
  Photography: ['📸', '🎨', '🌟'],
  Volunteering: ['🤝', '💚', '🌟'],
  Networking: ['🤝', '💬', '🌟'],
  'Language Exchange': ['💬', '📚', '🤝'],
  'Local Meetups': ['🤝', '☕', '💬'],
  'Community Service': ['🤝', '💚', '🌟'],
  'Charity Events': ['🤝', '💚', '🌟'],
};

function uniqueIcons(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const icon of list) {
    if (!icon || seen.has(icon)) continue;
    seen.add(icon);
    out.push(icon);
  }
  return out;
}

/**
 * Icons relevant to the chosen primary broad + selected related leaf names.
 * Falls back to broad defaults, then full EVENT_ICONS.
 */
export function iconsForEventSelection(
  broadId: string | null | undefined,
  relatedCategoryNames: string[],
): string[] {
  const collected: string[] = [];

  if (broadId && ICONS_BY_BROAD[broadId]) {
    collected.push(...ICONS_BY_BROAD[broadId]);
  }

  for (const name of relatedCategoryNames) {
    const extras = ICONS_BY_SPECIFIC[name];
    if (extras) collected.push(...extras);
  }

  // Broad emoji itself is a good default
  const broad = BROAD_INTERESTS.find((b) => b.id === broadId);
  if (broad?.emoji) collected.unshift(broad.emoji);

  const filtered = uniqueIcons(collected);
  if (filtered.length > 0) return filtered;
  return [...EVENT_ICONS];
}
