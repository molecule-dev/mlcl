/**
 * Shift Scheduling tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface ShiftSchedulingLimits {
  /** Maximum number of staff a user may roster. */
  maxStaff: number

  /** Maximum number of shifts per week a user may schedule. */
  maxWeeklyShifts: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const shiftSchedulingPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: ShiftSchedulingLimits = {
  maxStaff: 15,
  maxWeeklyShifts: 60,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: ShiftSchedulingLimits = {
  maxStaff: 200,
  maxWeeklyShifts: 750,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: ShiftSchedulingLimits = {
  maxStaff: 999_999,
  maxWeeklyShifts: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<ShiftSchedulingLimits> = defineTiers<ShiftSchedulingLimits>(
  {
    tiers: {
      [shiftSchedulingPlanKeys.free]: {
        planKey: shiftSchedulingPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [shiftSchedulingPlanKeys.proMonthly]: {
        planKey: shiftSchedulingPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [shiftSchedulingPlanKeys.proYearly]: {
        planKey: shiftSchedulingPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [shiftSchedulingPlanKeys.teamMonthly]: {
        planKey: shiftSchedulingPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [shiftSchedulingPlanKeys.teamYearly]: {
        planKey: shiftSchedulingPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: shiftSchedulingPlanKeys.free,
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
  limits: ShiftSchedulingLimits
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
          price: '$19/mo',
          stripePriceId: process.env.STRIPE_SHIFT_SCHEDULING_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$190/yr',
          stripePriceId: process.env.STRIPE_SHIFT_SCHEDULING_PRO_YEARLY ?? null,
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
          price: '$59/mo',
          stripePriceId: process.env.STRIPE_SHIFT_SCHEDULING_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$590/yr',
          stripePriceId: process.env.STRIPE_SHIFT_SCHEDULING_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
