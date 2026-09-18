/**
 * Sports League tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface SportsLeagueLimits {
  /** Maximum number of schedule a user may own. */
  maxSchedule: number

  /** Maximum number of scores a user may own. */
  maxScores: number

  /** Maximum number of standings a user may own. */
  maxStandings: number

  /** Maximum number of teams a user may own. */
  maxTeams: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const sportsLeaguePlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: SportsLeagueLimits = {
  maxSchedule: 5,
  maxScores: 5,
  maxStandings: 5,
  maxTeams: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: SportsLeagueLimits = {
  maxSchedule: 500,
  maxScores: 500,
  maxStandings: 500,
  maxTeams: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: SportsLeagueLimits = {
  maxSchedule: 999_999,
  maxScores: 999_999,
  maxStandings: 999_999,
  maxTeams: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<SportsLeagueLimits> = defineTiers<SportsLeagueLimits>({
  tiers: {
    [sportsLeaguePlanKeys.free]: {
      planKey: sportsLeaguePlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [sportsLeaguePlanKeys.proMonthly]: {
      planKey: sportsLeaguePlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [sportsLeaguePlanKeys.proYearly]: {
      planKey: sportsLeaguePlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [sportsLeaguePlanKeys.teamMonthly]: {
      planKey: sportsLeaguePlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [sportsLeaguePlanKeys.teamYearly]: {
      planKey: sportsLeaguePlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: sportsLeaguePlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: SportsLeagueLimits
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
          stripePriceId: process.env.STRIPE_SPORTS_LEAGUE_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_SPORTS_LEAGUE_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_SPORTS_LEAGUE_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_SPORTS_LEAGUE_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
