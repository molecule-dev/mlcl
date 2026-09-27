/**
 * AI Travel Agent tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface AiTravelAgentLimits {
  /** Maximum number of bookings a user may hold. */
  maxBookings: number

  /** Maximum number of agent conversations a user may own. */
  maxConversations: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const aiTravelAgentPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: AiTravelAgentLimits = {
  maxBookings: 3,
  maxConversations: 20,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: AiTravelAgentLimits = {
  maxBookings: 200,
  maxConversations: 2000,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: AiTravelAgentLimits = {
  maxBookings: 999_999,
  maxConversations: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<AiTravelAgentLimits> = defineTiers<AiTravelAgentLimits>({
  tiers: {
    [aiTravelAgentPlanKeys.free]: {
      planKey: aiTravelAgentPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [aiTravelAgentPlanKeys.proMonthly]: {
      planKey: aiTravelAgentPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [aiTravelAgentPlanKeys.proYearly]: {
      planKey: aiTravelAgentPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [aiTravelAgentPlanKeys.teamMonthly]: {
      planKey: aiTravelAgentPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [aiTravelAgentPlanKeys.teamYearly]: {
      planKey: aiTravelAgentPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: aiTravelAgentPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: AiTravelAgentLimits
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
          stripePriceId: process.env.STRIPE_AI_TRAVEL_AGENT_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_AI_TRAVEL_AGENT_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_AI_TRAVEL_AGENT_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_AI_TRAVEL_AGENT_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
