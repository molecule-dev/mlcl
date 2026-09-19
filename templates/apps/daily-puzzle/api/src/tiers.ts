/**
 * Daily Puzzle tier ladder.
 *
 * The daily word itself is always free — one word a day, same for everyone.
 * Paid tiers deepen the surrounding game: unlimited archive practice and
 * long-horizon stats. This mirrors the donor's subscription posture
 * (free / pro / family), with puzzle-shaped limits.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface DailyPuzzleLimits {
  /** Maximum archive (practice) puzzles playable per day. */
  maxArchivePlaysPerDay: number

  /** Days of past-puzzle history listed in the Archive. 0 = unlimited. */
  archiveHistoryDays: number

  /** Whether the user sees per-guess timing breakdowns on the Stats page. */
  advancedStats: boolean

  /** Whether the user may export their stats as CSV. */
  canExport: boolean

  /** Days of guess history retained. 0 = unlimited. */
  retentionDays: number
}

export const dailyPuzzlePlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  familyMonthly: 'familyMonthly',
  familyYearly: 'familyYearly',
} as const

const FREE_LIMITS: DailyPuzzleLimits = {
  maxArchivePlaysPerDay: 10,
  archiveHistoryDays: 30,
  advancedStats: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: DailyPuzzleLimits = {
  maxArchivePlaysPerDay: 999_999,
  archiveHistoryDays: 365,
  advancedStats: true,
  canExport: true,
  retentionDays: 365,
}

const FAMILY_LIMITS: DailyPuzzleLimits = {
  maxArchivePlaysPerDay: 999_999,
  archiveHistoryDays: 0,
  advancedStats: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<DailyPuzzleLimits> = defineTiers<DailyPuzzleLimits>({
  tiers: {
    [dailyPuzzlePlanKeys.free]: {
      planKey: dailyPuzzlePlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [dailyPuzzlePlanKeys.proMonthly]: {
      planKey: dailyPuzzlePlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [dailyPuzzlePlanKeys.proYearly]: {
      planKey: dailyPuzzlePlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [dailyPuzzlePlanKeys.familyMonthly]: {
      planKey: dailyPuzzlePlanKeys.familyMonthly,
      category: 'family',
      name: 'Family',
      limits: FAMILY_LIMITS,
    },
    [dailyPuzzlePlanKeys.familyYearly]: {
      planKey: dailyPuzzlePlanKeys.familyYearly,
      category: 'family',
      name: 'Family',
      limits: FAMILY_LIMITS,
    },
  },
  defaultPlanKey: dailyPuzzlePlanKeys.free,
  categoryOrder: ['free', 'pro', 'family'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: DailyPuzzleLimits
}> {
  return [
    {
      key: 'free',
      name: 'Free',
      prices: [{ period: 'month', price: '$0', stripePriceId: null }],
      limits: FREE_LIMITS,
    },
    {
      key: 'pro',
      name: 'Pro',
      prices: [
        {
          period: 'month',
          price: '$3/mo',
          stripePriceId: process.env.STRIPE_DAILY_PUZZLE_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$30/yr',
          stripePriceId: process.env.STRIPE_DAILY_PUZZLE_PRO_YEARLY ?? null,
        },
      ],
      limits: PRO_LIMITS,
    },
    {
      key: 'family',
      name: 'Family',
      prices: [
        {
          period: 'month',
          price: '$5/mo',
          stripePriceId: process.env.STRIPE_DAILY_PUZZLE_FAMILY_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$50/yr',
          stripePriceId: process.env.STRIPE_DAILY_PUZZLE_FAMILY_YEARLY ?? null,
        },
      ],
      limits: FAMILY_LIMITS,
    },
  ]
}
