/**
 * Inventory Management tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface InventoryManagementLimits {
  /** Maximum number of alerts a user may own. */
  maxAlerts: number

  /** Maximum number of products a user may own. */
  maxProducts: number

  /** Maximum number of stock a user may own. */
  maxStock: number

  /** Maximum number of transfers a user may own. */
  maxTransfers: number

  /** Maximum number of warehouses a user may own. */
  maxWarehouses: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const inventoryManagementPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

// Free tier is sized so a brand-new account that lands on the seeded demo
// (4 warehouses, 18 products, 35+ stock rows, multiple alerts) can still
// add a few of their own SKUs / warehouses / alerts before being asked to
// upgrade. Anything below the seed footprint would break the first-run
// experience by rejecting the very next create() the user attempts.
const FREE_LIMITS: InventoryManagementLimits = {
  maxAlerts: 100,
  maxProducts: 100,
  maxStock: 1000,
  maxTransfers: 50,
  maxWarehouses: 10,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: InventoryManagementLimits = {
  maxAlerts: 500,
  maxProducts: 500,
  // Must stay above FREE_LIMITS.maxStock (1000) — an upgrade can never lower a limit.
  maxStock: 5000,
  maxTransfers: 500,
  maxWarehouses: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: InventoryManagementLimits = {
  maxAlerts: 999_999,
  maxProducts: 999_999,
  maxStock: 999_999,
  maxTransfers: 999_999,
  maxWarehouses: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<InventoryManagementLimits> =
  defineTiers<InventoryManagementLimits>({
    tiers: {
      [inventoryManagementPlanKeys.free]: {
        planKey: inventoryManagementPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [inventoryManagementPlanKeys.proMonthly]: {
        planKey: inventoryManagementPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [inventoryManagementPlanKeys.proYearly]: {
        planKey: inventoryManagementPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [inventoryManagementPlanKeys.teamMonthly]: {
        planKey: inventoryManagementPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [inventoryManagementPlanKeys.teamYearly]: {
        planKey: inventoryManagementPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: inventoryManagementPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: InventoryManagementLimits
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
          stripePriceId: process.env.STRIPE_INVENTORY_MANAGEMENT_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_INVENTORY_MANAGEMENT_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_INVENTORY_MANAGEMENT_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_INVENTORY_MANAGEMENT_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
