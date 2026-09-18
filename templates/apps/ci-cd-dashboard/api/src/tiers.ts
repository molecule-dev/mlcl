/**
 * Ci Cd Dashboard tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface CiCdDashboardLimits {
  /** Maximum number of artifacts a user may own. */
  maxArtifacts: number

  /** Maximum number of builds a user may own. */
  maxBuilds: number

  /** Maximum number of pipelines a user may own. */
  maxPipelines: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const ciCdDashboardPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: CiCdDashboardLimits = {
  maxArtifacts: 5,
  maxBuilds: 5,
  maxPipelines: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: CiCdDashboardLimits = {
  maxArtifacts: 500,
  maxBuilds: 500,
  maxPipelines: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: CiCdDashboardLimits = {
  maxArtifacts: 999_999,
  maxBuilds: 999_999,
  maxPipelines: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<CiCdDashboardLimits> = defineTiers<CiCdDashboardLimits>({
  tiers: {
    [ciCdDashboardPlanKeys.free]: {
      planKey: ciCdDashboardPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [ciCdDashboardPlanKeys.proMonthly]: {
      planKey: ciCdDashboardPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [ciCdDashboardPlanKeys.proYearly]: {
      planKey: ciCdDashboardPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [ciCdDashboardPlanKeys.teamMonthly]: {
      planKey: ciCdDashboardPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [ciCdDashboardPlanKeys.teamYearly]: {
      planKey: ciCdDashboardPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: ciCdDashboardPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: CiCdDashboardLimits
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
          stripePriceId: process.env.STRIPE_CI_CD_DASHBOARD_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_CI_CD_DASHBOARD_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_CI_CD_DASHBOARD_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_CI_CD_DASHBOARD_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
