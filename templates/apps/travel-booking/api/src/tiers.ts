/**
 * Travel Booking tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface TravelBookingLimits {
  /** Maximum number of accommodations a user may own. */
  maxAccommodations: number

  /** Maximum number of bookings a user may own. */
  maxBookings: number

  /** Maximum number of destinations a user may own. */
  maxDestinations: number

  /** Maximum number of itineraries a user may own. */
  maxItineraries: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const travelBookingPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: TravelBookingLimits = {
  maxAccommodations: 5,
  maxBookings: 5,
  maxDestinations: 5,
  maxItineraries: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: TravelBookingLimits = {
  maxAccommodations: 500,
  maxBookings: 500,
  maxDestinations: 500,
  maxItineraries: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: TravelBookingLimits = {
  maxAccommodations: 999_999,
  maxBookings: 999_999,
  maxDestinations: 999_999,
  maxItineraries: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<TravelBookingLimits> = defineTiers<TravelBookingLimits>({
  tiers: {
    [travelBookingPlanKeys.free]: {
      planKey: travelBookingPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [travelBookingPlanKeys.proMonthly]: {
      planKey: travelBookingPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [travelBookingPlanKeys.proYearly]: {
      planKey: travelBookingPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [travelBookingPlanKeys.teamMonthly]: {
      planKey: travelBookingPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [travelBookingPlanKeys.teamYearly]: {
      planKey: travelBookingPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: travelBookingPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: TravelBookingLimits
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
          stripePriceId: process.env.STRIPE_TRAVEL_BOOKING_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_TRAVEL_BOOKING_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_TRAVEL_BOOKING_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_TRAVEL_BOOKING_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
