/**
 * Civic-311 (CivicPulse) tier ladder.
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

/** Quantitative limits enforced per account, scaled by subscription tier. */
export interface CivicLimits {
  /** Maximum number of simultaneously open (not resolved/dismissed) reports. */
  maxOpenIssues: number

  /** Maximum number of saved watch areas. */
  maxWatchAreas: number

  /** Whether photos can be attached to reports. */
  photoAttachments: boolean

  /** Whether duplicate detection runs before submitting a report. */
  duplicateDetection: boolean

  /** Whether the watch-area notification feed is enabled. */
  watchAreaAlerts: boolean

  /** Whether CSV export of your report history is enabled. */
  exportHistory: boolean
}

/** Plan keys recognised by the entitlements glue. */
export const civicPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: CivicLimits = {
  maxOpenIssues: 10,
  maxWatchAreas: 2,
  photoAttachments: true,
  duplicateDetection: true,
  watchAreaAlerts: true,
  exportHistory: false,
}

const PRO_LIMITS: CivicLimits = {
  maxOpenIssues: 500,
  maxWatchAreas: 25,
  photoAttachments: true,
  duplicateDetection: true,
  watchAreaAlerts: true,
  exportHistory: true,
}

const TEAM_LIMITS: CivicLimits = {
  maxOpenIssues: 100_000,
  maxWatchAreas: 1_000,
  photoAttachments: true,
  duplicateDetection: true,
  watchAreaAlerts: true,
  exportHistory: true,
}

/** Civic-311 tier registry. Bond it with `setupEntitlements()` at startup. */
export const tierRegistry: TierRegistry<CivicLimits> = defineTiers<CivicLimits>({
  tiers: {
    [civicPlanKeys.free]: {
      planKey: civicPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [civicPlanKeys.proMonthly]: {
      planKey: civicPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [civicPlanKeys.proYearly]: {
      planKey: civicPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [civicPlanKeys.teamMonthly]: {
      planKey: civicPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [civicPlanKeys.teamYearly]: {
      planKey: civicPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: civicPlanKeys.free,
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
  limits: CivicLimits
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
          price: '$9/mo',
          stripePriceId: process.env.STRIPE_CIVIC_311_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$90/yr',
          stripePriceId: process.env.STRIPE_CIVIC_311_PRO_YEARLY ?? null,
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
          price: '$29/mo',
          stripePriceId: process.env.STRIPE_CIVIC_311_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$290/yr',
          stripePriceId: process.env.STRIPE_CIVIC_311_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
