/**
 * Spreadsheet tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface SpreadsheetLimits {
  /** Maximum number of columns a user may own. */
  maxColumns: number

  /** Maximum number of rows a user may own. */
  maxRows: number

  /** Maximum number of sheets a user may own. */
  maxSheets: number

  /** Maximum number of spreadsheets a user may own. */
  maxSpreadsheets: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const spreadsheetPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: SpreadsheetLimits = {
  maxColumns: 5,
  maxRows: 5,
  maxSheets: 5,
  maxSpreadsheets: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: SpreadsheetLimits = {
  maxColumns: 500,
  maxRows: 500,
  maxSheets: 500,
  maxSpreadsheets: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: SpreadsheetLimits = {
  maxColumns: 999_999,
  maxRows: 999_999,
  maxSheets: 999_999,
  maxSpreadsheets: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<SpreadsheetLimits> = defineTiers<SpreadsheetLimits>({
  tiers: {
    [spreadsheetPlanKeys.free]: {
      planKey: spreadsheetPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [spreadsheetPlanKeys.proMonthly]: {
      planKey: spreadsheetPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [spreadsheetPlanKeys.proYearly]: {
      planKey: spreadsheetPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [spreadsheetPlanKeys.teamMonthly]: {
      planKey: spreadsheetPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [spreadsheetPlanKeys.teamYearly]: {
      planKey: spreadsheetPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: spreadsheetPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: SpreadsheetLimits
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
          stripePriceId: process.env.STRIPE_SPREADSHEET_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_SPREADSHEET_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_SPREADSHEET_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_SPREADSHEET_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
