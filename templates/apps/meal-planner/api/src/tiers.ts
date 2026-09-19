/**
 * Meal Planner tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface MealPlannerLimits {
  /** Maximum number of personal recipes a user may own. */
  maxRecipes: number

  /** Maximum number of planned weeks a user may keep meal plans for. */
  maxPlanWeeks: number

  /** Maximum number of pantry items a user may track. */
  maxPantryItems: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const mealPlannerPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  familyMonthly: 'familyMonthly',
  familyYearly: 'familyYearly',
} as const

const FREE_LIMITS: MealPlannerLimits = {
  // A free cook keeps a small personal recipe box plus the current and one
  // upcoming week of planning.
  maxRecipes: 25,
  maxPlanWeeks: 2,
  maxPantryItems: 30,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: MealPlannerLimits = {
  maxRecipes: 500,
  maxPlanWeeks: 52,
  maxPantryItems: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const FAMILY_LIMITS: MealPlannerLimits = {
  maxRecipes: 999_999,
  maxPlanWeeks: 999_999,
  maxPantryItems: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<MealPlannerLimits> = defineTiers<MealPlannerLimits>({
  tiers: {
    [mealPlannerPlanKeys.free]: {
      planKey: mealPlannerPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [mealPlannerPlanKeys.proMonthly]: {
      planKey: mealPlannerPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [mealPlannerPlanKeys.proYearly]: {
      planKey: mealPlannerPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [mealPlannerPlanKeys.familyMonthly]: {
      planKey: mealPlannerPlanKeys.familyMonthly,
      category: 'family',
      name: 'Family',
      limits: FAMILY_LIMITS,
    },
    [mealPlannerPlanKeys.familyYearly]: {
      planKey: mealPlannerPlanKeys.familyYearly,
      category: 'family',
      name: 'Family',
      limits: FAMILY_LIMITS,
    },
  },
  defaultPlanKey: mealPlannerPlanKeys.free,
  categoryOrder: ['free', 'pro', 'family'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: MealPlannerLimits
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
          stripePriceId: process.env.STRIPE_MEAL_PLANNER_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$90/yr',
          stripePriceId: process.env.STRIPE_MEAL_PLANNER_PRO_YEARLY ?? null,
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
          price: '$19/mo',
          stripePriceId: process.env.STRIPE_MEAL_PLANNER_FAMILY_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$190/yr',
          stripePriceId: process.env.STRIPE_MEAL_PLANNER_FAMILY_YEARLY ?? null,
        },
      ],
      limits: FAMILY_LIMITS,
    },
  ]
}
