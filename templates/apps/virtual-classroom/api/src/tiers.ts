/**
 * Virtual Classroom tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface VirtualClassroomLimits {
  /** Maximum number of chat a user may own. */
  maxChat: number

  /** Maximum number of recordings a user may own. */
  maxRecordings: number

  /** Maximum number of rooms a user may own. */
  maxRooms: number

  /** Maximum number of whiteboard a user may own. */
  maxWhiteboard: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const virtualClassroomPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: VirtualClassroomLimits = {
  maxChat: 5,
  maxRecordings: 5,
  maxRooms: 5,
  maxWhiteboard: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: VirtualClassroomLimits = {
  maxChat: 500,
  maxRecordings: 500,
  maxRooms: 500,
  maxWhiteboard: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: VirtualClassroomLimits = {
  maxChat: 999_999,
  maxRecordings: 999_999,
  maxRooms: 999_999,
  maxWhiteboard: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<VirtualClassroomLimits> =
  defineTiers<VirtualClassroomLimits>({
    tiers: {
      [virtualClassroomPlanKeys.free]: {
        planKey: virtualClassroomPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [virtualClassroomPlanKeys.proMonthly]: {
        planKey: virtualClassroomPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [virtualClassroomPlanKeys.proYearly]: {
        planKey: virtualClassroomPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [virtualClassroomPlanKeys.teamMonthly]: {
        planKey: virtualClassroomPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [virtualClassroomPlanKeys.teamYearly]: {
        planKey: virtualClassroomPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: virtualClassroomPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: VirtualClassroomLimits
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
          stripePriceId: process.env.STRIPE_VIRTUAL_CLASSROOM_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_VIRTUAL_CLASSROOM_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_VIRTUAL_CLASSROOM_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_VIRTUAL_CLASSROOM_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
