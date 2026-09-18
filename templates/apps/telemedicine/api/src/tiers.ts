/**
 * Telemedicine tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface TelemedicineLimits {
  /** Maximum number of appointments a user may own. */
  maxAppointments: number

  /** Maximum number of consultations a user may own. */
  maxConsultations: number

  /** Maximum number of prescriptions a user may own. */
  maxPrescriptions: number

  /** Maximum number of providers a user may own. */
  maxProviders: number

  /** Maximum number of records a user may own. */
  maxRecords: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const telemedicinePlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: TelemedicineLimits = {
  maxAppointments: 5,
  maxConsultations: 5,
  maxPrescriptions: 5,
  maxProviders: 5,
  maxRecords: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: TelemedicineLimits = {
  maxAppointments: 500,
  maxConsultations: 500,
  maxPrescriptions: 500,
  maxProviders: 500,
  maxRecords: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: TelemedicineLimits = {
  maxAppointments: 999_999,
  maxConsultations: 999_999,
  maxPrescriptions: 999_999,
  maxProviders: 999_999,
  maxRecords: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<TelemedicineLimits> = defineTiers<TelemedicineLimits>({
  tiers: {
    [telemedicinePlanKeys.free]: {
      planKey: telemedicinePlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [telemedicinePlanKeys.proMonthly]: {
      planKey: telemedicinePlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [telemedicinePlanKeys.proYearly]: {
      planKey: telemedicinePlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [telemedicinePlanKeys.teamMonthly]: {
      planKey: telemedicinePlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [telemedicinePlanKeys.teamYearly]: {
      planKey: telemedicinePlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: telemedicinePlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: TelemedicineLimits
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
          stripePriceId: process.env.STRIPE_TELEMEDICINE_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_TELEMEDICINE_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_TELEMEDICINE_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_TELEMEDICINE_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
