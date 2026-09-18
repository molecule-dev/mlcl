/**
 * Employee Onboarding tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface EmployeeOnboardingLimits {
  /** Maximum number of documents a user may own. */
  maxDocuments: number

  /** Maximum number of onboardings a user may own. */
  maxOnboardings: number

  /** Maximum number of tasks a user may own. */
  maxTasks: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const employeeOnboardingPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: EmployeeOnboardingLimits = {
  maxDocuments: 5,
  maxOnboardings: 5,
  maxTasks: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: EmployeeOnboardingLimits = {
  maxDocuments: 500,
  maxOnboardings: 500,
  maxTasks: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: EmployeeOnboardingLimits = {
  maxDocuments: 999_999,
  maxOnboardings: 999_999,
  maxTasks: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<EmployeeOnboardingLimits> =
  defineTiers<EmployeeOnboardingLimits>({
    tiers: {
      [employeeOnboardingPlanKeys.free]: {
        planKey: employeeOnboardingPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [employeeOnboardingPlanKeys.proMonthly]: {
        planKey: employeeOnboardingPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [employeeOnboardingPlanKeys.proYearly]: {
        planKey: employeeOnboardingPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [employeeOnboardingPlanKeys.teamMonthly]: {
        planKey: employeeOnboardingPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [employeeOnboardingPlanKeys.teamYearly]: {
        planKey: employeeOnboardingPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: employeeOnboardingPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: EmployeeOnboardingLimits
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
          stripePriceId: process.env.STRIPE_EMPLOYEE_ONBOARDING_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_EMPLOYEE_ONBOARDING_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_EMPLOYEE_ONBOARDING_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_EMPLOYEE_ONBOARDING_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
