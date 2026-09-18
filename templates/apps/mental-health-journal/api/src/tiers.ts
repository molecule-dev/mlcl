/**
 * Mental Health Journal tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface MentalHealthJournalLimits {
  /** Maximum number of activities a user may own. */
  maxActivities: number

  /** Maximum number of entries a user may own. */
  maxEntries: number

  /** Maximum number of goals a user may own. */
  maxGoals: number

  /** Maximum number of insights a user may own. */
  maxInsights: number

  /** Maximum number of mood a user may own. */
  maxMood: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const mentalHealthJournalPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: MentalHealthJournalLimits = {
  maxActivities: 5,
  maxEntries: 5,
  maxGoals: 5,
  maxInsights: 5,
  maxMood: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: MentalHealthJournalLimits = {
  maxActivities: 500,
  maxEntries: 500,
  maxGoals: 500,
  maxInsights: 500,
  maxMood: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: MentalHealthJournalLimits = {
  maxActivities: 999_999,
  maxEntries: 999_999,
  maxGoals: 999_999,
  maxInsights: 999_999,
  maxMood: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<MentalHealthJournalLimits> =
  defineTiers<MentalHealthJournalLimits>({
    tiers: {
      [mentalHealthJournalPlanKeys.free]: {
        planKey: mentalHealthJournalPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [mentalHealthJournalPlanKeys.proMonthly]: {
        planKey: mentalHealthJournalPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [mentalHealthJournalPlanKeys.proYearly]: {
        planKey: mentalHealthJournalPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [mentalHealthJournalPlanKeys.teamMonthly]: {
        planKey: mentalHealthJournalPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [mentalHealthJournalPlanKeys.teamYearly]: {
        planKey: mentalHealthJournalPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: mentalHealthJournalPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: MentalHealthJournalLimits
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
          stripePriceId: process.env.STRIPE_MENTAL_HEALTH_JOURNAL_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_MENTAL_HEALTH_JOURNAL_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_MENTAL_HEALTH_JOURNAL_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_MENTAL_HEALTH_JOURNAL_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
