/**
 * Personal-finance tier ladder.
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
export interface PersonalFinanceLimits {
  /** Total number of bank/credit/investment accounts a user may track. */
  maxAccounts: number

  /** Total number of transactions the user may record per calendar month. */
  maxTransactionsPerMonth: number

  /** Total number of budgets the user may have active. */
  maxBudgets: number

  /** Total number of savings goals the user may track. */
  maxGoals: number

  /** Whether the user may import transactions from CSV/OFX/QIF files. */
  canImport: boolean

  /** Whether the user may export reports as PDF/CSV. */
  canExport: boolean

  /** Whether the user gets AI-driven transaction categorization. */
  aiCategorization: boolean

  /** Whether the user has access to advanced reports (cashflow, projections). */
  advancedReports: boolean

  /** Maximum number of currencies (USD only on free, multi-currency on paid). */
  maxCurrencies: number

  /** Maximum days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

/** Plan keys recognised by the entitlements glue. Stripe webhook events
 *  set one of these on the `users.planKey` column. */
export const personalFinancePlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: PersonalFinanceLimits = {
  maxAccounts: 2,
  maxTransactionsPerMonth: 100,
  maxBudgets: 3,
  maxGoals: 2,
  canImport: false,
  canExport: false,
  aiCategorization: false,
  advancedReports: false,
  maxCurrencies: 1,
  retentionDays: 365,
}

const PRO_LIMITS: PersonalFinanceLimits = {
  maxAccounts: 20,
  maxTransactionsPerMonth: 10_000,
  maxBudgets: 20,
  maxGoals: 20,
  canImport: true,
  canExport: true,
  aiCategorization: true,
  advancedReports: true,
  maxCurrencies: 25,
  retentionDays: 0,
}

const TEAM_LIMITS: PersonalFinanceLimits = {
  maxAccounts: 999_999,
  maxTransactionsPerMonth: 999_999,
  maxBudgets: 999_999,
  maxGoals: 999_999,
  canImport: true,
  canExport: true,
  aiCategorization: true,
  advancedReports: true,
  maxCurrencies: 999_999,
  retentionDays: 0,
}

/** Personal-finance tier registry. Bond it with `setupEntitlements()` at startup. */
export const tierRegistry: TierRegistry<PersonalFinanceLimits> = defineTiers<PersonalFinanceLimits>(
  {
    tiers: {
      [personalFinancePlanKeys.free]: {
        planKey: personalFinancePlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [personalFinancePlanKeys.proMonthly]: {
        planKey: personalFinancePlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [personalFinancePlanKeys.proYearly]: {
        planKey: personalFinancePlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [personalFinancePlanKeys.teamMonthly]: {
        planKey: personalFinancePlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [personalFinancePlanKeys.teamYearly]: {
        planKey: personalFinancePlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: personalFinancePlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
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
  limits: PersonalFinanceLimits
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
          stripePriceId: process.env.STRIPE_PERSONAL_FINANCE_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$90/yr',
          stripePriceId: process.env.STRIPE_PERSONAL_FINANCE_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_PERSONAL_FINANCE_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$290/yr',
          stripePriceId: process.env.STRIPE_PERSONAL_FINANCE_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
