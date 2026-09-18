/**
 * Grocery Delivery tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface GroceryDeliveryLimits {
  /** Maximum number of cart a user may own. */
  maxCart: number

  /** Maximum number of delivery-slots a user may own. */
  maxDeliverySlots: number

  /** Maximum number of orders a user may own. */
  maxOrders: number

  /** Maximum number of products a user may own. */
  maxProducts: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const groceryDeliveryPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: GroceryDeliveryLimits = {
  maxCart: 5,
  maxDeliverySlots: 5,
  maxOrders: 5,
  maxProducts: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: GroceryDeliveryLimits = {
  maxCart: 500,
  maxDeliverySlots: 500,
  maxOrders: 500,
  maxProducts: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: GroceryDeliveryLimits = {
  maxCart: 999_999,
  maxDeliverySlots: 999_999,
  maxOrders: 999_999,
  maxProducts: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<GroceryDeliveryLimits> = defineTiers<GroceryDeliveryLimits>(
  {
    tiers: {
      [groceryDeliveryPlanKeys.free]: {
        planKey: groceryDeliveryPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [groceryDeliveryPlanKeys.proMonthly]: {
        planKey: groceryDeliveryPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [groceryDeliveryPlanKeys.proYearly]: {
        planKey: groceryDeliveryPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [groceryDeliveryPlanKeys.teamMonthly]: {
        planKey: groceryDeliveryPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [groceryDeliveryPlanKeys.teamYearly]: {
        planKey: groceryDeliveryPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: groceryDeliveryPlanKeys.free,
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
  limits: GroceryDeliveryLimits
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
          stripePriceId: process.env.STRIPE_GROCERY_DELIVERY_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_GROCERY_DELIVERY_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_GROCERY_DELIVERY_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_GROCERY_DELIVERY_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
