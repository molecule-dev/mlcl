/**
 * Internal Knowledge Base tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface InternalKnowledgeBaseLimits {
  /** Maximum number of articles a user may own. */
  maxArticles: number

  /** Maximum number of spaces a user may own. */
  maxSpaces: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const internalKnowledgeBasePlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: InternalKnowledgeBaseLimits = {
  maxArticles: 5,
  maxSpaces: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: InternalKnowledgeBaseLimits = {
  maxArticles: 500,
  maxSpaces: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: InternalKnowledgeBaseLimits = {
  maxArticles: 999_999,
  maxSpaces: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<InternalKnowledgeBaseLimits> =
  defineTiers<InternalKnowledgeBaseLimits>({
    tiers: {
      [internalKnowledgeBasePlanKeys.free]: {
        planKey: internalKnowledgeBasePlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [internalKnowledgeBasePlanKeys.proMonthly]: {
        planKey: internalKnowledgeBasePlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [internalKnowledgeBasePlanKeys.proYearly]: {
        planKey: internalKnowledgeBasePlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [internalKnowledgeBasePlanKeys.teamMonthly]: {
        planKey: internalKnowledgeBasePlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [internalKnowledgeBasePlanKeys.teamYearly]: {
        planKey: internalKnowledgeBasePlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: internalKnowledgeBasePlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: InternalKnowledgeBaseLimits
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
          stripePriceId: process.env.STRIPE_INTERNAL_KNOWLEDGE_BASE_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_INTERNAL_KNOWLEDGE_BASE_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_INTERNAL_KNOWLEDGE_BASE_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_INTERNAL_KNOWLEDGE_BASE_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
