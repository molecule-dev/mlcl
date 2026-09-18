/**
 * Helpdesk-ticketing tier ladder.
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

/** Quantitative limits enforced per workspace, scaled by subscription tier. */
export interface HelpdeskLimits {
  /** Maximum number of simultaneously open (non-closed) tickets. */
  maxOpenTickets: number

  /** Maximum number of agent seats. */
  maxAgents: number

  /** Maximum number of knowledge base articles. */
  maxKbArticles: number

  /** Maximum number of saved macros / canned replies. */
  maxMacros: number

  /** Whether SLA tracking + breach alerts are enabled. */
  slaTracking: boolean

  /** Whether tickets/users can be extended with custom fields. */
  customFields: boolean

  /** Whether automation/workflow rules are enabled. */
  automation: boolean

  /** Whether post-resolution satisfaction (CSAT) surveys are enabled. */
  satisfactionSurveys: boolean

  /** Maximum number of distinct brands the workspace may serve. */
  multiBrand: number
}

/** Plan keys recognised by the entitlements glue. */
export const helpdeskPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: HelpdeskLimits = {
  maxOpenTickets: 50,
  maxAgents: 2,
  maxKbArticles: 10,
  maxMacros: 5,
  slaTracking: false,
  customFields: false,
  automation: false,
  satisfactionSurveys: false,
  multiBrand: 1,
}

const PRO_LIMITS: HelpdeskLimits = {
  maxOpenTickets: 5_000,
  maxAgents: 10,
  maxKbArticles: 500,
  maxMacros: 100,
  slaTracking: true,
  customFields: true,
  automation: true,
  satisfactionSurveys: true,
  multiBrand: 1,
}

const TEAM_LIMITS: HelpdeskLimits = {
  maxOpenTickets: 999_999,
  maxAgents: 999_999,
  maxKbArticles: 999_999,
  maxMacros: 999_999,
  slaTracking: true,
  customFields: true,
  automation: true,
  satisfactionSurveys: true,
  multiBrand: 999_999,
}

/** Helpdesk-ticketing tier registry. Bond it with `setupEntitlements()` at startup. */
export const tierRegistry: TierRegistry<HelpdeskLimits> = defineTiers<HelpdeskLimits>({
  tiers: {
    [helpdeskPlanKeys.free]: {
      planKey: helpdeskPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [helpdeskPlanKeys.proMonthly]: {
      planKey: helpdeskPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [helpdeskPlanKeys.proYearly]: {
      planKey: helpdeskPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [helpdeskPlanKeys.teamMonthly]: {
      planKey: helpdeskPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [helpdeskPlanKeys.teamYearly]: {
      planKey: helpdeskPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: helpdeskPlanKeys.free,
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
  limits: HelpdeskLimits
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
          price: '$19/mo',
          stripePriceId: process.env.STRIPE_HELPDESK_TICKETING_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$190/yr',
          stripePriceId: process.env.STRIPE_HELPDESK_TICKETING_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_HELPDESK_TICKETING_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_HELPDESK_TICKETING_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
