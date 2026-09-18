/**
 * Calorie Counter tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface CalorieCounterLimits {
  /** Maximum number of diary a user may own. */
  maxDiary: number

  /** Maximum number of foods a user may own. */
  maxFoods: number

  /** Maximum number of goals a user may own. */
  maxGoals: number

  /** Maximum number of meals a user may own. */
  maxMeals: number

  /** Maximum number of nutrition a user may own. */
  maxNutrition: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const calorieCounterPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: CalorieCounterLimits = {
  // Diary entries are per-meal logs — a free user logs 3–5 meals/day, so a
  // conservative free cap covering ~2 months of daily logging.
  maxDiary: 500,
  maxFoods: 50,
  maxGoals: 5,
  maxMeals: 10,
  maxNutrition: 50,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: CalorieCounterLimits = {
  maxDiary: 500,
  maxFoods: 500,
  maxGoals: 500,
  maxMeals: 500,
  maxNutrition: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: CalorieCounterLimits = {
  maxDiary: 999_999,
  maxFoods: 999_999,
  maxGoals: 999_999,
  maxMeals: 999_999,
  maxNutrition: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<CalorieCounterLimits> = defineTiers<CalorieCounterLimits>({
  tiers: {
    [calorieCounterPlanKeys.free]: {
      planKey: calorieCounterPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [calorieCounterPlanKeys.proMonthly]: {
      planKey: calorieCounterPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [calorieCounterPlanKeys.proYearly]: {
      planKey: calorieCounterPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [calorieCounterPlanKeys.teamMonthly]: {
      planKey: calorieCounterPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [calorieCounterPlanKeys.teamYearly]: {
      planKey: calorieCounterPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: calorieCounterPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: CalorieCounterLimits
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
          price: '$15/mo',
          stripePriceId: process.env.STRIPE_CALORIE_COUNTER_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_CALORIE_COUNTER_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_CALORIE_COUNTER_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_CALORIE_COUNTER_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
