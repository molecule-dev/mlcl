/**
 * Food Delivery tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface FoodDeliveryLimits {
  /** Maximum number of delivery a user may own. */
  maxDelivery: number

  /** Maximum number of menu a user may own. */
  maxMenu: number

  /** Maximum number of orders a user may own. */
  maxOrders: number

  /** Maximum number of restaurants a user may own. */
  maxRestaurants: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const foodDeliveryPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: FoodDeliveryLimits = {
  maxDelivery: 5,
  maxMenu: 5,
  maxOrders: 5,
  maxRestaurants: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: FoodDeliveryLimits = {
  maxDelivery: 500,
  maxMenu: 500,
  maxOrders: 500,
  maxRestaurants: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: FoodDeliveryLimits = {
  maxDelivery: 999_999,
  maxMenu: 999_999,
  maxOrders: 999_999,
  maxRestaurants: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<FoodDeliveryLimits> = defineTiers<FoodDeliveryLimits>({
  tiers: {
    [foodDeliveryPlanKeys.free]: {
      planKey: foodDeliveryPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [foodDeliveryPlanKeys.proMonthly]: {
      planKey: foodDeliveryPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [foodDeliveryPlanKeys.proYearly]: {
      planKey: foodDeliveryPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [foodDeliveryPlanKeys.teamMonthly]: {
      planKey: foodDeliveryPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [foodDeliveryPlanKeys.teamYearly]: {
      planKey: foodDeliveryPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: foodDeliveryPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: FoodDeliveryLimits
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
          stripePriceId: process.env.STRIPE_FOOD_DELIVERY_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_FOOD_DELIVERY_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_FOOD_DELIVERY_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_FOOD_DELIVERY_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
