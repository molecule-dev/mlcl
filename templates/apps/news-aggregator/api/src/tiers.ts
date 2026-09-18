/**
 * News Aggregator tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface NewsAggregatorLimits {
  /** Maximum number of articles a user may own. */
  maxArticles: number

  /** Maximum number of bookmarks a user may own. */
  maxBookmarks: number

  /** Maximum number of categories a user may own. */
  maxCategories: number

  /** Maximum number of sources a user may own. */
  maxSources: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const newsAggregatorPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: NewsAggregatorLimits = {
  maxArticles: 5,
  maxBookmarks: 5,
  maxCategories: 5,
  maxSources: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: NewsAggregatorLimits = {
  maxArticles: 500,
  maxBookmarks: 500,
  maxCategories: 500,
  maxSources: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: NewsAggregatorLimits = {
  maxArticles: 999_999,
  maxBookmarks: 999_999,
  maxCategories: 999_999,
  maxSources: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<NewsAggregatorLimits> = defineTiers<NewsAggregatorLimits>({
  tiers: {
    [newsAggregatorPlanKeys.free]: {
      planKey: newsAggregatorPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [newsAggregatorPlanKeys.proMonthly]: {
      planKey: newsAggregatorPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [newsAggregatorPlanKeys.proYearly]: {
      planKey: newsAggregatorPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [newsAggregatorPlanKeys.teamMonthly]: {
      planKey: newsAggregatorPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [newsAggregatorPlanKeys.teamYearly]: {
      planKey: newsAggregatorPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: newsAggregatorPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: NewsAggregatorLimits
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
          stripePriceId: process.env.STRIPE_NEWS_AGGREGATOR_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_NEWS_AGGREGATOR_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_NEWS_AGGREGATOR_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_NEWS_AGGREGATOR_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
