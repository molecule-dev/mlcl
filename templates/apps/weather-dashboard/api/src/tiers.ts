/**
 * Weather Dashboard tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface WeatherDashboardLimits {
  /** Maximum number of alerts a user may own. */
  maxAlerts: number

  /** Maximum number of forecasts a user may own. */
  maxForecasts: number

  /** Maximum number of history a user may own. */
  maxHistory: number

  /** Maximum number of locations a user may own. */
  maxLocations: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const weatherDashboardPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: WeatherDashboardLimits = {
  maxAlerts: 5,
  maxForecasts: 5,
  maxHistory: 5,
  maxLocations: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: WeatherDashboardLimits = {
  maxAlerts: 500,
  maxForecasts: 500,
  maxHistory: 500,
  maxLocations: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: WeatherDashboardLimits = {
  maxAlerts: 999_999,
  maxForecasts: 999_999,
  maxHistory: 999_999,
  maxLocations: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<WeatherDashboardLimits> =
  defineTiers<WeatherDashboardLimits>({
    tiers: {
      [weatherDashboardPlanKeys.free]: {
        planKey: weatherDashboardPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [weatherDashboardPlanKeys.proMonthly]: {
        planKey: weatherDashboardPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [weatherDashboardPlanKeys.proYearly]: {
        planKey: weatherDashboardPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [weatherDashboardPlanKeys.teamMonthly]: {
        planKey: weatherDashboardPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [weatherDashboardPlanKeys.teamYearly]: {
        planKey: weatherDashboardPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: weatherDashboardPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: WeatherDashboardLimits
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
          stripePriceId: process.env.STRIPE_WEATHER_DASHBOARD_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_WEATHER_DASHBOARD_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_WEATHER_DASHBOARD_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_WEATHER_DASHBOARD_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
