/**
 * The writer's daily word-count goal (Settings → Word goals).
 *
 * Persisted to localStorage by the Settings page, but the Editor progress card
 * and the Library manuscript-hero ring both hardcoded 2000 — so a custom goal
 * had no effect. This is the single source of truth for the key + a pure reader
 * both surfaces use.
 */

/** localStorage key for the writer's daily word-count goal. */
export const DAILY_GOAL_KEY = 'versal.dailyGoal'

/** Fallback daily word goal when unset or invalid. */
export const DEFAULT_DAILY_GOAL = 2000

/**
 * Read the stored daily word-count goal (a positive integer), falling back to
 * the default when unset, non-numeric, or unavailable (private mode / SSR).
 */
export function readDailyGoal(
  storage: Pick<Storage, 'getItem'> | undefined = typeof globalThis.localStorage === 'undefined'
    ? undefined
    : globalThis.localStorage,
): number {
  if (!storage) return DEFAULT_DAILY_GOAL
  try {
    const n = Math.round(Number(storage.getItem(DAILY_GOAL_KEY)))
    return Number.isFinite(n) && n >= 1 ? n : DEFAULT_DAILY_GOAL
  } catch (_error) {
    // localStorage may throw (private mode) — fall back to the default goal.
    return DEFAULT_DAILY_GOAL
  }
}
