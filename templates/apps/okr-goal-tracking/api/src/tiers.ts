/**
 * Okr Goal Tracking tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface OkrGoalTrackingLimits {
  /** Maximum number of check-ins a user may own. */
  maxCheckIns: number

  /** Maximum number of key-results a user may own. */
  maxKeyResults: number

  /** Maximum number of objectives a user may own. */
  maxObjectives: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const okrGoalTrackingPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: OkrGoalTrackingLimits = {
  maxCheckIns: 5,
  maxKeyResults: 5,
  maxObjectives: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: OkrGoalTrackingLimits = {
  maxCheckIns: 500,
  maxKeyResults: 500,
  maxObjectives: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: OkrGoalTrackingLimits = {
  maxCheckIns: 999_999,
  maxKeyResults: 999_999,
  maxObjectives: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<OkrGoalTrackingLimits> = defineTiers<OkrGoalTrackingLimits>(
  {
    tiers: {
      [okrGoalTrackingPlanKeys.free]: {
        planKey: okrGoalTrackingPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [okrGoalTrackingPlanKeys.proMonthly]: {
        planKey: okrGoalTrackingPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [okrGoalTrackingPlanKeys.proYearly]: {
        planKey: okrGoalTrackingPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [okrGoalTrackingPlanKeys.teamMonthly]: {
        planKey: okrGoalTrackingPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [okrGoalTrackingPlanKeys.teamYearly]: {
        planKey: okrGoalTrackingPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: okrGoalTrackingPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  },
)

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: OkrGoalTrackingLimits
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
          stripePriceId: process.env.STRIPE_OKR_GOAL_TRACKING_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_OKR_GOAL_TRACKING_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_OKR_GOAL_TRACKING_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_OKR_GOAL_TRACKING_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
