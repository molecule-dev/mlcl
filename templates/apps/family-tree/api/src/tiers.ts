/**
 * Family Tree tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface FamilyTreeLimits {
  /** Maximum number of people a user may have on their tree. */
  maxPeople: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their tree data. */
  canExport: boolean
}

export const familyTreePlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  familyMonthly: 'familyMonthly',
  familyYearly: 'familyYearly',
} as const

const FREE_LIMITS: FamilyTreeLimits = {
  maxPeople: 25,
  advancedFeatures: false,
  canExport: false,
}

const PRO_LIMITS: FamilyTreeLimits = {
  maxPeople: 2000,
  advancedFeatures: true,
  canExport: true,
}

const FAMILY_LIMITS: FamilyTreeLimits = {
  maxPeople: 10000,
  advancedFeatures: true,
  canExport: true,
}

export const tierRegistry: TierRegistry<FamilyTreeLimits> = defineTiers<FamilyTreeLimits>({
  tiers: {
    [familyTreePlanKeys.free]: {
      planKey: familyTreePlanKeys.free,
      category: 'free',
      name: 'Seedling',
      limits: FREE_LIMITS,
    },
    [familyTreePlanKeys.proMonthly]: {
      planKey: familyTreePlanKeys.proMonthly,
      category: 'pro',
      name: 'Living Archive',
      limits: PRO_LIMITS,
    },
    [familyTreePlanKeys.proYearly]: {
      planKey: familyTreePlanKeys.proYearly,
      category: 'pro',
      name: 'Living Archive',
      limits: PRO_LIMITS,
    },
    [familyTreePlanKeys.familyMonthly]: {
      planKey: familyTreePlanKeys.familyMonthly,
      category: 'family',
      name: 'Sanctuary Circle',
      limits: FAMILY_LIMITS,
    },
    [familyTreePlanKeys.familyYearly]: {
      planKey: familyTreePlanKeys.familyYearly,
      category: 'family',
      name: 'Sanctuary Circle',
      limits: FAMILY_LIMITS,
    },
  },
  defaultPlanKey: familyTreePlanKeys.free,
  categoryOrder: ['free', 'pro', 'family'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: FamilyTreeLimits
}> {
  return [
    {
      key: 'free',
      name: 'Seedling',
      prices: [{ period: 'month', price: '$0', stripePriceId: null }],
      limits: FREE_LIMITS,
    },
    {
      key: 'pro',
      name: 'Living Archive',
      prices: [
        {
          period: 'month',
          price: '$12/mo',
          stripePriceId: process.env.STRIPE_FAMILY_TREE_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$120/yr',
          stripePriceId: process.env.STRIPE_FAMILY_TREE_PRO_YEARLY ?? null,
        },
      ],
      limits: PRO_LIMITS,
    },
    {
      key: 'family',
      name: 'Sanctuary Circle',
      prices: [
        {
          period: 'month',
          price: '$29/mo',
          stripePriceId: process.env.STRIPE_FAMILY_TREE_FAMILY_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$290/yr',
          stripePriceId: process.env.STRIPE_FAMILY_TREE_FAMILY_YEARLY ?? null,
        },
      ],
      limits: FAMILY_LIMITS,
    },
  ]
}
