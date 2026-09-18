/**
 * Feed sort ordering.
 *
 * The user's saved "Default sort" (Settings → Feed preferences, stored in
 * users.oauthData.preferences.feed.defaultSort and served by
 * GET /users/me/settings) picks which order the feed opens in. The Feed page
 * hardcoded 'hot' as the initial sort, so a saved default had no effect.
 *
 * @module
 */

/** The feed sort options. */
export type SortOption = 'hot' | 'new' | 'top'

/** All feed sort options, in display order. */
export const SORTS: SortOption[] = ['hot', 'new', 'top']

/**
 * The initial feed sort from the user's `/users/me/settings` response
 * (`feed.defaultSort`), tolerant of the `{ data: … }` envelope. Falls back to
 * 'hot' when unset or invalid.
 */
export function pickInitialSort(settings: unknown): SortOption {
  const body = ((settings as { data?: unknown } | null | undefined)?.data ?? settings) as
    { feed?: { defaultSort?: unknown } } | null | undefined
  const sort = body?.feed?.defaultSort
  return sort === 'new' || sort === 'top' ? sort : 'hot'
}
