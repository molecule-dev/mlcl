/**
 * Password Manager tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface PasswordManagerLimits {
  /** Maximum number of generator a user may own. */
  maxGenerator: number

  /** Maximum number of items a user may own. */
  maxItems: number

  /** Maximum number of vaults a user may own. */
  maxVaults: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const passwordManagerPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: PasswordManagerLimits = {
  maxGenerator: 5,
  maxItems: 5,
  maxVaults: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: PasswordManagerLimits = {
  maxGenerator: 500,
  maxItems: 500,
  maxVaults: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: PasswordManagerLimits = {
  maxGenerator: 999_999,
  maxItems: 999_999,
  maxVaults: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<PasswordManagerLimits> = defineTiers<PasswordManagerLimits>(
  {
    tiers: {
      [passwordManagerPlanKeys.free]: {
        planKey: passwordManagerPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [passwordManagerPlanKeys.proMonthly]: {
        planKey: passwordManagerPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [passwordManagerPlanKeys.proYearly]: {
        planKey: passwordManagerPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [passwordManagerPlanKeys.teamMonthly]: {
        planKey: passwordManagerPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [passwordManagerPlanKeys.teamYearly]: {
        planKey: passwordManagerPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: passwordManagerPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  },
)

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: PasswordManagerLimits
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
          stripePriceId: process.env.STRIPE_PASSWORD_MANAGER_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_PASSWORD_MANAGER_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_PASSWORD_MANAGER_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_PASSWORD_MANAGER_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
