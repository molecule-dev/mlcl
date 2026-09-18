/**
 * Applicant Tracking tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface ApplicantTrackingLimits {
  /** Maximum number of applications a user may own. */
  maxApplications: number

  /** Maximum number of candidates a user may own. */
  maxCandidates: number

  /** Maximum number of jobs a user may own. */
  maxJobs: number

  /** Maximum number of scorecards a user may own. */
  maxScorecards: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const applicantTrackingPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: ApplicantTrackingLimits = {
  maxApplications: 5,
  maxCandidates: 5,
  maxJobs: 5,
  maxScorecards: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: ApplicantTrackingLimits = {
  maxApplications: 500,
  maxCandidates: 500,
  maxJobs: 500,
  maxScorecards: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: ApplicantTrackingLimits = {
  maxApplications: 999_999,
  maxCandidates: 999_999,
  maxJobs: 999_999,
  maxScorecards: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<ApplicantTrackingLimits> =
  defineTiers<ApplicantTrackingLimits>({
    tiers: {
      [applicantTrackingPlanKeys.free]: {
        planKey: applicantTrackingPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [applicantTrackingPlanKeys.proMonthly]: {
        planKey: applicantTrackingPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [applicantTrackingPlanKeys.proYearly]: {
        planKey: applicantTrackingPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [applicantTrackingPlanKeys.teamMonthly]: {
        planKey: applicantTrackingPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [applicantTrackingPlanKeys.teamYearly]: {
        planKey: applicantTrackingPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: applicantTrackingPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: ApplicantTrackingLimits
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
          stripePriceId: process.env.STRIPE_APPLICANT_TRACKING_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_APPLICANT_TRACKING_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_APPLICANT_TRACKING_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_APPLICANT_TRACKING_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
