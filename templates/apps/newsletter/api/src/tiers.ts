/**
 * Newsletter tier ladder.
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
export interface NewsletterLimits {
  /** Total number of issues a user may have at any time (drafts + published). */
  maxIssues: number

  /** Maximum number of subscribers on the list (all statuses). */
  maxSubscribers: number

  /** Whether the user may schedule issues for future delivery. */
  canScheduleIssues: boolean

  /** Whether the user sees per-issue open/click analytics. */
  advancedAnalytics: boolean

  /** Whether the user may publish paid-tier-only issues. */
  paidTiers: boolean

  /** Whether the user may export their subscriber list as JSON / CSV. */
  canExport: boolean
}

/** Plan keys recognised by the entitlements glue. */
export const newsletterPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: NewsletterLimits = {
  maxIssues: 5,
  maxSubscribers: 500,
  canScheduleIssues: false,
  advancedAnalytics: false,
  paidTiers: false,
  canExport: false,
}

const PRO_LIMITS: NewsletterLimits = {
  maxIssues: 500,
  maxSubscribers: 25_000,
  canScheduleIssues: true,
  advancedAnalytics: true,
  paidTiers: true,
  canExport: true,
}

const TEAM_LIMITS: NewsletterLimits = {
  maxIssues: 999_999,
  maxSubscribers: 999_999,
  canScheduleIssues: true,
  advancedAnalytics: true,
  paidTiers: true,
  canExport: true,
}

/** Newsletter tier registry. Bond it with `setupEntitlements()` at startup. */
export const tierRegistry: TierRegistry<NewsletterLimits> = defineTiers<NewsletterLimits>({
  tiers: {
    [newsletterPlanKeys.free]: {
      planKey: newsletterPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [newsletterPlanKeys.proMonthly]: {
      planKey: newsletterPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [newsletterPlanKeys.proYearly]: {
      planKey: newsletterPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [newsletterPlanKeys.teamMonthly]: {
      planKey: newsletterPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [newsletterPlanKeys.teamYearly]: {
      planKey: newsletterPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: newsletterPlanKeys.free,
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
  limits: NewsletterLimits
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
          price: '$8/mo',
          stripePriceId: process.env.STRIPE_NEWSLETTER_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$80/yr',
          stripePriceId: process.env.STRIPE_NEWSLETTER_PRO_YEARLY ?? null,
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
          price: '$25/mo',
          stripePriceId: process.env.STRIPE_NEWSLETTER_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$250/yr',
          stripePriceId: process.env.STRIPE_NEWSLETTER_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
