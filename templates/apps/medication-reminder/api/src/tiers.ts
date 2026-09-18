/**
 * Medication Reminder tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface MedicationReminderLimits {
  /** Maximum number of adherence a user may own. */
  maxAdherence: number

  /** Maximum number of doses a user may own. */
  maxDoses: number

  /** Maximum number of medications a user may own. */
  maxMedications: number

  /** Maximum number of refills a user may own. */
  maxRefills: number

  /** Maximum number of schedules a user may own. */
  maxSchedules: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const medicationReminderPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: MedicationReminderLimits = {
  maxAdherence: 5,
  maxDoses: 5,
  maxMedications: 5,
  maxRefills: 5,
  maxSchedules: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: MedicationReminderLimits = {
  maxAdherence: 500,
  maxDoses: 500,
  maxMedications: 500,
  maxRefills: 500,
  maxSchedules: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: MedicationReminderLimits = {
  maxAdherence: 999_999,
  maxDoses: 999_999,
  maxMedications: 999_999,
  maxRefills: 999_999,
  maxSchedules: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<MedicationReminderLimits> =
  defineTiers<MedicationReminderLimits>({
    tiers: {
      [medicationReminderPlanKeys.free]: {
        planKey: medicationReminderPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [medicationReminderPlanKeys.proMonthly]: {
        planKey: medicationReminderPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [medicationReminderPlanKeys.proYearly]: {
        planKey: medicationReminderPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [medicationReminderPlanKeys.teamMonthly]: {
        planKey: medicationReminderPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [medicationReminderPlanKeys.teamYearly]: {
        planKey: medicationReminderPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: medicationReminderPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: MedicationReminderLimits
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
          stripePriceId: process.env.STRIPE_MEDICATION_REMINDER_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_MEDICATION_REMINDER_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_MEDICATION_REMINDER_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_MEDICATION_REMINDER_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
