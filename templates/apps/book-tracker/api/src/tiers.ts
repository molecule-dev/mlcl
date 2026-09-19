/**
 * Book Tracker tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface BookTrackerLimits {
  /** Maximum number of books a user may own. */
  maxBooks: number

  /** Maximum number of reviews a user may write. */
  maxReviews: number

  /** Whether the user has access to advanced stats beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const bookTrackerPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: BookTrackerLimits = {
  maxBooks: 5,
  maxReviews: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: BookTrackerLimits = {
  maxBooks: 500,
  maxReviews: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: BookTrackerLimits = {
  maxBooks: 999_999,
  maxReviews: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<BookTrackerLimits> = defineTiers<BookTrackerLimits>({
  tiers: {
    [bookTrackerPlanKeys.free]: {
      planKey: bookTrackerPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [bookTrackerPlanKeys.proMonthly]: {
      planKey: bookTrackerPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [bookTrackerPlanKeys.proYearly]: {
      planKey: bookTrackerPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [bookTrackerPlanKeys.teamMonthly]: {
      planKey: bookTrackerPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [bookTrackerPlanKeys.teamYearly]: {
      planKey: bookTrackerPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: bookTrackerPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: BookTrackerLimits
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
          price: '$9/mo',
          stripePriceId: process.env.STRIPE_BOOK_TRACKER_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$90/yr',
          stripePriceId: process.env.STRIPE_BOOK_TRACKER_PRO_YEARLY ?? null,
        },
      ],
      limits: PRO_LIMITS,
    },
    {
      key: 'team',
      name: 'Book club',
      prices: [
        {
          period: 'month',
          price: '$29/mo',
          stripePriceId: process.env.STRIPE_BOOK_TRACKER_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$290/yr',
          stripePriceId: process.env.STRIPE_BOOK_TRACKER_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
