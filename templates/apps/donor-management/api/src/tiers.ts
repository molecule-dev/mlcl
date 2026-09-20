/**
 * Donor-management tier ladder.
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
export interface DonorManagementLimits {
  /** Maximum number of donors a user may track. */
  maxDonors: number

  /** Maximum number of fundraising campaigns a user may run. */
  maxCampaigns: number

  /** Whether the user gets year-over-year giving analytics. */
  advancedReporting: boolean

  /** Whether the user may export donor / gift data as CSV. */
  dataExport: boolean

  /** Whether the user may batch-generate year-end tax receipts. */
  batchReceipts: boolean
}

/** Plan keys recognised by the entitlements glue. Stripe webhook events
 *  set one of these on the `users.planKey` column. */
export const donorManagementPlanKeys = {
  free: 'free',
  plusMonthly: 'stripeMonthly',
  plusYearly: 'stripeYearly',
  orgMonthly: 'orgMonthly',
  orgYearly: 'orgYearly',
} as const

const FREE_LIMITS: DonorManagementLimits = {
  maxDonors: 100,
  maxCampaigns: 2,
  advancedReporting: false,
  dataExport: false,
  batchReceipts: false,
}

const PLUS_LIMITS: DonorManagementLimits = {
  maxDonors: 5_000,
  maxCampaigns: 25,
  advancedReporting: true,
  dataExport: true,
  batchReceipts: false,
}

const ORG_LIMITS: DonorManagementLimits = {
  maxDonors: 999_999,
  maxCampaigns: 999_999,
  advancedReporting: true,
  dataExport: true,
  batchReceipts: true,
}

/** Donor-management tier registry. Bond it with `setupEntitlements()` at startup. */
export const tierRegistry: TierRegistry<DonorManagementLimits> = defineTiers<DonorManagementLimits>(
  {
    tiers: {
      [donorManagementPlanKeys.free]: {
        planKey: donorManagementPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [donorManagementPlanKeys.plusMonthly]: {
        planKey: donorManagementPlanKeys.plusMonthly,
        category: 'plus',
        name: 'Plus',
        limits: PLUS_LIMITS,
      },
      [donorManagementPlanKeys.plusYearly]: {
        planKey: donorManagementPlanKeys.plusYearly,
        category: 'plus',
        name: 'Plus',
        limits: PLUS_LIMITS,
      },
      [donorManagementPlanKeys.orgMonthly]: {
        planKey: donorManagementPlanKeys.orgMonthly,
        category: 'org',
        name: 'Organization',
        limits: ORG_LIMITS,
      },
      [donorManagementPlanKeys.orgYearly]: {
        planKey: donorManagementPlanKeys.orgYearly,
        category: 'org',
        name: 'Organization',
        limits: ORG_LIMITS,
      },
    },
    defaultPlanKey: donorManagementPlanKeys.free,
    categoryOrder: ['free', 'plus', 'org'],
  },
)

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
  limits: DonorManagementLimits
}> {
  return [
    {
      key: 'free',
      name: 'Free',
      prices: [{ period: 'month', price: '$0', stripePriceId: null }],
      limits: FREE_LIMITS,
    },
    {
      key: 'plus',
      name: 'Plus',
      prices: [
        {
          period: 'month',
          price: '$19/mo',
          stripePriceId: process.env.STRIPE_DONOR_MANAGEMENT_PLUS_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$190/yr',
          stripePriceId: process.env.STRIPE_DONOR_MANAGEMENT_PLUS_YEARLY ?? null,
        },
      ],
      limits: PLUS_LIMITS,
    },
    {
      key: 'org',
      name: 'Organization',
      prices: [
        {
          period: 'month',
          price: '$49/mo',
          stripePriceId: process.env.STRIPE_DONOR_MANAGEMENT_ORG_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_DONOR_MANAGEMENT_ORG_YEARLY ?? null,
        },
      ],
      limits: ORG_LIMITS,
    },
  ]
}
