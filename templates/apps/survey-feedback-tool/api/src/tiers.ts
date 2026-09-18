/**
 * Survey Feedback Tool tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface SurveyFeedbackToolLimits {
  /** Maximum number of questions a user may own. */
  maxQuestions: number

  /** Maximum number of responses a user may own. */
  maxResponses: number

  /** Maximum number of surveys a user may own. */
  maxSurveys: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const surveyFeedbackToolPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: SurveyFeedbackToolLimits = {
  maxQuestions: 5,
  maxResponses: 5,
  maxSurveys: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: SurveyFeedbackToolLimits = {
  maxQuestions: 500,
  maxResponses: 500,
  maxSurveys: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: SurveyFeedbackToolLimits = {
  maxQuestions: 999_999,
  maxResponses: 999_999,
  maxSurveys: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<SurveyFeedbackToolLimits> =
  defineTiers<SurveyFeedbackToolLimits>({
    tiers: {
      [surveyFeedbackToolPlanKeys.free]: {
        planKey: surveyFeedbackToolPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [surveyFeedbackToolPlanKeys.proMonthly]: {
        planKey: surveyFeedbackToolPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [surveyFeedbackToolPlanKeys.proYearly]: {
        planKey: surveyFeedbackToolPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [surveyFeedbackToolPlanKeys.teamMonthly]: {
        planKey: surveyFeedbackToolPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [surveyFeedbackToolPlanKeys.teamYearly]: {
        planKey: surveyFeedbackToolPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: surveyFeedbackToolPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: SurveyFeedbackToolLimits
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
          stripePriceId: process.env.STRIPE_SURVEY_FEEDBACK_TOOL_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_SURVEY_FEEDBACK_TOOL_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_SURVEY_FEEDBACK_TOOL_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_SURVEY_FEEDBACK_TOOL_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
