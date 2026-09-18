/**
 * Note Taking tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface NoteTakingLimits {
  /** Maximum number of blocks a user may own. */
  maxBlocks: number

  /** Maximum number of databases a user may own. */
  maxDatabases: number

  /** Maximum number of pages a user may own. */
  maxPages: number

  /** Maximum number of templates a user may own. */
  maxTemplates: number

  /** Maximum number of workspaces a user may own. */
  maxWorkspaces: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const noteTakingPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: NoteTakingLimits = {
  maxBlocks: 5,
  maxDatabases: 5,
  maxPages: 5,
  maxTemplates: 5,
  maxWorkspaces: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: NoteTakingLimits = {
  maxBlocks: 500,
  maxDatabases: 500,
  maxPages: 500,
  maxTemplates: 500,
  maxWorkspaces: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: NoteTakingLimits = {
  maxBlocks: 999_999,
  maxDatabases: 999_999,
  maxPages: 999_999,
  maxTemplates: 999_999,
  maxWorkspaces: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<NoteTakingLimits> = defineTiers<NoteTakingLimits>({
  tiers: {
    [noteTakingPlanKeys.free]: {
      planKey: noteTakingPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [noteTakingPlanKeys.proMonthly]: {
      planKey: noteTakingPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [noteTakingPlanKeys.proYearly]: {
      planKey: noteTakingPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [noteTakingPlanKeys.teamMonthly]: {
      planKey: noteTakingPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [noteTakingPlanKeys.teamYearly]: {
      planKey: noteTakingPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: noteTakingPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: NoteTakingLimits
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
          stripePriceId: process.env.STRIPE_NOTE_TAKING_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_NOTE_TAKING_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_NOTE_TAKING_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_NOTE_TAKING_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
