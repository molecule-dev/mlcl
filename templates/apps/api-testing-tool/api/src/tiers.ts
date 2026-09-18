/**
 * Api Testing Tool tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface ApiTestingToolLimits {
  /** Maximum number of collections a user may own. */
  maxCollections: number

  /** Maximum number of environments a user may own. */
  maxEnvironments: number

  /** Maximum number of history a user may own. */
  maxHistory: number

  /** Maximum number of requests a user may own. */
  maxRequests: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const apiTestingToolPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: ApiTestingToolLimits = {
  maxCollections: 5,
  maxEnvironments: 5,
  maxHistory: 5,
  maxRequests: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: ApiTestingToolLimits = {
  maxCollections: 500,
  maxEnvironments: 500,
  maxHistory: 500,
  maxRequests: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: ApiTestingToolLimits = {
  maxCollections: 999_999,
  maxEnvironments: 999_999,
  maxHistory: 999_999,
  maxRequests: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<ApiTestingToolLimits> = defineTiers<ApiTestingToolLimits>({
  tiers: {
    [apiTestingToolPlanKeys.free]: {
      planKey: apiTestingToolPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [apiTestingToolPlanKeys.proMonthly]: {
      planKey: apiTestingToolPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [apiTestingToolPlanKeys.proYearly]: {
      planKey: apiTestingToolPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [apiTestingToolPlanKeys.teamMonthly]: {
      planKey: apiTestingToolPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [apiTestingToolPlanKeys.teamYearly]: {
      planKey: apiTestingToolPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: apiTestingToolPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: ApiTestingToolLimits
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
          stripePriceId: process.env.STRIPE_API_TESTING_TOOL_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_API_TESTING_TOOL_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_API_TESTING_TOOL_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_API_TESTING_TOOL_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
