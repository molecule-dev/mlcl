/**
 * Project-management tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface ProjectManagementLimits {
  /** Maximum number of projects a user may own. */
  maxProjects: number

  /** Maximum total tasks across all owned projects. */
  maxTasks: number

  /** Maximum number of milestones across all owned projects. */
  maxMilestones: number

  /** Maximum number of members per project (counts the owner). */
  maxMembersPerProject: number

  /** Whether realtime collaboration (presence, live edits) is available. */
  realtimeCollaboration: boolean

  /** Whether the user gets advanced reporting (burndown, velocity). */
  advancedReports: boolean

  /** Days of activity history retained. 0 = unlimited. */
  activityRetentionDays: number

  /** Whether the user may use the calendar/timeline view. */
  calendarView: boolean

  /** Whether the user may use custom fields on tasks. */
  customFields: boolean
}

export const projectManagementPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: ProjectManagementLimits = {
  maxProjects: 3,
  maxTasks: 100,
  maxMilestones: 5,
  maxMembersPerProject: 3,
  realtimeCollaboration: false,
  advancedReports: false,
  activityRetentionDays: 14,
  calendarView: false,
  customFields: false,
}

const PRO_LIMITS: ProjectManagementLimits = {
  maxProjects: 50,
  maxTasks: 10_000,
  maxMilestones: 500,
  maxMembersPerProject: 25,
  realtimeCollaboration: true,
  advancedReports: true,
  activityRetentionDays: 365,
  calendarView: true,
  customFields: true,
}

const TEAM_LIMITS: ProjectManagementLimits = {
  maxProjects: 999_999,
  maxTasks: 999_999,
  maxMilestones: 999_999,
  maxMembersPerProject: 999_999,
  realtimeCollaboration: true,
  advancedReports: true,
  activityRetentionDays: 0,
  calendarView: true,
  customFields: true,
}

export const tierRegistry: TierRegistry<ProjectManagementLimits> =
  defineTiers<ProjectManagementLimits>({
    tiers: {
      [projectManagementPlanKeys.free]: {
        planKey: projectManagementPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [projectManagementPlanKeys.proMonthly]: {
        planKey: projectManagementPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [projectManagementPlanKeys.proYearly]: {
        planKey: projectManagementPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [projectManagementPlanKeys.teamMonthly]: {
        planKey: projectManagementPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [projectManagementPlanKeys.teamYearly]: {
        planKey: projectManagementPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: projectManagementPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: ProjectManagementLimits
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
          stripePriceId: process.env.STRIPE_PROJECT_MANAGEMENT_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$120/yr',
          stripePriceId: process.env.STRIPE_PROJECT_MANAGEMENT_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_PROJECT_MANAGEMENT_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$300/yr',
          stripePriceId: process.env.STRIPE_PROJECT_MANAGEMENT_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
