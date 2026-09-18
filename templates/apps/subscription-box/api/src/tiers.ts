/**
 * Subscription Box tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface SubscriptionBoxLimits {
  /** Maximum number of boxes a user may own. */
  maxBoxes: number

  /** Maximum number of plans a user may own. */
  maxPlans: number

  /** Maximum number of shipments a user may own. */
  maxShipments: number

  /** Maximum number of subscriptions a user may own. */
  maxSubscriptions: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const subscriptionBoxPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: SubscriptionBoxLimits = {
  maxBoxes: 5,
  maxPlans: 5,
  maxShipments: 5,
  maxSubscriptions: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: SubscriptionBoxLimits = {
  maxBoxes: 500,
  maxPlans: 500,
  maxShipments: 500,
  maxSubscriptions: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: SubscriptionBoxLimits = {
  maxBoxes: 999_999,
  maxPlans: 999_999,
  maxShipments: 999_999,
  maxSubscriptions: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<SubscriptionBoxLimits> = defineTiers<SubscriptionBoxLimits>(
  {
    tiers: {
      [subscriptionBoxPlanKeys.free]: {
        planKey: subscriptionBoxPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [subscriptionBoxPlanKeys.proMonthly]: {
        planKey: subscriptionBoxPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [subscriptionBoxPlanKeys.proYearly]: {
        planKey: subscriptionBoxPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [subscriptionBoxPlanKeys.teamMonthly]: {
        planKey: subscriptionBoxPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [subscriptionBoxPlanKeys.teamYearly]: {
        planKey: subscriptionBoxPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: subscriptionBoxPlanKeys.free,
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
  limits: SubscriptionBoxLimits
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
          stripePriceId: process.env.STRIPE_SUBSCRIPTION_BOX_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_SUBSCRIPTION_BOX_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_SUBSCRIPTION_BOX_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_SUBSCRIPTION_BOX_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
