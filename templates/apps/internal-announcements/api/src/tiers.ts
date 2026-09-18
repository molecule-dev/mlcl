/**
 * Internal Announcements tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface InternalAnnouncementsLimits {
  /** Maximum number of announcements a user may own. */
  maxAnnouncements: number

  /** Maximum number of categories a user may own. */
  maxCategories: number

  /** Maximum number of comments a user may own. */
  maxComments: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const internalAnnouncementsPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: InternalAnnouncementsLimits = {
  maxAnnouncements: 5,
  maxCategories: 5,
  maxComments: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: InternalAnnouncementsLimits = {
  maxAnnouncements: 500,
  maxCategories: 500,
  maxComments: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: InternalAnnouncementsLimits = {
  maxAnnouncements: 999_999,
  maxCategories: 999_999,
  maxComments: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<InternalAnnouncementsLimits> =
  defineTiers<InternalAnnouncementsLimits>({
    tiers: {
      [internalAnnouncementsPlanKeys.free]: {
        planKey: internalAnnouncementsPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [internalAnnouncementsPlanKeys.proMonthly]: {
        planKey: internalAnnouncementsPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [internalAnnouncementsPlanKeys.proYearly]: {
        planKey: internalAnnouncementsPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [internalAnnouncementsPlanKeys.teamMonthly]: {
        planKey: internalAnnouncementsPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [internalAnnouncementsPlanKeys.teamYearly]: {
        planKey: internalAnnouncementsPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: internalAnnouncementsPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: InternalAnnouncementsLimits
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
          stripePriceId: process.env.STRIPE_INTERNAL_ANNOUNCEMENTS_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_INTERNAL_ANNOUNCEMENTS_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_INTERNAL_ANNOUNCEMENTS_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_INTERNAL_ANNOUNCEMENTS_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
