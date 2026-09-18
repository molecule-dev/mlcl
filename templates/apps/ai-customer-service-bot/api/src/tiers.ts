/**
 * Ai Customer Service Bot tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface AiCustomerServiceBotLimits {
  /** Maximum number of conversations a user may own. */
  maxConversations: number

  /** Maximum number of knowledge a user may own. */
  maxKnowledge: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const aiCustomerServiceBotPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: AiCustomerServiceBotLimits = {
  maxConversations: 5,
  maxKnowledge: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: AiCustomerServiceBotLimits = {
  maxConversations: 500,
  maxKnowledge: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: AiCustomerServiceBotLimits = {
  maxConversations: 999_999,
  maxKnowledge: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<AiCustomerServiceBotLimits> =
  defineTiers<AiCustomerServiceBotLimits>({
    tiers: {
      [aiCustomerServiceBotPlanKeys.free]: {
        planKey: aiCustomerServiceBotPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [aiCustomerServiceBotPlanKeys.proMonthly]: {
        planKey: aiCustomerServiceBotPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [aiCustomerServiceBotPlanKeys.proYearly]: {
        planKey: aiCustomerServiceBotPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [aiCustomerServiceBotPlanKeys.teamMonthly]: {
        planKey: aiCustomerServiceBotPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [aiCustomerServiceBotPlanKeys.teamYearly]: {
        planKey: aiCustomerServiceBotPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: aiCustomerServiceBotPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: AiCustomerServiceBotLimits
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
          stripePriceId: process.env.STRIPE_AI_CUSTOMER_SERVICE_BOT_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_AI_CUSTOMER_SERVICE_BOT_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_AI_CUSTOMER_SERVICE_BOT_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_AI_CUSTOMER_SERVICE_BOT_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
