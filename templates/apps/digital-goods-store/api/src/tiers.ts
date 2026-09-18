/**
 * Digital Goods Store tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface DigitalGoodsStoreLimits {
  /** Maximum number of analytics a user may own. */
  maxAnalytics: number

  /** Maximum number of downloads a user may own. */
  maxDownloads: number

  /** Maximum number of licenses a user may own. */
  maxLicenses: number

  /** Maximum number of products a user may own. */
  maxProducts: number

  /** Maximum number of purchases a user may own. */
  maxPurchases: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const digitalGoodsStorePlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: DigitalGoodsStoreLimits = {
  maxAnalytics: 5,
  maxDownloads: 5,
  maxLicenses: 5,
  maxProducts: 5,
  maxPurchases: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: DigitalGoodsStoreLimits = {
  maxAnalytics: 500,
  maxDownloads: 500,
  maxLicenses: 500,
  maxProducts: 500,
  maxPurchases: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: DigitalGoodsStoreLimits = {
  maxAnalytics: 999_999,
  maxDownloads: 999_999,
  maxLicenses: 999_999,
  maxProducts: 999_999,
  maxPurchases: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<DigitalGoodsStoreLimits> =
  defineTiers<DigitalGoodsStoreLimits>({
    tiers: {
      [digitalGoodsStorePlanKeys.free]: {
        planKey: digitalGoodsStorePlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [digitalGoodsStorePlanKeys.proMonthly]: {
        planKey: digitalGoodsStorePlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [digitalGoodsStorePlanKeys.proYearly]: {
        planKey: digitalGoodsStorePlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [digitalGoodsStorePlanKeys.teamMonthly]: {
        planKey: digitalGoodsStorePlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [digitalGoodsStorePlanKeys.teamYearly]: {
        planKey: digitalGoodsStorePlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: digitalGoodsStorePlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: DigitalGoodsStoreLimits
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
          stripePriceId: process.env.STRIPE_DIGITAL_GOODS_STORE_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_DIGITAL_GOODS_STORE_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_DIGITAL_GOODS_STORE_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_DIGITAL_GOODS_STORE_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
