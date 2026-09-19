/**
 * AI Hotel Receptionist tier ladder.
 *
 * This template ships WITHOUT Stripe subscription tiers (owner decision for
 * the 134→150 build): there is no billing UI, no checkout, and no Stripe
 * env. A single free tier is still registered because the shared user
 * resource consults the entitlements bond for plan state; the limits below
 * are deliberately non-restrictive so no PMS flow is ever gated.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user. */
export interface HotelReceptionistLimits {
  /** Maximum voice agents the property may configure. */
  maxVoiceAgents: number
  /** Maximum reservations retained. 0 = unlimited. */
  maxReservations: number
  /** Whether the property may run simulated calls. */
  callSimulation: boolean
}

export const hotelReceptionistPlanKeys = {
  free: 'free',
} as const

const FREE_LIMITS: HotelReceptionistLimits = {
  maxVoiceAgents: 12,
  maxReservations: 0,
  callSimulation: true,
}

export const tierRegistry: TierRegistry<HotelReceptionistLimits> =
  defineTiers<HotelReceptionistLimits>({
    tiers: {
      [hotelReceptionistPlanKeys.free]: {
        planKey: hotelReceptionistPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
    },
    defaultPlanKey: hotelReceptionistPlanKeys.free,
    categoryOrder: ['free'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}
