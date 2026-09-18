/**
 * Nearby-deals preference filtering.
 *
 * The user's saved search preferences (Settings → `search_radius_km` +
 * `favorite_categories`, stored in `user_settings.preferences`) must actually
 * scope the "Near Me" feed. The nearby-deals listing previously ignored them
 * entirely, so changing either value had no effect. These pure helpers turn
 * the stored blob into the concrete radius cap + category-id allow-list the
 * listing applies.
 *
 * @module
 */

/** The saved nearby-deals preferences, extracted from the `preferences` blob. */
export interface NearbyPrefs {
  /** Raw saved radius (km); validated/normalized by {@link effectiveRadiusKm}. */
  radiusKm: unknown
  /** Free-text favorite category names/slugs the user typed in Settings. */
  favoriteCategories: string[]
}

/** Read the nearby-relevant preference fields out of a `user_settings.preferences` value. */
export function readNearbyPrefs(preferences: unknown): NearbyPrefs {
  const p = (preferences ?? {}) as Record<string, unknown>
  const favoriteCategories = Array.isArray(p.favorite_categories)
    ? p.favorite_categories.filter((x): x is string => typeof x === 'string')
    : []
  return { radiusKm: p.search_radius_km, favoriteCategories }
}

/**
 * The effective search radius (km): an explicit query override wins, else the
 * saved preference, else `null` (no cap — the historical behavior). A
 * non-positive value means "no cap" too, so a 0/blank radius never blanks the feed.
 */
export function effectiveRadiusKm(
  queryRadius: number | undefined,
  savedRadiusKm: unknown,
): number | null {
  if (typeof queryRadius === 'number' && Number.isFinite(queryRadius) && queryRadius > 0) {
    return queryRadius
  }
  const saved = typeof savedRadiusKm === 'number' ? savedRadiusKm : Number(savedRadiusKm)
  return Number.isFinite(saved) && saved > 0 ? saved : null
}

/**
 * Map the user's free-text favorite category names/slugs to concrete category
 * ids, case-insensitively against each category's `name` or `slug`. Unmatched
 * entries are ignored; an empty result means "no category filter" (a typo must
 * not blank the feed) rather than "match nothing".
 */
export function resolveFavoriteCategoryIds(
  favorites: readonly string[],
  categories: readonly { id: string; name?: string | null; slug?: string | null }[],
): string[] {
  const wanted = new Set(favorites.map((f) => f.trim().toLowerCase()).filter((f) => f.length > 0))
  if (wanted.size === 0) return []
  const ids: string[] = []
  for (const cat of categories) {
    const name = cat.name?.trim().toLowerCase()
    const slug = cat.slug?.trim().toLowerCase()
    if ((name && wanted.has(name)) || (slug && wanted.has(slug))) ids.push(cat.id)
  }
  return ids
}
