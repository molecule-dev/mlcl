/**
 * Customer Support Chat tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface CustomerSupportChatLimits {
  /** Maximum number of agents a user may own. */
  maxAgents: number

  /** Maximum number of canned-responses a user may own. */
  maxCannedResponses: number

  /** Maximum number of conversations a user may own. */
  maxConversations: number

  /** Maximum number of messages a user may own. */
  maxMessages: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const customerSupportChatPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: CustomerSupportChatLimits = {
  maxAgents: 5,
  maxCannedResponses: 5,
  maxConversations: 5,
  maxMessages: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: CustomerSupportChatLimits = {
  maxAgents: 500,
  maxCannedResponses: 500,
  maxConversations: 500,
  maxMessages: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: CustomerSupportChatLimits = {
  maxAgents: 999_999,
  maxCannedResponses: 999_999,
  maxConversations: 999_999,
  maxMessages: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<CustomerSupportChatLimits> =
  defineTiers<CustomerSupportChatLimits>({
    tiers: {
      [customerSupportChatPlanKeys.free]: {
        planKey: customerSupportChatPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [customerSupportChatPlanKeys.proMonthly]: {
        planKey: customerSupportChatPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [customerSupportChatPlanKeys.proYearly]: {
        planKey: customerSupportChatPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [customerSupportChatPlanKeys.teamMonthly]: {
        planKey: customerSupportChatPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [customerSupportChatPlanKeys.teamYearly]: {
        planKey: customerSupportChatPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: customerSupportChatPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: CustomerSupportChatLimits
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
          stripePriceId: process.env.STRIPE_CUSTOMER_SUPPORT_CHAT_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_CUSTOMER_SUPPORT_CHAT_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_CUSTOMER_SUPPORT_CHAT_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_CUSTOMER_SUPPORT_CHAT_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
