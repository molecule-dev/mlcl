/**
 * AI chatbot builder tier ladder.
 *
 * Each user's `planKey` (set by the Stripe webhook glue in
 * `@molecule/api-resource-user`) maps to one of these tiers. Limits are
 * enforced by `enforceLimit(...)` middleware on the relevant POST routes.
 *
 * Stripe price IDs are pulled from environment variables so the same code
 * runs in test, staging, and production. Each environment provisions its
 * own Stripe products via the Stripe dashboard or `stripe products create`.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface AiChatbotBuilderLimits {
  /** Total number of bots a user may create. */
  maxBots: number

  /** Maximum AI chat messages the user may send across all bots per calendar month. */
  maxAiMessagesPerMonth: number

  /** Total number of intents the user may define across bots. */
  maxIntents: number

  /** Maximum number of conversations retained in history. */
  maxConversationsRetained: number

  /** Storage cap for training documents (PDFs, knowledge files), in megabytes. */
  maxTrainingDocsMb: number

  /** Number of custom fine-tuned models the user may register. */
  customModelsAllowed: number

  /** Number of third-party integrations (Slack, Discord, etc.) allowed. */
  integrations: number

  /** Whether the user gets sentiment analysis on conversations. */
  sentiment: boolean

  /** Number of supported languages for multilingual replies. */
  multilingual: number

  /** Whether the user gets advanced analytics on bots and conversations. */
  advancedAnalytics: boolean
}

/** Plan keys recognised by the entitlements glue. Stripe webhook events
 *  set one of these on the `users.planKey` column. */
export const aiChatbotBuilderPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: AiChatbotBuilderLimits = {
  maxBots: 1,
  maxAiMessagesPerMonth: 500,
  maxIntents: 25,
  maxConversationsRetained: 100,
  maxTrainingDocsMb: 10,
  customModelsAllowed: 0,
  integrations: 0,
  sentiment: false,
  multilingual: 1,
  advancedAnalytics: false,
}

const PRO_LIMITS: AiChatbotBuilderLimits = {
  maxBots: 10,
  maxAiMessagesPerMonth: 50_000,
  maxIntents: 500,
  maxConversationsRetained: 100_000,
  maxTrainingDocsMb: 1_024,
  customModelsAllowed: 1,
  integrations: 10,
  sentiment: true,
  multilingual: 25,
  advancedAnalytics: true,
}

const TEAM_LIMITS: AiChatbotBuilderLimits = {
  maxBots: 999_999,
  maxAiMessagesPerMonth: 1_000_000,
  maxIntents: 999_999,
  maxConversationsRetained: 999_999,
  maxTrainingDocsMb: 51_200,
  customModelsAllowed: 999_999,
  integrations: 999_999,
  sentiment: true,
  multilingual: 79,
  advancedAnalytics: true,
}

/** AI chatbot builder tier registry. Bond it with `setupEntitlements()` at startup. */
export const tierRegistry: TierRegistry<AiChatbotBuilderLimits> =
  defineTiers<AiChatbotBuilderLimits>({
    tiers: {
      [aiChatbotBuilderPlanKeys.free]: {
        planKey: aiChatbotBuilderPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [aiChatbotBuilderPlanKeys.proMonthly]: {
        planKey: aiChatbotBuilderPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [aiChatbotBuilderPlanKeys.proYearly]: {
        planKey: aiChatbotBuilderPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [aiChatbotBuilderPlanKeys.teamMonthly]: {
        planKey: aiChatbotBuilderPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [aiChatbotBuilderPlanKeys.teamYearly]: {
        planKey: aiChatbotBuilderPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: aiChatbotBuilderPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

/** Bond the tier registry as the active entitlements provider. */
export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

/**
 * Display configuration for the public pricing page. Resolves Stripe price
 * IDs at runtime so the same code works across test/staging/production.
 *
 * @returns Pricing tier display data ready to render on the `/pricing` page.
 */
export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: AiChatbotBuilderLimits
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
          price: '$49/mo',
          stripePriceId: process.env.STRIPE_AI_CHATBOT_BUILDER_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_AI_CHATBOT_BUILDER_PRO_YEARLY ?? null,
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
          price: '$199/mo',
          stripePriceId: process.env.STRIPE_AI_CHATBOT_BUILDER_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$1990/yr',
          stripePriceId: process.env.STRIPE_AI_CHATBOT_BUILDER_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
