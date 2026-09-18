/**
 * Music Daw tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface MusicDawLimits {
  /** Maximum number of effects a user may own. */
  maxEffects: number

  /** Maximum number of exports a user may own. */
  maxExports: number

  /** Maximum number of instruments a user may own. */
  maxInstruments: number

  /** Maximum number of projects a user may own. */
  maxProjects: number

  /** Maximum number of tracks a user may own. */
  maxTracks: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const musicDawPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: MusicDawLimits = {
  maxEffects: 5,
  maxExports: 5,
  maxInstruments: 5,
  maxProjects: 5,
  maxTracks: 5,
  advancedFeatures: false,
  // Free CAN export (MP3, capped by maxExports) — the landing/about/billing
  // copy all promise watermark-free export on every plan; `false` here
  // contradicted maxExports: 5 above.
  canExport: true,
  retentionDays: 90,
}

const PRO_LIMITS: MusicDawLimits = {
  maxEffects: 500,
  maxExports: 500,
  maxInstruments: 500,
  maxProjects: 500,
  maxTracks: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: MusicDawLimits = {
  maxEffects: 999_999,
  maxExports: 999_999,
  maxInstruments: 999_999,
  maxProjects: 999_999,
  maxTracks: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<MusicDawLimits> = defineTiers<MusicDawLimits>({
  tiers: {
    [musicDawPlanKeys.free]: {
      planKey: musicDawPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [musicDawPlanKeys.proMonthly]: {
      planKey: musicDawPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [musicDawPlanKeys.proYearly]: {
      planKey: musicDawPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [musicDawPlanKeys.teamMonthly]: {
      planKey: musicDawPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [musicDawPlanKeys.teamYearly]: {
      planKey: musicDawPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: musicDawPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: MusicDawLimits
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
          stripePriceId: process.env.STRIPE_MUSIC_DAW_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_MUSIC_DAW_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_MUSIC_DAW_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_MUSIC_DAW_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
