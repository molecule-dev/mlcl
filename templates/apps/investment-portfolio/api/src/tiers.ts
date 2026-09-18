/**
 * Investment Portfolio tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface InvestmentPortfolioLimits {
  /** Maximum number of holdings a user may own. */
  maxHoldings: number

  /** Maximum number of news a user may own. */
  maxNews: number

  /** Maximum number of performance a user may own. */
  maxPerformance: number

  /** Maximum number of transactions a user may own. */
  maxTransactions: number

  /** Maximum number of watchlist a user may own. */
  maxWatchlist: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const investmentPortfolioPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: InvestmentPortfolioLimits = {
  maxHoldings: 5,
  maxNews: 5,
  maxPerformance: 5,
  maxTransactions: 5,
  maxWatchlist: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: InvestmentPortfolioLimits = {
  maxHoldings: 500,
  maxNews: 500,
  maxPerformance: 500,
  maxTransactions: 500,
  maxWatchlist: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: InvestmentPortfolioLimits = {
  maxHoldings: 999_999,
  maxNews: 999_999,
  maxPerformance: 999_999,
  maxTransactions: 999_999,
  maxWatchlist: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<InvestmentPortfolioLimits> =
  defineTiers<InvestmentPortfolioLimits>({
    tiers: {
      [investmentPortfolioPlanKeys.free]: {
        planKey: investmentPortfolioPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [investmentPortfolioPlanKeys.proMonthly]: {
        planKey: investmentPortfolioPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [investmentPortfolioPlanKeys.proYearly]: {
        planKey: investmentPortfolioPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [investmentPortfolioPlanKeys.teamMonthly]: {
        planKey: investmentPortfolioPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [investmentPortfolioPlanKeys.teamYearly]: {
        planKey: investmentPortfolioPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: investmentPortfolioPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: InvestmentPortfolioLimits
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
          stripePriceId: process.env.STRIPE_INVESTMENT_PORTFOLIO_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_INVESTMENT_PORTFOLIO_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_INVESTMENT_PORTFOLIO_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_INVESTMENT_PORTFOLIO_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
