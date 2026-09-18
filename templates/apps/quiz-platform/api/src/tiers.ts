/**
 * Quiz Platform tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface QuizPlatformLimits {
  /** Maximum number of leaderboard a user may own. */
  maxLeaderboard: number

  /** Maximum number of questions a user may own. */
  maxQuestions: number

  /** Maximum number of quizzes a user may own. */
  maxQuizzes: number

  /** Maximum number of sessions a user may own. */
  maxSessions: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const quizPlatformPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: QuizPlatformLimits = {
  maxLeaderboard: 5,
  maxQuestions: 5,
  maxQuizzes: 5,
  maxSessions: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: QuizPlatformLimits = {
  maxLeaderboard: 500,
  maxQuestions: 500,
  maxQuizzes: 500,
  maxSessions: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: QuizPlatformLimits = {
  maxLeaderboard: 999_999,
  maxQuestions: 999_999,
  maxQuizzes: 999_999,
  maxSessions: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<QuizPlatformLimits> = defineTiers<QuizPlatformLimits>({
  tiers: {
    [quizPlatformPlanKeys.free]: {
      planKey: quizPlatformPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [quizPlatformPlanKeys.proMonthly]: {
      planKey: quizPlatformPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [quizPlatformPlanKeys.proYearly]: {
      planKey: quizPlatformPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [quizPlatformPlanKeys.teamMonthly]: {
      planKey: quizPlatformPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [quizPlatformPlanKeys.teamYearly]: {
      planKey: quizPlatformPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: quizPlatformPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: QuizPlatformLimits
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
          stripePriceId: process.env.STRIPE_QUIZ_PLATFORM_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_QUIZ_PLATFORM_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_QUIZ_PLATFORM_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_QUIZ_PLATFORM_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
