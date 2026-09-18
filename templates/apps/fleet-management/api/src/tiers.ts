/**
 * Fleet Management tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface FleetManagementLimits {
  /** Maximum number of drivers a user may own. */
  maxDrivers: number

  /** Maximum number of maintenance a user may own. */
  maxMaintenance: number

  /** Maximum number of routes a user may own. */
  maxRoutes: number

  /** Maximum number of vehicles a user may own. */
  maxVehicles: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const fleetManagementPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: FleetManagementLimits = {
  // Free-tier limits sized to fit the seeded demo (12 vehicles, 10 drivers,
  // 5 maintenance records, 9 routes) plus headroom so a trial user can add
  // a vehicle/driver without immediately hitting the upgrade wall.
  maxDrivers: 15,
  maxMaintenance: 15,
  maxRoutes: 15,
  maxVehicles: 15,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: FleetManagementLimits = {
  maxDrivers: 500,
  maxMaintenance: 500,
  maxRoutes: 500,
  maxVehicles: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: FleetManagementLimits = {
  maxDrivers: 999_999,
  maxMaintenance: 999_999,
  maxRoutes: 999_999,
  maxVehicles: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<FleetManagementLimits> = defineTiers<FleetManagementLimits>(
  {
    tiers: {
      [fleetManagementPlanKeys.free]: {
        planKey: fleetManagementPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [fleetManagementPlanKeys.proMonthly]: {
        planKey: fleetManagementPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [fleetManagementPlanKeys.proYearly]: {
        planKey: fleetManagementPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [fleetManagementPlanKeys.teamMonthly]: {
        planKey: fleetManagementPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [fleetManagementPlanKeys.teamYearly]: {
        planKey: fleetManagementPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: fleetManagementPlanKeys.free,
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
  limits: FleetManagementLimits
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
          stripePriceId: process.env.STRIPE_FLEET_MANAGEMENT_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_FLEET_MANAGEMENT_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_FLEET_MANAGEMENT_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_FLEET_MANAGEMENT_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
