/**
 * Price Comparison tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface PriceComparisonLimits {
  /** Maximum number of alerts a user may own. */
  maxAlerts: number

  /** Maximum number of prices a user may own. */
  maxPrices: number

  /** Maximum number of products a user may own. */
  maxProducts: number

  /** Maximum number of sources a user may own. */
  maxSources: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const priceComparisonPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: PriceComparisonLimits = {
  maxAlerts: 5,
  maxPrices: 5,
  maxProducts: 5,
  maxSources: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: PriceComparisonLimits = {
  maxAlerts: 500,
  maxPrices: 500,
  maxProducts: 500,
  maxSources: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: PriceComparisonLimits = {
  maxAlerts: 999_999,
  maxPrices: 999_999,
  maxProducts: 999_999,
  maxSources: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<PriceComparisonLimits> = defineTiers<PriceComparisonLimits>(
  {
    tiers: {
      [priceComparisonPlanKeys.free]: {
        planKey: priceComparisonPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [priceComparisonPlanKeys.proMonthly]: {
        planKey: priceComparisonPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [priceComparisonPlanKeys.proYearly]: {
        planKey: priceComparisonPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [priceComparisonPlanKeys.teamMonthly]: {
        planKey: priceComparisonPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [priceComparisonPlanKeys.teamYearly]: {
        planKey: priceComparisonPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: priceComparisonPlanKeys.free,
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
  limits: PriceComparisonLimits
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
          stripePriceId: process.env.STRIPE_PRICE_COMPARISON_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_PRICE_COMPARISON_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_PRICE_COMPARISON_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_PRICE_COMPARISON_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
