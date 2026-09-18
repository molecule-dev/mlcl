/**
 * Health Records tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface HealthRecordsLimits {
  /** Maximum number of allergies a user may own. */
  maxAllergies: number

  /** Maximum number of conditions a user may own. */
  maxConditions: number

  /** Maximum number of documents a user may own. */
  maxDocuments: number

  /** Maximum number of immunizations a user may own. */
  maxImmunizations: number

  /** Maximum number of labs a user may own. */
  maxLabs: number

  /** Maximum number of medications a user may own. */
  maxMedications: number

  /** Maximum number of vitals a user may own. */
  maxVitals: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const healthRecordsPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: HealthRecordsLimits = {
  maxAllergies: 5,
  maxConditions: 5,
  maxDocuments: 5,
  maxImmunizations: 5,
  maxLabs: 5,
  maxMedications: 5,
  maxVitals: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: HealthRecordsLimits = {
  maxAllergies: 500,
  maxConditions: 500,
  maxDocuments: 500,
  maxImmunizations: 500,
  maxLabs: 500,
  maxMedications: 500,
  maxVitals: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: HealthRecordsLimits = {
  maxAllergies: 999_999,
  maxConditions: 999_999,
  maxDocuments: 999_999,
  maxImmunizations: 999_999,
  maxLabs: 999_999,
  maxMedications: 999_999,
  maxVitals: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<HealthRecordsLimits> = defineTiers<HealthRecordsLimits>({
  tiers: {
    [healthRecordsPlanKeys.free]: {
      planKey: healthRecordsPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [healthRecordsPlanKeys.proMonthly]: {
      planKey: healthRecordsPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [healthRecordsPlanKeys.proYearly]: {
      planKey: healthRecordsPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [healthRecordsPlanKeys.teamMonthly]: {
      planKey: healthRecordsPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [healthRecordsPlanKeys.teamYearly]: {
      planKey: healthRecordsPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: healthRecordsPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: HealthRecordsLimits
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
          stripePriceId: process.env.STRIPE_HEALTH_RECORDS_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_HEALTH_RECORDS_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_HEALTH_RECORDS_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_HEALTH_RECORDS_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
