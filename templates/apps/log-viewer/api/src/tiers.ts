/**
 * Log Viewer tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface LogViewerLimits {
  /** Maximum number of logs a user may own. */
  maxLogs: number

  /** Maximum number of saved-searches a user may own. */
  maxSavedSearches: number

  /** Maximum number of sources a user may own. */
  maxSources: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const logViewerPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: LogViewerLimits = {
  // Free is intentionally generous so the seeded demo (15 log lines,
  // 8 streams, 6 saved searches per user) leaves real headroom for the
  // user to add a few of their own before paywall friction kicks in.
  // A Datadog-grade product on a free tier would expect at minimum
  // multi-thousand log retention plus a handful of streams/searches.
  maxLogs: 10_000,
  maxSavedSearches: 10,
  maxSources: 12,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: LogViewerLimits = {
  // Every Pro limit must exceed Free's (maxLogs was once 500 — an
  // upgrade that LOWERED the log budget below Free's 10,000).
  maxLogs: 100_000,
  maxSavedSearches: 500,
  maxSources: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: LogViewerLimits = {
  maxLogs: 999_999,
  maxSavedSearches: 999_999,
  maxSources: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<LogViewerLimits> = defineTiers<LogViewerLimits>({
  tiers: {
    [logViewerPlanKeys.free]: {
      planKey: logViewerPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [logViewerPlanKeys.proMonthly]: {
      planKey: logViewerPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [logViewerPlanKeys.proYearly]: {
      planKey: logViewerPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [logViewerPlanKeys.teamMonthly]: {
      planKey: logViewerPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [logViewerPlanKeys.teamYearly]: {
      planKey: logViewerPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: logViewerPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: LogViewerLimits
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
          stripePriceId: process.env.STRIPE_LOG_VIEWER_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_LOG_VIEWER_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_LOG_VIEWER_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_LOG_VIEWER_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
