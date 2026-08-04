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
