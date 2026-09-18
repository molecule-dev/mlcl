/**
 * Coupon Deals Platform tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface CouponDealsPlatformLimits {
  /** Maximum number of categories a user may own. */
  maxCategories: number

  /** Maximum number of deals a user may own. */
  maxDeals: number

  /** Maximum number of merchants a user may own. */
  maxMerchants: number

  /** Maximum number of redemptions a user may own. */
  maxRedemptions: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const couponDealsPlatformPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: CouponDealsPlatformLimits = {
  maxCategories: 5,
  maxDeals: 5,
  maxMerchants: 5,
  maxRedemptions: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: CouponDealsPlatformLimits = {
  maxCategories: 500,
  maxDeals: 500,
  maxMerchants: 500,
  maxRedemptions: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: CouponDealsPlatformLimits = {
  maxCategories: 999_999,
  maxDeals: 999_999,
  maxMerchants: 999_999,
  maxRedemptions: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<CouponDealsPlatformLimits> =
  defineTiers<CouponDealsPlatformLimits>({
    tiers: {
      [couponDealsPlatformPlanKeys.free]: {
        planKey: couponDealsPlatformPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [couponDealsPlatformPlanKeys.proMonthly]: {
        planKey: couponDealsPlatformPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [couponDealsPlatformPlanKeys.proYearly]: {
        planKey: couponDealsPlatformPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [couponDealsPlatformPlanKeys.teamMonthly]: {
        planKey: couponDealsPlatformPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [couponDealsPlatformPlanKeys.teamYearly]: {
        planKey: couponDealsPlatformPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: couponDealsPlatformPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: CouponDealsPlatformLimits
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
          stripePriceId: process.env.STRIPE_COUPON_DEALS_PLATFORM_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_COUPON_DEALS_PLATFORM_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_COUPON_DEALS_PLATFORM_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_COUPON_DEALS_PLATFORM_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
