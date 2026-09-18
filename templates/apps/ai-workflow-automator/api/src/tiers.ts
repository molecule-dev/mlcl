/**
 * Ai Workflow Automator tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface AiWorkflowAutomatorLimits {
  /** Maximum number of runs a user may own. */
  maxRuns: number

  /** Maximum number of workflows a user may own. */
  maxWorkflows: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const aiWorkflowAutomatorPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: AiWorkflowAutomatorLimits = {
  maxRuns: 5,
  maxWorkflows: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: AiWorkflowAutomatorLimits = {
  maxRuns: 500,
  maxWorkflows: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: AiWorkflowAutomatorLimits = {
  maxRuns: 999_999,
  maxWorkflows: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<AiWorkflowAutomatorLimits> =
  defineTiers<AiWorkflowAutomatorLimits>({
    tiers: {
      [aiWorkflowAutomatorPlanKeys.free]: {
        planKey: aiWorkflowAutomatorPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [aiWorkflowAutomatorPlanKeys.proMonthly]: {
        planKey: aiWorkflowAutomatorPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [aiWorkflowAutomatorPlanKeys.proYearly]: {
        planKey: aiWorkflowAutomatorPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [aiWorkflowAutomatorPlanKeys.teamMonthly]: {
        planKey: aiWorkflowAutomatorPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [aiWorkflowAutomatorPlanKeys.teamYearly]: {
        planKey: aiWorkflowAutomatorPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: aiWorkflowAutomatorPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: AiWorkflowAutomatorLimits
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
          stripePriceId: process.env.STRIPE_AI_WORKFLOW_AUTOMATOR_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_AI_WORKFLOW_AUTOMATOR_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_AI_WORKFLOW_AUTOMATOR_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_AI_WORKFLOW_AUTOMATOR_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
