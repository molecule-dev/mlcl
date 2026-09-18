/**
 * Document Collaboration tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface DocumentCollaborationLimits {
  /** Maximum number of comments a user may own. */
  maxComments: number

  /** Maximum number of documents a user may own. */
  maxDocuments: number

  /** Maximum number of sharing a user may own. */
  maxSharing: number

  /** Maximum number of versions a user may own. */
  maxVersions: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const documentCollaborationPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: DocumentCollaborationLimits = {
  maxComments: 5,
  maxDocuments: 5,
  maxSharing: 5,
  maxVersions: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: DocumentCollaborationLimits = {
  maxComments: 500,
  maxDocuments: 500,
  maxSharing: 500,
  maxVersions: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: DocumentCollaborationLimits = {
  maxComments: 999_999,
  maxDocuments: 999_999,
  maxSharing: 999_999,
  maxVersions: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<DocumentCollaborationLimits> =
  defineTiers<DocumentCollaborationLimits>({
    tiers: {
      [documentCollaborationPlanKeys.free]: {
        planKey: documentCollaborationPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [documentCollaborationPlanKeys.proMonthly]: {
        planKey: documentCollaborationPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [documentCollaborationPlanKeys.proYearly]: {
        planKey: documentCollaborationPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [documentCollaborationPlanKeys.teamMonthly]: {
        planKey: documentCollaborationPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [documentCollaborationPlanKeys.teamYearly]: {
        planKey: documentCollaborationPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: documentCollaborationPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: DocumentCollaborationLimits
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
          stripePriceId: process.env.STRIPE_DOCUMENT_COLLABORATION_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_DOCUMENT_COLLABORATION_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_DOCUMENT_COLLABORATION_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_DOCUMENT_COLLABORATION_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
