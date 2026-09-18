/**
 * Tutoring Marketplace tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface TutoringMarketplaceLimits {
  /** Maximum number of bookings a user may own. */
  maxBookings: number

  /** Maximum number of reviews a user may own. */
  maxReviews: number

  /** Maximum number of sessions a user may own. */
  maxSessions: number

  /** Maximum number of subjects a user may own. */
  maxSubjects: number

  /** Maximum number of tutors a user may own. */
  maxTutors: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const tutoringMarketplacePlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: TutoringMarketplaceLimits = {
  maxBookings: 5,
  maxReviews: 5,
  maxSessions: 5,
  maxSubjects: 5,
  maxTutors: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: TutoringMarketplaceLimits = {
  maxBookings: 500,
  maxReviews: 500,
  maxSessions: 500,
  maxSubjects: 500,
  maxTutors: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: TutoringMarketplaceLimits = {
  maxBookings: 999_999,
  maxReviews: 999_999,
  maxSessions: 999_999,
  maxSubjects: 999_999,
  maxTutors: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<TutoringMarketplaceLimits> =
  defineTiers<TutoringMarketplaceLimits>({
    tiers: {
      [tutoringMarketplacePlanKeys.free]: {
        planKey: tutoringMarketplacePlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [tutoringMarketplacePlanKeys.proMonthly]: {
        planKey: tutoringMarketplacePlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [tutoringMarketplacePlanKeys.proYearly]: {
        planKey: tutoringMarketplacePlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [tutoringMarketplacePlanKeys.teamMonthly]: {
        planKey: tutoringMarketplacePlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [tutoringMarketplacePlanKeys.teamYearly]: {
        planKey: tutoringMarketplacePlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: tutoringMarketplacePlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: TutoringMarketplaceLimits
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
          price: '$15/mo',
          stripePriceId: process.env.STRIPE_TUTORING_MARKETPLACE_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_TUTORING_MARKETPLACE_PRO_YEARLY ?? null,
        },
      ],
      limits: PRO_LIMITS,
    },
    {
      key: 'team',
      name: 'Team',
      prices: [
        {
          period: 'month',
          price: '$49/mo',
          stripePriceId: process.env.STRIPE_TUTORING_MARKETPLACE_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_TUTORING_MARKETPLACE_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
