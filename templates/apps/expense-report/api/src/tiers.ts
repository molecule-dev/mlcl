/**
 * Expense Report tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface ExpenseReportLimits {
  /** Maximum number of approvals a user may own. */
  maxApprovals: number

  /** Maximum number of expenses a user may own. */
  maxExpenses: number

  /** Maximum number of policies a user may own. */
  maxPolicies: number

  /** Maximum number of receipts a user may own. */
  maxReceipts: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const expenseReportPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: ExpenseReportLimits = {
  maxApprovals: 5,
  // The demo seed gives every new user 11 expenses (4 submitted + 2 approved +
  // 3 reimbursed + 2 drafts) and 4 policies, so a cap of 5 put them over quota
  // on arrival: POST /api/expenses answered 403 before they could add a single
  // one, which is this app's headline action. A free limit has to sit above
  // what the demo already occupies, with room to actually use the feature.
  maxExpenses: 25,
  maxPolicies: 10,
  maxReceipts: 25,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: ExpenseReportLimits = {
  maxApprovals: 500,
  maxExpenses: 500,
  maxPolicies: 500,
  maxReceipts: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: ExpenseReportLimits = {
  maxApprovals: 999_999,
  maxExpenses: 999_999,
  maxPolicies: 999_999,
  maxReceipts: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<ExpenseReportLimits> = defineTiers<ExpenseReportLimits>({
  tiers: {
    [expenseReportPlanKeys.free]: {
      planKey: expenseReportPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [expenseReportPlanKeys.proMonthly]: {
      planKey: expenseReportPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [expenseReportPlanKeys.proYearly]: {
      planKey: expenseReportPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [expenseReportPlanKeys.teamMonthly]: {
      planKey: expenseReportPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [expenseReportPlanKeys.teamYearly]: {
      planKey: expenseReportPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: expenseReportPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: ExpenseReportLimits
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
          stripePriceId: process.env.STRIPE_EXPENSE_REPORT_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_EXPENSE_REPORT_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_EXPENSE_REPORT_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_EXPENSE_REPORT_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
