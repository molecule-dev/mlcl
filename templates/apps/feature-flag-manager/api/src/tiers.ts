/**
 * Feature Flag Manager tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface FeatureFlagManagerLimits {
  /** Maximum number of audit-log a user may own. */
  maxAuditLog: number

  /** Maximum number of environments a user may own. */
  maxEnvironments: number

  /** Maximum number of flags a user may own. */
  maxFlags: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const featureFlagManagerPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: FeatureFlagManagerLimits = {
  maxAuditLog: 5,
  maxEnvironments: 5,
  maxFlags: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: FeatureFlagManagerLimits = {
  maxAuditLog: 500,
  maxEnvironments: 500,
  maxFlags: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: FeatureFlagManagerLimits = {
  maxAuditLog: 999_999,
  maxEnvironments: 999_999,
  maxFlags: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<FeatureFlagManagerLimits> =
  defineTiers<FeatureFlagManagerLimits>({
    tiers: {
      [featureFlagManagerPlanKeys.free]: {
        planKey: featureFlagManagerPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [featureFlagManagerPlanKeys.proMonthly]: {
        planKey: featureFlagManagerPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [featureFlagManagerPlanKeys.proYearly]: {
        planKey: featureFlagManagerPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [featureFlagManagerPlanKeys.teamMonthly]: {
        planKey: featureFlagManagerPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [featureFlagManagerPlanKeys.teamYearly]: {
        planKey: featureFlagManagerPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: featureFlagManagerPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: FeatureFlagManagerLimits
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
          stripePriceId: process.env.STRIPE_FEATURE_FLAG_MANAGER_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_FEATURE_FLAG_MANAGER_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_FEATURE_FLAG_MANAGER_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_FEATURE_FLAG_MANAGER_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
