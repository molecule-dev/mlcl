/**
 * Energy Monitoring tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface EnergyMonitoringLimits {
  /** Maximum number of alerts a user may own. */
  maxAlerts: number

  /** Maximum number of costs a user may own. */
  maxCosts: number

  /** Maximum number of meters a user may own. */
  maxMeters: number

  /** Maximum number of readings a user may own. */
  maxReadings: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const energyMonitoringPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: EnergyMonitoringLimits = {
  maxAlerts: 5,
  maxCosts: 2,
  maxMeters: 3,
  maxReadings: 50_000,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: EnergyMonitoringLimits = {
  maxAlerts: 50,
  maxCosts: 10,
  maxMeters: 25,
  maxReadings: 500_000,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: EnergyMonitoringLimits = {
  maxAlerts: 999_999,
  maxCosts: 999_999,
  maxMeters: 999_999,
  maxReadings: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<EnergyMonitoringLimits> =
  defineTiers<EnergyMonitoringLimits>({
    tiers: {
      [energyMonitoringPlanKeys.free]: {
        planKey: energyMonitoringPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [energyMonitoringPlanKeys.proMonthly]: {
        planKey: energyMonitoringPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [energyMonitoringPlanKeys.proYearly]: {
        planKey: energyMonitoringPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [energyMonitoringPlanKeys.teamMonthly]: {
        planKey: energyMonitoringPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [energyMonitoringPlanKeys.teamYearly]: {
        planKey: energyMonitoringPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: energyMonitoringPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: EnergyMonitoringLimits
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
          stripePriceId: process.env.STRIPE_ENERGY_MONITORING_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_ENERGY_MONITORING_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_ENERGY_MONITORING_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_ENERGY_MONITORING_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
