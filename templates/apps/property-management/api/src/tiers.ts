/**
 * Property Management tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface PropertyManagementLimits {
  /** Maximum number of leases a user may own. */
  maxLeases: number

  /** Maximum number of maintenance a user may own. */
  maxMaintenance: number

  /** Maximum number of payments a user may own. */
  maxPayments: number

  /** Maximum number of properties a user may own. */
  maxProperties: number

  /** Maximum number of tenants a user may own. */
  maxTenants: number

  /** Maximum number of units a user may own. */
  maxUnits: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const propertyManagementPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: PropertyManagementLimits = {
  maxLeases: 5,
  maxMaintenance: 5,
  maxPayments: 5,
  maxProperties: 5,
  maxTenants: 5,
  maxUnits: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: PropertyManagementLimits = {
  maxLeases: 500,
  maxMaintenance: 500,
  maxPayments: 500,
  maxProperties: 500,
  maxTenants: 500,
  maxUnits: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: PropertyManagementLimits = {
  maxLeases: 999_999,
  maxMaintenance: 999_999,
  maxPayments: 999_999,
  maxProperties: 999_999,
  maxTenants: 999_999,
  maxUnits: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<PropertyManagementLimits> =
  defineTiers<PropertyManagementLimits>({
    tiers: {
      [propertyManagementPlanKeys.free]: {
        planKey: propertyManagementPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [propertyManagementPlanKeys.proMonthly]: {
        planKey: propertyManagementPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [propertyManagementPlanKeys.proYearly]: {
        planKey: propertyManagementPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [propertyManagementPlanKeys.teamMonthly]: {
        planKey: propertyManagementPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [propertyManagementPlanKeys.teamYearly]: {
        planKey: propertyManagementPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: propertyManagementPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: PropertyManagementLimits
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
          stripePriceId: process.env.STRIPE_PROPERTY_MANAGEMENT_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_PROPERTY_MANAGEMENT_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_PROPERTY_MANAGEMENT_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_PROPERTY_MANAGEMENT_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
