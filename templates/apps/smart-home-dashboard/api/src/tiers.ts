/**
 * Smart Home Dashboard tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface SmartHomeDashboardLimits {
  /** Maximum number of automations a user may own. */
  maxAutomations: number

  /** Maximum number of devices a user may own. */
  maxDevices: number

  /** Maximum number of energy a user may own. */
  maxEnergy: number

  /** Maximum number of scenes a user may own. */
  maxScenes: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const smartHomeDashboardPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: SmartHomeDashboardLimits = {
  maxAutomations: 5,
  maxDevices: 5,
  maxEnergy: 5,
  maxScenes: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: SmartHomeDashboardLimits = {
  maxAutomations: 500,
  maxDevices: 500,
  maxEnergy: 500,
  maxScenes: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: SmartHomeDashboardLimits = {
  maxAutomations: 999_999,
  maxDevices: 999_999,
  maxEnergy: 999_999,
  maxScenes: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<SmartHomeDashboardLimits> =
  defineTiers<SmartHomeDashboardLimits>({
    tiers: {
      [smartHomeDashboardPlanKeys.free]: {
        planKey: smartHomeDashboardPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [smartHomeDashboardPlanKeys.proMonthly]: {
        planKey: smartHomeDashboardPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [smartHomeDashboardPlanKeys.proYearly]: {
        planKey: smartHomeDashboardPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [smartHomeDashboardPlanKeys.teamMonthly]: {
        planKey: smartHomeDashboardPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [smartHomeDashboardPlanKeys.teamYearly]: {
        planKey: smartHomeDashboardPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: smartHomeDashboardPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: SmartHomeDashboardLimits
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
          stripePriceId: process.env.STRIPE_SMART_HOME_DASHBOARD_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_SMART_HOME_DASHBOARD_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_SMART_HOME_DASHBOARD_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_SMART_HOME_DASHBOARD_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
