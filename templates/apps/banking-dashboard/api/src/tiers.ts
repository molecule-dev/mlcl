/**
 * Banking Dashboard tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface BankingDashboardLimits {
  /** Maximum number of accounts a user may own. */
  maxAccounts: number

  /** Maximum number of cards a user may own. */
  maxCards: number

  /** Maximum number of statements a user may own. */
  maxStatements: number

  /** Maximum number of transactions a user may own. */
  maxTransactions: number

  /** Maximum number of transfers a user may own. */
  maxTransfers: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const bankingDashboardPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: BankingDashboardLimits = {
  maxAccounts: 5,
  maxCards: 5,
  maxStatements: 5,
  maxTransactions: 5,
  maxTransfers: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: BankingDashboardLimits = {
  maxAccounts: 500,
  maxCards: 500,
  maxStatements: 500,
  maxTransactions: 500,
  maxTransfers: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: BankingDashboardLimits = {
  maxAccounts: 999_999,
  maxCards: 999_999,
  maxStatements: 999_999,
  maxTransactions: 999_999,
  maxTransfers: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<BankingDashboardLimits> =
  defineTiers<BankingDashboardLimits>({
    tiers: {
      [bankingDashboardPlanKeys.free]: {
        planKey: bankingDashboardPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [bankingDashboardPlanKeys.proMonthly]: {
        planKey: bankingDashboardPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [bankingDashboardPlanKeys.proYearly]: {
        planKey: bankingDashboardPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [bankingDashboardPlanKeys.teamMonthly]: {
        planKey: bankingDashboardPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [bankingDashboardPlanKeys.teamYearly]: {
        planKey: bankingDashboardPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: bankingDashboardPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: BankingDashboardLimits
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
          stripePriceId: process.env.STRIPE_BANKING_DASHBOARD_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_BANKING_DASHBOARD_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_BANKING_DASHBOARD_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_BANKING_DASHBOARD_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
