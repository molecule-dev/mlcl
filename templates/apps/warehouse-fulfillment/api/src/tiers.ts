/**
 * Warehouse Fulfillment tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface WarehouseFulfillmentLimits {
  /** Maximum number of orders a user may own. */
  maxOrders: number

  /** Maximum number of packing a user may own. */
  maxPacking: number

  /** Maximum number of picks a user may own. */
  maxPicks: number

  /** Maximum number of shipments a user may own. */
  maxShipments: number

  /** Maximum number of zones a user may own. */
  maxZones: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const warehouseFulfillmentPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: WarehouseFulfillmentLimits = {
  maxOrders: 5,
  maxPacking: 5,
  maxPicks: 5,
  maxShipments: 5,
  maxZones: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: WarehouseFulfillmentLimits = {
  maxOrders: 500,
  maxPacking: 500,
  maxPicks: 500,
  maxShipments: 500,
  maxZones: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: WarehouseFulfillmentLimits = {
  maxOrders: 999_999,
  maxPacking: 999_999,
  maxPicks: 999_999,
  maxShipments: 999_999,
  maxZones: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<WarehouseFulfillmentLimits> =
  defineTiers<WarehouseFulfillmentLimits>({
    tiers: {
      [warehouseFulfillmentPlanKeys.free]: {
        planKey: warehouseFulfillmentPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [warehouseFulfillmentPlanKeys.proMonthly]: {
        planKey: warehouseFulfillmentPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [warehouseFulfillmentPlanKeys.proYearly]: {
        planKey: warehouseFulfillmentPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [warehouseFulfillmentPlanKeys.teamMonthly]: {
        planKey: warehouseFulfillmentPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [warehouseFulfillmentPlanKeys.teamYearly]: {
        planKey: warehouseFulfillmentPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: warehouseFulfillmentPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: WarehouseFulfillmentLimits
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
          stripePriceId: process.env.STRIPE_WAREHOUSE_FULFILLMENT_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_WAREHOUSE_FULFILLMENT_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_WAREHOUSE_FULFILLMENT_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_WAREHOUSE_FULFILLMENT_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
