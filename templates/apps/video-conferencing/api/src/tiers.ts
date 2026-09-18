/**
 * Video Conferencing tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface VideoConferencingLimits {
  /** Maximum number of chat a user may own. */
  maxChat: number

  /** Maximum number of meetings a user may own. */
  maxMeetings: number

  /** Maximum number of participants a user may own. */
  maxParticipants: number

  /** Maximum number of recordings a user may own. */
  maxRecordings: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const videoConferencingPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: VideoConferencingLimits = {
  maxChat: 5,
  maxMeetings: 5,
  maxParticipants: 5,
  maxRecordings: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: VideoConferencingLimits = {
  maxChat: 500,
  maxMeetings: 500,
  maxParticipants: 500,
  maxRecordings: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: VideoConferencingLimits = {
  maxChat: 999_999,
  maxMeetings: 999_999,
  maxParticipants: 999_999,
  maxRecordings: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<VideoConferencingLimits> =
  defineTiers<VideoConferencingLimits>({
    tiers: {
      [videoConferencingPlanKeys.free]: {
        planKey: videoConferencingPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [videoConferencingPlanKeys.proMonthly]: {
        planKey: videoConferencingPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [videoConferencingPlanKeys.proYearly]: {
        planKey: videoConferencingPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [videoConferencingPlanKeys.teamMonthly]: {
        planKey: videoConferencingPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [videoConferencingPlanKeys.teamYearly]: {
        planKey: videoConferencingPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: videoConferencingPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: VideoConferencingLimits
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
          stripePriceId: process.env.STRIPE_VIDEO_CONFERENCING_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_VIDEO_CONFERENCING_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_VIDEO_CONFERENCING_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_VIDEO_CONFERENCING_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
