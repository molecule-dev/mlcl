/**
 * Course Marketplace tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface CourseMarketplaceLimits {
  /** Maximum number of catalog a user may own. */
  maxCatalog: number

  /** Maximum number of certificates a user may own. */
  maxCertificates: number

  /** Maximum number of enrollments a user may own. */
  maxEnrollments: number

  /** Maximum number of instructors a user may own. */
  maxInstructors: number

  /** Maximum number of lessons a user may own. */
  maxLessons: number

  /** Maximum number of reviews a user may own. */
  maxReviews: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const courseMarketplacePlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: CourseMarketplaceLimits = {
  maxCatalog: 5,
  maxCertificates: 5,
  maxEnrollments: 5,
  maxInstructors: 5,
  maxLessons: 5,
  maxReviews: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: CourseMarketplaceLimits = {
  maxCatalog: 500,
  maxCertificates: 500,
  maxEnrollments: 500,
  maxInstructors: 500,
  maxLessons: 500,
  maxReviews: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: CourseMarketplaceLimits = {
  maxCatalog: 999_999,
  maxCertificates: 999_999,
  maxEnrollments: 999_999,
  maxInstructors: 999_999,
  maxLessons: 999_999,
  maxReviews: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<CourseMarketplaceLimits> =
  defineTiers<CourseMarketplaceLimits>({
    tiers: {
      [courseMarketplacePlanKeys.free]: {
        planKey: courseMarketplacePlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [courseMarketplacePlanKeys.proMonthly]: {
        planKey: courseMarketplacePlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [courseMarketplacePlanKeys.proYearly]: {
        planKey: courseMarketplacePlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [courseMarketplacePlanKeys.teamMonthly]: {
        planKey: courseMarketplacePlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [courseMarketplacePlanKeys.teamYearly]: {
        planKey: courseMarketplacePlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: courseMarketplacePlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: CourseMarketplaceLimits
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
          stripePriceId: process.env.STRIPE_COURSE_MARKETPLACE_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_COURSE_MARKETPLACE_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_COURSE_MARKETPLACE_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_COURSE_MARKETPLACE_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
