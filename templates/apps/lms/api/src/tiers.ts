/**
 * LMS tier ladder.
 *
 * Each user's `planKey` (set by the Stripe webhook glue in
 * `@molecule/api-resource-user`) maps to one of these tiers. Limits are
 * enforced by `enforceLimit(...)` middleware on the relevant POST routes.
 *
 * Stripe price IDs are pulled from environment variables so the same code
 * runs in test, staging, and production. Each environment provisions its
 * own Stripe products via the Stripe dashboard or `stripe products create`.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface LmsLimits {
  /** Total number of courses an instructor may create. */
  maxCourses: number

  /** Total number of students that may be enrolled across all courses. */
  maxStudents: number

  /** Maximum number of modules per course. */
  maxModulesPerCourse: number

  /** Total number of assignments the user may have active across courses. */
  maxAssignments: number

  /** Storage cap for video and material uploads, in megabytes. */
  maxStorageMb: number

  /** Whether the user may schedule and host live classes. */
  liveClasses: boolean

  /** Whether the user may issue completion certificates. */
  certificates: boolean

  /** Whether the user gets advanced analytics on courses and students. */
  advancedAnalytics: boolean

  /** Whether the user may apply custom branding (logo, theme). */
  customBranding: boolean

  /** Whether the user may enable single sign-on for their organisation. */
  ssoLogin: boolean
}

/** Plan keys recognised by the entitlements glue. Stripe webhook events
 *  set one of these on the `users.planKey` column. */
export const lmsPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: LmsLimits = {
  maxCourses: 2,
  maxStudents: 25,
  maxModulesPerCourse: 5,
  maxAssignments: 10,
  maxStorageMb: 100,
  liveClasses: false,
  certificates: false,
  advancedAnalytics: false,
  customBranding: false,
  ssoLogin: false,
}

const PRO_LIMITS: LmsLimits = {
  maxCourses: 50,
  maxStudents: 500,
  maxModulesPerCourse: 50,
  maxAssignments: 500,
  maxStorageMb: 5_120,
  liveClasses: true,
  certificates: true,
  advancedAnalytics: true,
  customBranding: true,
  ssoLogin: false,
}

const TEAM_LIMITS: LmsLimits = {
  maxCourses: 999_999,
  maxStudents: 999_999,
  maxModulesPerCourse: 999_999,
  maxAssignments: 999_999,
  maxStorageMb: 102_400,
  liveClasses: true,
  certificates: true,
  advancedAnalytics: true,
  customBranding: true,
  ssoLogin: true,
}

/** LMS tier registry. Bond it with `setupEntitlements()` at startup. */
export const tierRegistry: TierRegistry<LmsLimits> = defineTiers<LmsLimits>({
  tiers: {
    [lmsPlanKeys.free]: {
      planKey: lmsPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [lmsPlanKeys.proMonthly]: {
      planKey: lmsPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [lmsPlanKeys.proYearly]: {
      planKey: lmsPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [lmsPlanKeys.teamMonthly]: {
      planKey: lmsPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [lmsPlanKeys.teamYearly]: {
      planKey: lmsPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: lmsPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

/** Bond the tier registry as the active entitlements provider. */
export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

/**
 * Display configuration for the public pricing page. Resolves Stripe price
 * IDs at runtime so the same code works across test/staging/production.
 *
 * @returns Pricing tier display data ready to render on the `/pricing` page.
 */
export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: LmsLimits
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
          price: '$39/mo',
          stripePriceId: process.env.STRIPE_LMS_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$390/yr',
          stripePriceId: process.env.STRIPE_LMS_PRO_YEARLY ?? null,
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
          price: '$129/mo',
          stripePriceId: process.env.STRIPE_LMS_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$1290/yr',
          stripePriceId: process.env.STRIPE_LMS_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
