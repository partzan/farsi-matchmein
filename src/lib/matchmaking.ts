/**
 * Matchmaking Engine (rule-based — no LLM).
 *
 * Algorithm (phase 1 — Events visibility):
 * 1. Map leaf interest categories → one of 8 broad keys (food_fun, …).
 * 2. User primary interests = user_interests where priority_level = 1 → broad keys.
 * 3. Event most-suitable interests → most_suitable_broad_ids (or derived from leaf ids).
 * 4. If any broad key overlaps → event is viewable for that user.
 *
 * Guests / users with no primary interests: show all active events (browse freely).
 * Logged-in users with primary interests set: filter Events list to overlaps only.
 * AdminEvents: always lists all events (no match filter).
 *
 * Phase 2 (notifications): DB trigger on events → active inserts into notifications
 * for users with a high-tier match (same broad overlap). See migration 20260808.
 */

import {
  BROAD_INTERESTS,
  broadInterestForCategoryName,
  canonicalCategoryName,
} from './broadInterests';
import { supabase } from './supabase';

export type MatchBrowseEvent = {
  id: string;
  title: string;
  datetime: string;
  image_url?: string | null;
  gender_restriction?: string | null;
  status?: string | null;
  most_suitable_broad_ids?: string[] | null;
  most_suitable_interest_ids?: string[] | null;
  targeted_interest_ids?: string[] | null;
  category?: { name: string } | null;
  rsvps?: [{ count: number }];
};

export type CategoryRef = { id: string; name: string; broad_key?: string | null };

/** Resolve a category name or broad_key string to a broad id. */
export function broadKeyForCategory(
  category: { name?: string | null; broad_key?: string | null } | null | undefined,
): string | null {
  if (!category) return null;
  if (category.broad_key && BROAD_INTERESTS.some((b) => b.id === category.broad_key)) {
    return category.broad_key;
  }
  return broadInterestForCategoryName(category.name)?.id ?? null;
}

/** Broad keys covered by a list of leaf category ids. */
export function broadKeysFromCategoryIds(
  categoryIds: string[],
  categories: CategoryRef[],
): string[] {
  const keys = new Set<string>();
  for (const id of categoryIds) {
    const cat = categories.find((c) => c.id === id);
    const key = broadKeyForCategory(cat);
    if (key) keys.add(key);
  }
  return [...keys];
}

/** Event most-suitable broad keys (prefer denormalized column). */
export function eventMostSuitableBroadKeys(
  event: Pick<
    MatchBrowseEvent,
    'most_suitable_broad_ids' | 'most_suitable_interest_ids' | 'targeted_interest_ids'
  >,
  categories: CategoryRef[] = [],
): string[] {
  if (event.most_suitable_broad_ids?.length) {
    return [...new Set(event.most_suitable_broad_ids.filter(Boolean))];
  }
  const leafIds =
    event.most_suitable_interest_ids?.length
      ? event.most_suitable_interest_ids
      : event.targeted_interest_ids || [];
  return broadKeysFromCategoryIds(leafIds, categories);
}

/**
 * Phase-1 visibility: true when event most-suitable broads overlap user primary broads.
 * Empty userPrimaries → treat as “no interests yet” (caller decides policy).
 */
export function eventMatchesPrimaryInterests(
  eventBroads: string[],
  userPrimaryBroads: string[],
): boolean {
  if (!eventBroads.length || !userPrimaryBroads.length) return false;
  const userSet = new Set(userPrimaryBroads);
  return eventBroads.some((b) => userSet.has(b));
}

/**
 * Filter policy for the public Events page.
 * - Guests: all events
 * - Logged-in, no primary interests: all events
 * - Logged-in with primary interests: matches only
 */
export function filterEventsForViewer<T extends MatchBrowseEvent>(
  events: T[],
  opts: {
    isLoggedIn: boolean;
    userPrimaryBroads: string[];
    categories?: CategoryRef[];
  },
): T[] {
  if (!opts.isLoggedIn) return events;
  if (!opts.userPrimaryBroads.length) return events;
  return events.filter((e) =>
    eventMatchesPrimaryInterests(
      eventMostSuitableBroadKeys(e, opts.categories || []),
      opts.userPrimaryBroads,
    ),
  );
}

/** Load primary broad keys for the current user (RPC preferred, client fallback). */
export async function fetchUserPrimaryBroadIds(userId: string): Promise<string[]> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('user_primary_broad_ids', {
    p_user_id: userId,
  });
  if (!rpcError && Array.isArray(rpcData)) {
    return (rpcData as string[]).filter(Boolean);
  }

  const { data: interests } = await supabase
    .from('user_interests')
    .select('category_id, priority_level, interest_categories(name, broad_key)')
    .eq('user_id', userId)
    .eq('priority_level', 1);

  if (!interests?.length) return [];

  const keys = new Set<string>();
  for (const row of interests as Array<{
    interest_categories?: { name?: string; broad_key?: string | null } | null;
  }>) {
    const key = broadKeyForCategory(row.interest_categories);
    if (key) keys.add(key);
  }
  return [...keys];
}

/** Fetch active upcoming events with suitability fields for matchmaking. */
export async function fetchActiveEventsForBrowse(limit = 60) {
  return supabase
    .from('events')
    .select(
      `
      id, title, datetime, image_url, gender_restriction, status,
      most_suitable_broad_ids, most_suitable_interest_ids, targeted_interest_ids,
      category:interest_categories(name, broad_key),
      rsvps:event_rsvps(count)
    `,
    )
    .eq('status', 'active')
    .gte('datetime', new Date().toISOString())
    .order('datetime', { ascending: true })
    .limit(limit);
}

/** Human-readable Farsi labels for selected suitability interests. */
export function suitabilityLabels(
  ids: string[],
  categories: CategoryRef[],
  labelFn: (name: string) => string,
): string[] {
  return ids
    .map((id) => {
      const cat = categories.find((c) => c.id === id);
      return cat ? labelFn(canonicalCategoryName(cat.name) || cat.name) : '';
    })
    .filter(Boolean);
}

/** PostgREST sometimes returns a 1:1 embed as an array — normalize to one row. */
export function asCategoryRow(
  category: { name?: string | null } | { name?: string | null }[] | null | undefined,
): { name: string } | null {
  if (!category) return null;
  const row = Array.isArray(category) ? category[0] : category;
  const name = row?.name?.trim();
  return name ? { name } : null;
}

/**
 * Collapse exact repeated phrases: "foo foo foo" / "فوفوفو" → "foo" / "فو".
 * Fixes titles corrupted by join/map bugs that concatenated the same label.
 */
export function collapseRepeatedPhrase(text: string | null | undefined): string {
  const raw = (text || '').trim();
  if (!raw) return '';

  // Prefer longest unit that tiles the whole string (min length 2, at least 2 repeats)
  for (let len = Math.floor(raw.length / 2); len >= 2; len--) {
    if (raw.length % len !== 0) continue;
    const times = raw.length / len;
    if (times < 2) continue;
    const unit = raw.slice(0, len);
    if (unit.repeat(times) === raw) return unit.trim();
  }
  return raw;
}

/**
 * Farsi label for the event's broad/main category — NOT a mismatched leaf interest.
 * Prefer most_suitable_broad_ids, then derive broad from stored leaf category.
 */
export function eventBroadCategoryLabel(
  event: Pick<
    MatchBrowseEvent,
    'most_suitable_broad_ids' | 'category'
  >,
  fallback = '',
): string {
  const broadId = event.most_suitable_broad_ids?.find(Boolean);
  if (broadId) {
    const broad = BROAD_INTERESTS.find((b) => b.id === broadId);
    if (broad?.label) return broad.label;
  }
  const leaf = asCategoryRow(event.category);
  const fromLeaf = broadInterestForCategoryName(leaf?.name);
  if (fromLeaf?.label) return fromLeaf.label;
  return fallback;
}

/**
 * Pick the leaf interest that best matches the event title among selected related ids.
 * Avoids storing an arbitrary first related id (e.g. Bodybuilding) as category_id.
 */
export function pickPrimaryInterestId(
  relatedIds: string[],
  title: string,
  categories: CategoryRef[],
  labelFn: (name: string) => string,
): string | null {
  if (!relatedIds.length) return null;

  const titleNorm = title.trim();
  const titleLower = titleNorm.toLowerCase();

  for (const id of relatedIds) {
    const cat = categories.find((c) => c.id === id);
    if (!cat?.name) continue;
    const faLabel = labelFn(cat.name);
    if (faLabel && titleNorm.includes(faLabel)) return id;
    if (titleLower.includes(cat.name.toLowerCase())) return id;
  }

  const KEYWORDS: Array<{ re: RegExp; names: string[] }> = [
    { re: /فوتسال|فوتبال|futsal|soccer|football/i, names: ['Soccer'] },
    { re: /بدنسازی|bodybuilding|وزنه|weightlifting|gym/i, names: ['Bodybuilding', 'Weightlifting'] },
    { re: /یوگا|yoga/i, names: ['Yoga'] },
    { re: /تنیس|tennis/i, names: ['Tennis'] },
    { re: /بسکت|basket/i, names: ['Basketball'] },
    { re: /شنا|swim/i, names: ['Swimming'] },
    { re: /دوچرخه|cycl/i, names: ['Cycling'] },
    { re: /دویدن|running|run\b/i, names: ['Running'] },
    { re: /کشتی|wrestl/i, names: ['Wrestling'] },
    { re: /رزمی|martial/i, names: ['Martial Arts'] },
    { re: /مدیتیشن|meditat/i, names: ['Meditation'] },
  ];

  for (const { re, names } of KEYWORDS) {
    if (!re.test(titleNorm)) continue;
    for (const name of names) {
      const cat = categories.find(
        (c) => canonicalCategoryName(c.name) === name || c.name === name,
      );
      if (cat && relatedIds.includes(cat.id)) return cat.id;
    }
  }

  return relatedIds[0];
}
