/**
 * Restaurant Ordering tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface RestaurantOrderingLimits {
  /** Maximum number of kitchen a user may own. */
  maxKitchen: number

  /** Maximum number of menu a user may own. */
  maxMenu: number

  /** Maximum number of orders a user may own. */
  maxOrders: number

  /** Maximum number of tables a user may own. */
  maxTables: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const restaurantOrderingPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: RestaurantOrderingLimits = {
  maxKitchen: 5,
  maxMenu: 5,
  maxOrders: 5,
  maxTables: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: RestaurantOrderingLimits = {
  maxKitchen: 500,
  maxMenu: 500,
  maxOrders: 500,
  maxTables: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: RestaurantOrderingLimits = {
  maxKitchen: 999_999,
  maxMenu: 999_999,
  maxOrders: 999_999,
  maxTables: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<RestaurantOrderingLimits> =
  defineTiers<RestaurantOrderingLimits>({
    tiers: {
      [restaurantOrderingPlanKeys.free]: {
        planKey: restaurantOrderingPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [restaurantOrderingPlanKeys.proMonthly]: {
        planKey: restaurantOrderingPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [restaurantOrderingPlanKeys.proYearly]: {
        planKey: restaurantOrderingPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [restaurantOrderingPlanKeys.teamMonthly]: {
        planKey: restaurantOrderingPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [restaurantOrderingPlanKeys.teamYearly]: {
        planKey: restaurantOrderingPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: restaurantOrderingPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: RestaurantOrderingLimits
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
          stripePriceId: process.env.STRIPE_RESTAURANT_ORDERING_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_RESTAURANT_ORDERING_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_RESTAURANT_ORDERING_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_RESTAURANT_ORDERING_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
