/**
 * Multi Vendor Marketplace tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface MultiVendorMarketplaceLimits {
  /** Maximum number of commissions a user may own. */
  maxCommissions: number

  /** Maximum number of orders a user may own. */
  maxOrders: number

  /** Maximum number of products a user may own. */
  maxProducts: number

  /** Maximum number of reviews a user may own. */
  maxReviews: number

  /** Maximum number of vendors a user may own. */
  maxVendors: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const multiVendorMarketplacePlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: MultiVendorMarketplaceLimits = {
  maxCommissions: 5,
  maxOrders: 5,
  maxProducts: 5,
  maxReviews: 5,
  maxVendors: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: MultiVendorMarketplaceLimits = {
  maxCommissions: 500,
  maxOrders: 500,
  maxProducts: 500,
  maxReviews: 500,
  maxVendors: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: MultiVendorMarketplaceLimits = {
  maxCommissions: 999_999,
  maxOrders: 999_999,
  maxProducts: 999_999,
  maxReviews: 999_999,
  maxVendors: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<MultiVendorMarketplaceLimits> =
  defineTiers<MultiVendorMarketplaceLimits>({
    tiers: {
      [multiVendorMarketplacePlanKeys.free]: {
        planKey: multiVendorMarketplacePlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [multiVendorMarketplacePlanKeys.proMonthly]: {
        planKey: multiVendorMarketplacePlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [multiVendorMarketplacePlanKeys.proYearly]: {
        planKey: multiVendorMarketplacePlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [multiVendorMarketplacePlanKeys.teamMonthly]: {
        planKey: multiVendorMarketplacePlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [multiVendorMarketplacePlanKeys.teamYearly]: {
        planKey: multiVendorMarketplacePlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: multiVendorMarketplacePlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: MultiVendorMarketplaceLimits
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
          stripePriceId: process.env.STRIPE_MULTI_VENDOR_MARKETPLACE_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_MULTI_VENDOR_MARKETPLACE_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_MULTI_VENDOR_MARKETPLACE_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_MULTI_VENDOR_MARKETPLACE_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
