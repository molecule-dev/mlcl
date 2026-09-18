/**
 * Ai Writing Studio tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface AiWritingStudioLimits {
  /** Maximum number of documents a user may own. */
  maxDocuments: number

  /** Maximum number of generate a user may own. */
  maxGenerate: number

  /** Maximum number of images a user may own. */
  maxImages: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const aiWritingStudioPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: AiWritingStudioLimits = {
  maxDocuments: 5,
  maxGenerate: 5,
  maxImages: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: AiWritingStudioLimits = {
  maxDocuments: 500,
  maxGenerate: 500,
  maxImages: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: AiWritingStudioLimits = {
  maxDocuments: 999_999,
  maxGenerate: 999_999,
  maxImages: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<AiWritingStudioLimits> = defineTiers<AiWritingStudioLimits>(
  {
    tiers: {
      [aiWritingStudioPlanKeys.free]: {
        planKey: aiWritingStudioPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [aiWritingStudioPlanKeys.proMonthly]: {
        planKey: aiWritingStudioPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [aiWritingStudioPlanKeys.proYearly]: {
        planKey: aiWritingStudioPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [aiWritingStudioPlanKeys.teamMonthly]: {
        planKey: aiWritingStudioPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [aiWritingStudioPlanKeys.teamYearly]: {
        planKey: aiWritingStudioPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: aiWritingStudioPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  },
)

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: AiWritingStudioLimits
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
          stripePriceId: process.env.STRIPE_AI_WRITING_STUDIO_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_AI_WRITING_STUDIO_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_AI_WRITING_STUDIO_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_AI_WRITING_STUDIO_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
