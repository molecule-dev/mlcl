/**
 * Budget Planner tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface BudgetPlannerLimits {
  /** Maximum number of accounts a user may own. */
  maxAccounts: number

  /** Maximum number of categories a user may own. */
  maxCategories: number

  /** Maximum number of envelopes a user may own. */
  maxEnvelopes: number

  /** Maximum number of transactions a user may own. */
  maxTransactions: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const budgetPlannerPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: BudgetPlannerLimits = {
  maxAccounts: 5,
  maxCategories: 5,
  maxEnvelopes: 5,
  maxTransactions: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: BudgetPlannerLimits = {
  maxAccounts: 500,
  maxCategories: 500,
  maxEnvelopes: 500,
  maxTransactions: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: BudgetPlannerLimits = {
  maxAccounts: 999_999,
  maxCategories: 999_999,
  maxEnvelopes: 999_999,
  maxTransactions: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<BudgetPlannerLimits> = defineTiers<BudgetPlannerLimits>({
  tiers: {
    [budgetPlannerPlanKeys.free]: {
      planKey: budgetPlannerPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [budgetPlannerPlanKeys.proMonthly]: {
      planKey: budgetPlannerPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [budgetPlannerPlanKeys.proYearly]: {
      planKey: budgetPlannerPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [budgetPlannerPlanKeys.teamMonthly]: {
      planKey: budgetPlannerPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [budgetPlannerPlanKeys.teamYearly]: {
      planKey: budgetPlannerPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: budgetPlannerPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: BudgetPlannerLimits
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
          stripePriceId: process.env.STRIPE_BUDGET_PLANNER_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_BUDGET_PLANNER_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_BUDGET_PLANNER_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_BUDGET_PLANNER_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
