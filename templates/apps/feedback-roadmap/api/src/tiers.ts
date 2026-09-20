/**
 * Feedback & roadmap tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface FeedbackLimits {
  /** Maximum number of feedback boards a workspace may run. */
  maxBoards: number

  /** Maximum number of feedback posts a user may submit. */
  maxPosts: number

  /** Maximum number of upvotes a user may cast. */
  maxVotes: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const feedbackPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: FeedbackLimits = {
  maxBoards: 2,
  maxPosts: 10,
  maxVotes: 25,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: FeedbackLimits = {
  maxBoards: 25,
  maxPosts: 500,
  maxVotes: 5000,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: FeedbackLimits = {
  maxBoards: 999_999,
  maxPosts: 999_999,
  maxVotes: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<FeedbackLimits> = defineTiers<FeedbackLimits>({
  tiers: {
    [feedbackPlanKeys.free]: {
      planKey: feedbackPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [feedbackPlanKeys.proMonthly]: {
      planKey: feedbackPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [feedbackPlanKeys.proYearly]: {
      planKey: feedbackPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [feedbackPlanKeys.teamMonthly]: {
      planKey: feedbackPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [feedbackPlanKeys.teamYearly]: {
      planKey: feedbackPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: feedbackPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: FeedbackLimits
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
          stripePriceId: process.env.STRIPE_FEEDBACK_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_FEEDBACK_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_FEEDBACK_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_FEEDBACK_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
