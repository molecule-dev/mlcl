/**
 * Video Editor tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface VideoEditorLimits {
  /** Maximum number of clips a user may own. */
  maxClips: number

  /** Maximum number of exports a user may own. */
  maxExports: number

  /** Maximum number of projects a user may own. */
  maxProjects: number

  /** Maximum number of timeline a user may own. */
  maxTimeline: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const videoEditorPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: VideoEditorLimits = {
  maxClips: 5,
  maxExports: 5,
  maxProjects: 5,
  maxTimeline: 5,
  advancedFeatures: false,
  // Free gets a real export allowance — `maxExports` above IS the gate. This was
  // `false`, which made that number dead: POST /exports 402s before the count can
  // ever be reached, while Pricing advertised both and the export UI offered the
  // button to everyone. Exporting is this app’s entire output; behind payment a
  // free user has nothing to do. Paid tiers still differ on volume and
  // advancedFeatures.
  canExport: true,
  retentionDays: 90,
}

const PRO_LIMITS: VideoEditorLimits = {
  maxClips: 500,
  maxExports: 500,
  maxProjects: 500,
  maxTimeline: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: VideoEditorLimits = {
  maxClips: 999_999,
  maxExports: 999_999,
  maxProjects: 999_999,
  maxTimeline: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<VideoEditorLimits> = defineTiers<VideoEditorLimits>({
  tiers: {
    [videoEditorPlanKeys.free]: {
      planKey: videoEditorPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [videoEditorPlanKeys.proMonthly]: {
      planKey: videoEditorPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [videoEditorPlanKeys.proYearly]: {
      planKey: videoEditorPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [videoEditorPlanKeys.teamMonthly]: {
      planKey: videoEditorPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [videoEditorPlanKeys.teamYearly]: {
      planKey: videoEditorPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: videoEditorPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: VideoEditorLimits
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
          stripePriceId: process.env.STRIPE_VIDEO_EDITOR_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_VIDEO_EDITOR_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_VIDEO_EDITOR_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_VIDEO_EDITOR_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
