/**
 * Iot Device Manager tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface IotDeviceManagerLimits {
  /** Maximum number of commands a user may own. */
  maxCommands: number

  /** Maximum number of devices a user may own. */
  maxDevices: number

  /** Maximum number of firmware a user may own. */
  maxFirmware: number

  /** Maximum number of telemetry a user may own. */
  maxTelemetry: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const iotDeviceManagerPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: IotDeviceManagerLimits = {
  // Operational limits: one user manages a small fleet on free.
  maxDevices: 5,
  maxFirmware: 5,
  // Volume limits: commands / telemetry are high-cardinality by nature
  // — limiting to single digits would make the demo unusable on the
  // very first ingest call. Match the energy-monitoring shape:
  // a few thousand commands, tens of thousands of telemetry points.
  maxCommands: 1_000,
  maxTelemetry: 50_000,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: IotDeviceManagerLimits = {
  maxDevices: 50,
  maxFirmware: 50,
  maxCommands: 50_000,
  maxTelemetry: 1_000_000,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: IotDeviceManagerLimits = {
  maxDevices: 999_999,
  maxFirmware: 999_999,
  maxCommands: 999_999,
  maxTelemetry: 999_999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<IotDeviceManagerLimits> =
  defineTiers<IotDeviceManagerLimits>({
    tiers: {
      [iotDeviceManagerPlanKeys.free]: {
        planKey: iotDeviceManagerPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [iotDeviceManagerPlanKeys.proMonthly]: {
        planKey: iotDeviceManagerPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [iotDeviceManagerPlanKeys.proYearly]: {
        planKey: iotDeviceManagerPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [iotDeviceManagerPlanKeys.teamMonthly]: {
        planKey: iotDeviceManagerPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [iotDeviceManagerPlanKeys.teamYearly]: {
        planKey: iotDeviceManagerPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: iotDeviceManagerPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: IotDeviceManagerLimits
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
          stripePriceId: process.env.STRIPE_IOT_DEVICE_MANAGER_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_IOT_DEVICE_MANAGER_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_IOT_DEVICE_MANAGER_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_IOT_DEVICE_MANAGER_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
