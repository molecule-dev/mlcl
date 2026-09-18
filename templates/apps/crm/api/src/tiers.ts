/**
 * CRM tier ladder.
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
export interface CrmLimits {
  /** Maximum number of contacts a user may track. */
  maxContacts: number

  /** Maximum number of deals a user may have open at once. */
  maxDeals: number

  /** Maximum number of pipelines a user may define. */
  maxPipelines: number

  /** Maximum number of activities (calls, emails, notes) the user may log. */
  maxActivities: number

  /** Maximum number of companies a user may track. */
  maxCompanies: number

  /** Whether the user gets advanced reporting / analytics. */
  advancedAnalytics: boolean

  /** Whether the user may export contact / deal data as CSV/JSON. */
  dataExport: boolean

  /** Whether the user may define custom fields on contacts and deals. */
  customFields: boolean

  /** Whether the user may use third-party integrations (Slack, Zapier, etc.). */
  integrations: boolean
}

/** Plan keys recognised by the entitlements glue. Stripe webhook events
 *  set one of these on the `users.planKey` column. */
export const crmPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: CrmLimits = {
  maxContacts: 100,
  maxDeals: 10,
  maxPipelines: 1,
  maxActivities: 500,
  maxCompanies: 25,
  advancedAnalytics: false,
  dataExport: false,
  customFields: false,
  integrations: false,
}

const PRO_LIMITS: CrmLimits = {
  maxContacts: 5_000,
  maxDeals: 500,
  maxPipelines: 10,
  maxActivities: 50_000,
  maxCompanies: 1_000,
  advancedAnalytics: true,
  dataExport: true,
  customFields: true,
  integrations: true,
}

const TEAM_LIMITS: CrmLimits = {
  maxContacts: 999_999,
  maxDeals: 999_999,
  maxPipelines: 999_999,
  maxActivities: 999_999,
  maxCompanies: 999_999,
  advancedAnalytics: true,
  dataExport: true,
  customFields: true,
  integrations: true,
}

/** CRM tier registry. Bond it with `setupEntitlements()` at startup. */
export const tierRegistry: TierRegistry<CrmLimits> = defineTiers<CrmLimits>({
  tiers: {
    [crmPlanKeys.free]: {
      planKey: crmPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [crmPlanKeys.proMonthly]: {
      planKey: crmPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [crmPlanKeys.proYearly]: {
      planKey: crmPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [crmPlanKeys.teamMonthly]: {
      planKey: crmPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [crmPlanKeys.teamYearly]: {
      planKey: crmPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: crmPlanKeys.free,
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
  limits: CrmLimits
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
          stripePriceId: process.env.STRIPE_CRM_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$190/yr',
          stripePriceId: process.env.STRIPE_CRM_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_CRM_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_CRM_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
