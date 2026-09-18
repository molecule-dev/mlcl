/**
 * Maps a user's `planKey` (set by the Stripe webhook glue — see
 * `api/src/tiers.ts`) to the tier display name used on the pricing page.
 * Keys are matched lowercased; unknown keys fall back to a capitalized
 * form of the raw key so future tiers still render something sensible.
 */
const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  stripemonthly: 'Pro',
  stripeyearly: 'Pro',
  teammonthly: 'Team',
  teamyearly: 'Team',
}

/**
 * Resolve the display name for a plan key.
 *
 * @param planKey - The user's raw `planKey` (may be undefined for free users).
 * @returns The tier display name (`Free`, `Pro`, `Team`, or a capitalized fallback).
 */
export function planLabel(planKey?: string | null): string {
  const raw = (planKey || 'free').toLowerCase()
  return PLAN_LABELS[raw] ?? (raw[0]?.toUpperCase() ?? '') + raw.slice(1)
}
