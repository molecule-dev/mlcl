/**
 * Construction-management tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface ConstructionManagementLimits {
  /** Maximum number of projects (jobsites) a user may own. */
  maxProjects: number

  /** Maximum punch-list items across all owned projects. */
  maxPunchItems: number

  /** Maximum RFIs across all owned projects. */
  maxRfis: number

  /** Maximum subcontractors across all owned projects. */
  maxSubcontractors: number

  /** Whether photos can be attached to punch-list items. */
  photoDocumentation: boolean

  /** Whether the user gets advanced reporting (cost curves, RFI aging). */
  advancedReports: boolean

  /** Days of daily-log history retained. 0 = unlimited. */
  dailyLogRetentionDays: number

  /** Whether RFIs support the full threaded Q&A workflow. */
  rfiWorkflow: boolean
}

export const constructionManagementPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: ConstructionManagementLimits = {
  maxProjects: 3,
  maxPunchItems: 50,
  maxRfis: 15,
  maxSubcontractors: 15,
  photoDocumentation: false,
  advancedReports: false,
  dailyLogRetentionDays: 30,
  rfiWorkflow: true,
}

const PRO_LIMITS: ConstructionManagementLimits = {
  maxProjects: 50,
  maxPunchItems: 5_000,
  maxRfis: 1_000,
  maxSubcontractors: 1_000,
  photoDocumentation: true,
  advancedReports: true,
  dailyLogRetentionDays: 730,
  rfiWorkflow: true,
}

const TEAM_LIMITS: ConstructionManagementLimits = {
  maxProjects: 999_999,
  maxPunchItems: 999_999,
  maxRfis: 999_999,
  maxSubcontractors: 999_999,
  photoDocumentation: true,
  advancedReports: true,
  dailyLogRetentionDays: 0,
  rfiWorkflow: true,
}

export const tierRegistry: TierRegistry<ConstructionManagementLimits> =
  defineTiers<ConstructionManagementLimits>({
    tiers: {
      [constructionManagementPlanKeys.free]: {
        planKey: constructionManagementPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [constructionManagementPlanKeys.proMonthly]: {
        planKey: constructionManagementPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [constructionManagementPlanKeys.proYearly]: {
        planKey: constructionManagementPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [constructionManagementPlanKeys.teamMonthly]: {
        planKey: constructionManagementPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [constructionManagementPlanKeys.teamYearly]: {
        planKey: constructionManagementPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: constructionManagementPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: ConstructionManagementLimits
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
          price: '$12/mo',
          stripePriceId: process.env.STRIPE_CONSTRUCTION_MANAGEMENT_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$120/yr',
          stripePriceId: process.env.STRIPE_CONSTRUCTION_MANAGEMENT_PRO_YEARLY ?? null,
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
          price: '$30/mo',
          stripePriceId: process.env.STRIPE_CONSTRUCTION_MANAGEMENT_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$300/yr',
          stripePriceId: process.env.STRIPE_CONSTRUCTION_MANAGEMENT_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
