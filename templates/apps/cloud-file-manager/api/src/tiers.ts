/**
 * Cloud File Manager tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface CloudFileManagerLimits {
  /** Maximum number of files a user may own. */
  maxFiles: number

  /** Maximum number of folders a user may own. */
  maxFolders: number

  /** Maximum number of shares a user may own. */
  maxShares: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const cloudFileManagerPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: CloudFileManagerLimits = {
  maxFiles: 5,
  maxFolders: 5,
  maxShares: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: CloudFileManagerLimits = {
  maxFiles: 500,
  maxFolders: 500,
  maxShares: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: CloudFileManagerLimits = {
  maxFiles: 999_999,
  maxFolders: 999_999,
  maxShares: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<CloudFileManagerLimits> =
  defineTiers<CloudFileManagerLimits>({
    tiers: {
      [cloudFileManagerPlanKeys.free]: {
        planKey: cloudFileManagerPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [cloudFileManagerPlanKeys.proMonthly]: {
        planKey: cloudFileManagerPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [cloudFileManagerPlanKeys.proYearly]: {
        planKey: cloudFileManagerPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [cloudFileManagerPlanKeys.teamMonthly]: {
        planKey: cloudFileManagerPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [cloudFileManagerPlanKeys.teamYearly]: {
        planKey: cloudFileManagerPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: cloudFileManagerPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: CloudFileManagerLimits
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
          stripePriceId: process.env.STRIPE_CLOUD_FILE_MANAGER_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_CLOUD_FILE_MANAGER_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_CLOUD_FILE_MANAGER_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_CLOUD_FILE_MANAGER_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
