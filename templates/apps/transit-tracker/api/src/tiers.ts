/**
 * Transit Tracker tier ladder.
 *
 * Boards and trip planning are free — transit data serves everyone. Paid
 * tiers deepen the personal layer: more saved stops, per-stop alert
 * subscriptions, and usage history (free/pro/family, mirroring the donor's
 * subscription posture with transit-shaped limits).
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface TransitTrackerLimits {
  /** Maximum stops a user may save to their board shortcuts. */
  maxSavedStops: number

  /** Maximum service-alert subscriptions (per line) a user may own. */
  maxAlertSubscriptions: number

  /** Days of arrival-history retained for the usage recap. 0 = unlimited. */
  retentionDays: number

  /** Whether the user sees per-line frequency charts on line pages. */
  advancedStats: boolean

  /** Whether the user may export their saved data. */
  canExport: boolean
}

export const transitTrackerPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  familyMonthly: 'familyMonthly',
  familyYearly: 'familyYearly',
} as const

const FREE_LIMITS: TransitTrackerLimits = {
  maxSavedStops: 5,
  maxAlertSubscriptions: 2,
  retentionDays: 30,
  advancedStats: false,
  canExport: false,
}

const PRO_LIMITS: TransitTrackerLimits = {
  maxSavedStops: 100,
  maxAlertSubscriptions: 25,
  retentionDays: 365,
  advancedStats: true,
  canExport: true,
}

const FAMILY_LIMITS: TransitTrackerLimits = {
  maxSavedStops: 500,
  maxAlertSubscriptions: 100,
  retentionDays: 0,
  advancedStats: true,
  canExport: true,
}

export const tierRegistry: TierRegistry<TransitTrackerLimits> = defineTiers<TransitTrackerLimits>({
  tiers: {
    [transitTrackerPlanKeys.free]: {
      planKey: transitTrackerPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [transitTrackerPlanKeys.proMonthly]: {
      planKey: transitTrackerPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [transitTrackerPlanKeys.proYearly]: {
      planKey: transitTrackerPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [transitTrackerPlanKeys.familyMonthly]: {
      planKey: transitTrackerPlanKeys.familyMonthly,
      category: 'family',
      name: 'Family',
      limits: FAMILY_LIMITS,
    },
    [transitTrackerPlanKeys.familyYearly]: {
      planKey: transitTrackerPlanKeys.familyYearly,
      category: 'family',
      name: 'Family',
      limits: FAMILY_LIMITS,
    },
  },
  defaultPlanKey: transitTrackerPlanKeys.free,
  categoryOrder: ['free', 'pro', 'family'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: TransitTrackerLimits
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
          price: '$5/mo',
          stripePriceId: process.env.STRIPE_TRANSIT_TRACKER_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$50/yr',
          stripePriceId: process.env.STRIPE_TRANSIT_TRACKER_PRO_YEARLY ?? null,
        },
      ],
      limits: PRO_LIMITS,
    },
    {
      key: 'family',
      name: 'Family',
      prices: [
        {
          period: 'month',
          price: '$12/mo',
          stripePriceId: process.env.STRIPE_TRANSIT_TRACKER_FAMILY_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$120/yr',
          stripePriceId: process.env.STRIPE_TRANSIT_TRACKER_FAMILY_YEARLY ?? null,
        },
      ],
      limits: FAMILY_LIMITS,
    },
  ]
}
