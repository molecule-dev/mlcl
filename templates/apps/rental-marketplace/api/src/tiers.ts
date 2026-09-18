/**
 * Rental Marketplace tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface RentalMarketplaceLimits {
  /** Maximum number of bookings a user may own. */
  maxBookings: number

  /** Maximum number of hosts a user may own. */
  maxHosts: number

  /** Maximum number of listings a user may own. */
  maxListings: number

  /** Maximum number of messages a user may own. */
  maxMessages: number

  /** Maximum number of reviews a user may own. */
  maxReviews: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const rentalMarketplacePlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: RentalMarketplaceLimits = {
  maxBookings: 5,
  maxHosts: 5,
  maxListings: 5,
  maxMessages: 5,
  maxReviews: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: RentalMarketplaceLimits = {
  maxBookings: 500,
  maxHosts: 500,
  maxListings: 500,
  maxMessages: 500,
  maxReviews: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: RentalMarketplaceLimits = {
  maxBookings: 999_999,
  maxHosts: 999_999,
  maxListings: 999_999,
  maxMessages: 999_999,
  maxReviews: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<RentalMarketplaceLimits> =
  defineTiers<RentalMarketplaceLimits>({
    tiers: {
      [rentalMarketplacePlanKeys.free]: {
        planKey: rentalMarketplacePlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [rentalMarketplacePlanKeys.proMonthly]: {
        planKey: rentalMarketplacePlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [rentalMarketplacePlanKeys.proYearly]: {
        planKey: rentalMarketplacePlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [rentalMarketplacePlanKeys.teamMonthly]: {
        planKey: rentalMarketplacePlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [rentalMarketplacePlanKeys.teamYearly]: {
        planKey: rentalMarketplacePlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: rentalMarketplacePlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: RentalMarketplaceLimits
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
          stripePriceId: process.env.STRIPE_RENTAL_MARKETPLACE_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_RENTAL_MARKETPLACE_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_RENTAL_MARKETPLACE_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_RENTAL_MARKETPLACE_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
