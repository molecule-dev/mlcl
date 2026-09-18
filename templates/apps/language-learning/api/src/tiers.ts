/**
 * Language Learning tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface LanguageLearningLimits {
  /** Maximum number of courses a user may own. */
  maxCourses: number

  /** Maximum number of exercises a user may own. */
  maxExercises: number

  /** Maximum number of leaderboard a user may own. */
  maxLeaderboard: number

  /** Maximum number of lessons a user may own. */
  maxLessons: number

  /** Maximum number of progress a user may own. */
  maxProgress: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const languageLearningPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: LanguageLearningLimits = {
  maxCourses: 5,
  maxExercises: 5,
  maxLeaderboard: 5,
  maxLessons: 5,
  maxProgress: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: LanguageLearningLimits = {
  maxCourses: 500,
  maxExercises: 500,
  maxLeaderboard: 500,
  maxLessons: 500,
  maxProgress: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: LanguageLearningLimits = {
  maxCourses: 999_999,
  maxExercises: 999_999,
  maxLeaderboard: 999_999,
  maxLessons: 999_999,
  maxProgress: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<LanguageLearningLimits> =
  defineTiers<LanguageLearningLimits>({
    tiers: {
      [languageLearningPlanKeys.free]: {
        planKey: languageLearningPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [languageLearningPlanKeys.proMonthly]: {
        planKey: languageLearningPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [languageLearningPlanKeys.proYearly]: {
        planKey: languageLearningPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [languageLearningPlanKeys.teamMonthly]: {
        planKey: languageLearningPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [languageLearningPlanKeys.teamYearly]: {
        planKey: languageLearningPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: languageLearningPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: LanguageLearningLimits
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
          stripePriceId: process.env.STRIPE_LANGUAGE_LEARNING_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_LANGUAGE_LEARNING_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_LANGUAGE_LEARNING_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_LANGUAGE_LEARNING_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
