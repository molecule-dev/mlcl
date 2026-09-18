/**
 * Sleep Tracker tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface SleepTrackerLimits {
  /** Maximum number of alarms a user may own. */
  maxAlarms: number

  /** Maximum number of factors a user may own. */
  maxFactors: number

  /** Maximum number of sleep a user may own. */
  maxSleep: number

  /** Maximum number of stats a user may own. */
  maxStats: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const sleepTrackerPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: SleepTrackerLimits = {
  maxAlarms: 5,
  maxFactors: 5,
  maxSleep: 5,
  maxStats: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: SleepTrackerLimits = {
  maxAlarms: 500,
  maxFactors: 500,
  maxSleep: 500,
  maxStats: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: SleepTrackerLimits = {
  maxAlarms: 999_999,
  maxFactors: 999_999,
  maxSleep: 999_999,
  maxStats: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<SleepTrackerLimits> = defineTiers<SleepTrackerLimits>({
  tiers: {
    [sleepTrackerPlanKeys.free]: {
      planKey: sleepTrackerPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [sleepTrackerPlanKeys.proMonthly]: {
      planKey: sleepTrackerPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [sleepTrackerPlanKeys.proYearly]: {
      planKey: sleepTrackerPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [sleepTrackerPlanKeys.teamMonthly]: {
      planKey: sleepTrackerPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [sleepTrackerPlanKeys.teamYearly]: {
      planKey: sleepTrackerPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: sleepTrackerPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: SleepTrackerLimits
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
          stripePriceId: process.env.STRIPE_SLEEP_TRACKER_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_SLEEP_TRACKER_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_SLEEP_TRACKER_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_SLEEP_TRACKER_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
