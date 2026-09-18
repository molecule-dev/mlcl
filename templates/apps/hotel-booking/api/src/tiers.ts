/**
 * Hotel Booking tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface HotelBookingLimits {
  /** Maximum number of hotels a user may own. */
  maxHotels: number

  /** Maximum number of reservations a user may own. */
  maxReservations: number

  /** Maximum number of reviews a user may own. */
  maxReviews: number

  /** Maximum number of rooms a user may own. */
  maxRooms: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const hotelBookingPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: HotelBookingLimits = {
  maxHotels: 5,
  maxReservations: 5,
  maxReviews: 5,
  maxRooms: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: HotelBookingLimits = {
  maxHotels: 500,
  maxReservations: 500,
  maxReviews: 500,
  maxRooms: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: HotelBookingLimits = {
  maxHotels: 999_999,
  maxReservations: 999_999,
  maxReviews: 999_999,
  maxRooms: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<HotelBookingLimits> = defineTiers<HotelBookingLimits>({
  tiers: {
    [hotelBookingPlanKeys.free]: {
      planKey: hotelBookingPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [hotelBookingPlanKeys.proMonthly]: {
      planKey: hotelBookingPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [hotelBookingPlanKeys.proYearly]: {
      planKey: hotelBookingPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [hotelBookingPlanKeys.teamMonthly]: {
      planKey: hotelBookingPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [hotelBookingPlanKeys.teamYearly]: {
      planKey: hotelBookingPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: hotelBookingPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: HotelBookingLimits
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
          stripePriceId: process.env.STRIPE_HOTEL_BOOKING_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_HOTEL_BOOKING_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_HOTEL_BOOKING_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_HOTEL_BOOKING_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
