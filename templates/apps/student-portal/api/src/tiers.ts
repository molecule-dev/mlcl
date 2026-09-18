/**
 * Student Portal tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface StudentPortalLimits {
  /** Maximum number of announcements a user may own. */
  maxAnnouncements: number

  /** Maximum number of attendance a user may own. */
  maxAttendance: number

  /** Maximum number of grades a user may own. */
  maxGrades: number

  /** Maximum number of messages a user may own. */
  maxMessages: number

  /** Maximum number of schedule a user may own. */
  maxSchedule: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const studentPortalPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: StudentPortalLimits = {
  maxAnnouncements: 5,
  maxAttendance: 5,
  maxGrades: 5,
  maxMessages: 5,
  maxSchedule: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: StudentPortalLimits = {
  maxAnnouncements: 500,
  maxAttendance: 500,
  maxGrades: 500,
  maxMessages: 500,
  maxSchedule: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: StudentPortalLimits = {
  maxAnnouncements: 999_999,
  maxAttendance: 999_999,
  maxGrades: 999_999,
  maxMessages: 999_999,
  maxSchedule: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<StudentPortalLimits> = defineTiers<StudentPortalLimits>({
  tiers: {
    [studentPortalPlanKeys.free]: {
      planKey: studentPortalPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [studentPortalPlanKeys.proMonthly]: {
      planKey: studentPortalPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [studentPortalPlanKeys.proYearly]: {
      planKey: studentPortalPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [studentPortalPlanKeys.teamMonthly]: {
      planKey: studentPortalPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [studentPortalPlanKeys.teamYearly]: {
      planKey: studentPortalPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: studentPortalPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: StudentPortalLimits
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
          stripePriceId: process.env.STRIPE_STUDENT_PORTAL_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_STUDENT_PORTAL_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_STUDENT_PORTAL_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_STUDENT_PORTAL_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
