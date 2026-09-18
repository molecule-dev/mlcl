/**
 * Team-chat tier ladder.
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
export interface TeamChatLimits {
  /** Total number of channels the workspace may have. */
  maxChannels: number

  /** Total number of members the workspace may invite. */
  maxMembers: number

  /** Maximum number of messages that may be sent per calendar day. */
  maxMessagesPerDay: number

  /** Number of days messages are retained. 0 = retained forever. */
  retentionDays: number

  /** Per-file upload size cap, in megabytes. 0 = uploads disabled. */
  fileUploadMb: number

  /** Whether the workspace may add custom emoji reactions. */
  customEmoji: boolean

  /** Whether threaded replies on messages are enabled. */
  threadsEnabled: boolean

  /** Whether voice / video calls are available. */
  voiceVideoCalls: boolean

  /** Number of external integrations (webhooks, bots, third-party services). */
  externalIntegrations: number
}

/** Plan keys recognised by the entitlements glue. */
export const teamChatPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: TeamChatLimits = {
  maxChannels: 10,
  maxMembers: 10,
  maxMessagesPerDay: 1_000,
  retentionDays: 30,
  fileUploadMb: 0,
  customEmoji: false,
  threadsEnabled: false,
  voiceVideoCalls: false,
  externalIntegrations: 0,
}

const PRO_LIMITS: TeamChatLimits = {
  maxChannels: 100,
  maxMembers: 100,
  maxMessagesPerDay: 50_000,
  retentionDays: 365,
  fileUploadMb: 1_024,
  customEmoji: true,
  threadsEnabled: true,
  voiceVideoCalls: true,
  externalIntegrations: 10,
}

const TEAM_LIMITS: TeamChatLimits = {
  maxChannels: 999_999,
  maxMembers: 999_999,
  maxMessagesPerDay: 999_999,
  retentionDays: 0,
  fileUploadMb: 102_400,
  customEmoji: true,
  threadsEnabled: true,
  voiceVideoCalls: true,
  externalIntegrations: 999_999,
}

/** Team-chat tier registry. Bond it with `setupEntitlements()` at startup. */
export const tierRegistry: TierRegistry<TeamChatLimits> = defineTiers<TeamChatLimits>({
  tiers: {
    [teamChatPlanKeys.free]: {
      planKey: teamChatPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [teamChatPlanKeys.proMonthly]: {
      planKey: teamChatPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [teamChatPlanKeys.proYearly]: {
      planKey: teamChatPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [teamChatPlanKeys.teamMonthly]: {
      planKey: teamChatPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [teamChatPlanKeys.teamYearly]: {
      planKey: teamChatPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: teamChatPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

/** Bond the tier registry as the active entitlements provider. */
export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

/**
 * Display configuration for the public pricing page.
 *
 * @returns Pricing tier display data ready to render on the `/pricing` page.
 */
export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: TeamChatLimits
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
          price: '$9/mo per user',
          stripePriceId: process.env.STRIPE_TEAM_CHAT_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$90/yr per user',
          stripePriceId: process.env.STRIPE_TEAM_CHAT_PRO_YEARLY ?? null,
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
          price: '$19/mo per user',
          stripePriceId: process.env.STRIPE_TEAM_CHAT_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$190/yr per user',
          stripePriceId: process.env.STRIPE_TEAM_CHAT_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
