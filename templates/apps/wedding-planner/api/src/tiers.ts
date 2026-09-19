/**
 * Wedding Planner tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface WeddingPlannerLimits {
  /** Maximum number of guests a user may track. */
  maxGuests: number

  /** Maximum number of budget line items a user may track. */
  maxBudgetItems: number

  /** Maximum number of vendors a user may track. */
  maxVendors: number

  /** Maximum number of tables in the seating chart. */
  maxTables: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const weddingPlannerPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  familyMonthly: 'familyMonthly',
  familyYearly: 'familyYearly',
} as const

const FREE_LIMITS: WeddingPlannerLimits = {
  // A free couple keeps an intimate guest list and the core planner tools.
  maxGuests: 50,
  maxBudgetItems: 15,
  maxVendors: 10,
  maxTables: 8,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: WeddingPlannerLimits = {
  maxGuests: 300,
  maxBudgetItems: 500,
  maxVendors: 200,
  maxTables: 50,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const FAMILY_LIMITS: WeddingPlannerLimits = {
  maxGuests: 999_999,
  maxBudgetItems: 999_999,
  maxVendors: 999_999,
  maxTables: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<WeddingPlannerLimits> = defineTiers<WeddingPlannerLimits>({
  tiers: {
    [weddingPlannerPlanKeys.free]: {
      planKey: weddingPlannerPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [weddingPlannerPlanKeys.proMonthly]: {
      planKey: weddingPlannerPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [weddingPlannerPlanKeys.proYearly]: {
      planKey: weddingPlannerPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [weddingPlannerPlanKeys.familyMonthly]: {
      planKey: weddingPlannerPlanKeys.familyMonthly,
      category: 'family',
      name: 'Family',
      limits: FAMILY_LIMITS,
    },
    [weddingPlannerPlanKeys.familyYearly]: {
      planKey: weddingPlannerPlanKeys.familyYearly,
      category: 'family',
      name: 'Family',
      limits: FAMILY_LIMITS,
    },
  },
  defaultPlanKey: weddingPlannerPlanKeys.free,
  categoryOrder: ['free', 'pro', 'family'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: WeddingPlannerLimits
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
          price: '$12/mo',
          stripePriceId: process.env.STRIPE_WEDDING_PLANNER_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$120/yr',
          stripePriceId: process.env.STRIPE_WEDDING_PLANNER_PRO_YEARLY ?? null,
        },
      ],
      limits: PRO_LIMITS,
    },
    {
      key: 'family',
      name: 'Family',
      prices: [
        {
          period: 'month',
          price: '$24/mo',
          stripePriceId: process.env.STRIPE_WEDDING_PLANNER_FAMILY_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$240/yr',
          stripePriceId: process.env.STRIPE_WEDDING_PLANNER_FAMILY_YEARLY ?? null,
        },
      ],
      limits: FAMILY_LIMITS,
    },
  ]
}
