/**
 * Delivery Tracking tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface DeliveryTrackingLimits {
  /** Maximum number of carriers a user may own. */
  maxCarriers: number

  /** Maximum number of notifications a user may own. */
  maxNotifications: number

  /** Maximum number of shipments a user may own. */
  maxShipments: number

  /** Maximum number of tracking a user may own. */
  maxTracking: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const deliveryTrackingPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: DeliveryTrackingLimits = {
  maxCarriers: 5,
  maxNotifications: 5,
  maxShipments: 5,
  maxTracking: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: DeliveryTrackingLimits = {
  maxCarriers: 500,
  maxNotifications: 500,
  maxShipments: 500,
  maxTracking: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: DeliveryTrackingLimits = {
  maxCarriers: 999_999,
  maxNotifications: 999_999,
  maxShipments: 999_999,
  maxTracking: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<DeliveryTrackingLimits> =
  defineTiers<DeliveryTrackingLimits>({
    tiers: {
      [deliveryTrackingPlanKeys.free]: {
        planKey: deliveryTrackingPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [deliveryTrackingPlanKeys.proMonthly]: {
        planKey: deliveryTrackingPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [deliveryTrackingPlanKeys.proYearly]: {
        planKey: deliveryTrackingPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [deliveryTrackingPlanKeys.teamMonthly]: {
        planKey: deliveryTrackingPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [deliveryTrackingPlanKeys.teamYearly]: {
        planKey: deliveryTrackingPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: deliveryTrackingPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: DeliveryTrackingLimits
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
          stripePriceId: process.env.STRIPE_DELIVERY_TRACKING_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_DELIVERY_TRACKING_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_DELIVERY_TRACKING_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_DELIVERY_TRACKING_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
