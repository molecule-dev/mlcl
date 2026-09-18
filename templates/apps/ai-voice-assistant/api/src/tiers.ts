/**
 * Ai Voice Assistant tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface AiVoiceAssistantLimits {
  /** Maximum number of conversations a user may own. */
  maxConversations: number

  /** Maximum number of speech a user may own. */
  maxSpeech: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const aiVoiceAssistantPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: AiVoiceAssistantLimits = {
  maxConversations: 5,
  maxSpeech: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: AiVoiceAssistantLimits = {
  maxConversations: 500,
  maxSpeech: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: AiVoiceAssistantLimits = {
  maxConversations: 999_999,
  maxSpeech: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<AiVoiceAssistantLimits> =
  defineTiers<AiVoiceAssistantLimits>({
    tiers: {
      [aiVoiceAssistantPlanKeys.free]: {
        planKey: aiVoiceAssistantPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [aiVoiceAssistantPlanKeys.proMonthly]: {
        planKey: aiVoiceAssistantPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [aiVoiceAssistantPlanKeys.proYearly]: {
        planKey: aiVoiceAssistantPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [aiVoiceAssistantPlanKeys.teamMonthly]: {
        planKey: aiVoiceAssistantPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [aiVoiceAssistantPlanKeys.teamYearly]: {
        planKey: aiVoiceAssistantPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: aiVoiceAssistantPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: AiVoiceAssistantLimits
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
          stripePriceId: process.env.STRIPE_AI_VOICE_ASSISTANT_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_AI_VOICE_ASSISTANT_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_AI_VOICE_ASSISTANT_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_AI_VOICE_ASSISTANT_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
