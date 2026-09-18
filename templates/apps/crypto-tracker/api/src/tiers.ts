/**
 * Crypto Tracker tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface CryptoTrackerLimits {
  /** Maximum number of alerts a user may own. */
  maxAlerts: number

  /** Maximum number of coins a user may own. */
  maxCoins: number

  /** Maximum number of market a user may own. */
  maxMarket: number

  /** Maximum number of portfolio a user may own. */
  maxPortfolio: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const cryptoTrackerPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

/**
 * The free plan's limits.
 *
 * Exported so the demo seed can stay UNDER them — see handlers/_seed.ts. A
 * starter portfolio larger than maxPortfolio leaves a brand-new user already
 * over quota, unable to add anything.
 */
export const FREE_LIMITS: CryptoTrackerLimits = {
  maxAlerts: 5,
  maxCoins: 5,
  maxMarket: 5,
  maxPortfolio: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: CryptoTrackerLimits = {
  maxAlerts: 500,
  maxCoins: 500,
  maxMarket: 500,
  maxPortfolio: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: CryptoTrackerLimits = {
  maxAlerts: 999_999,
  maxCoins: 999_999,
  maxMarket: 999_999,
  maxPortfolio: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<CryptoTrackerLimits> = defineTiers<CryptoTrackerLimits>({
  tiers: {
    [cryptoTrackerPlanKeys.free]: {
      planKey: cryptoTrackerPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [cryptoTrackerPlanKeys.proMonthly]: {
      planKey: cryptoTrackerPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [cryptoTrackerPlanKeys.proYearly]: {
      planKey: cryptoTrackerPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [cryptoTrackerPlanKeys.teamMonthly]: {
      planKey: cryptoTrackerPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [cryptoTrackerPlanKeys.teamYearly]: {
      planKey: cryptoTrackerPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: cryptoTrackerPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: CryptoTrackerLimits
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
          stripePriceId: process.env.STRIPE_CRYPTO_TRACKER_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_CRYPTO_TRACKER_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_CRYPTO_TRACKER_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_CRYPTO_TRACKER_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
