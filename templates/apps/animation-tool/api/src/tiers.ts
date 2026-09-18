/**
 * Animation Tool tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface AnimationToolLimits {
  /** Maximum number of exports a user may own. */
  maxExports: number

  /** Maximum number of keyframes a user may own. */
  maxKeyframes: number

  /** Maximum number of projects a user may own. */
  maxProjects: number

  /** Maximum number of states a user may own. */
  maxStates: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const animationToolPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: AnimationToolLimits = {
  maxExports: 5,
  maxKeyframes: 5,
  maxProjects: 5,
  maxStates: 5,
  advancedFeatures: false,
  // Free gets a real export allowance — `maxExports: 5` above IS the gate.
  // This was `false`, which made that 5 dead: the count could never be reached
  // because POST /exports 402s before it, the Pricing page advertised "5 exports"
  // and "Data export: —" in the same column, and Export.tsx offers the button to
  // everyone. Rendering an animation is this app's entire output; putting it
  // behind payment leaves a free user with nothing to do. Paid tiers still
  // differentiate on volume (500 / unlimited) and `advancedFeatures`.
  canExport: true,
  retentionDays: 90,
}

const PRO_LIMITS: AnimationToolLimits = {
  maxExports: 500,
  maxKeyframes: 500,
  maxProjects: 500,
  maxStates: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: AnimationToolLimits = {
  maxExports: 999_999,
  maxKeyframes: 999_999,
  maxProjects: 999_999,
  maxStates: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<AnimationToolLimits> = defineTiers<AnimationToolLimits>({
  tiers: {
    [animationToolPlanKeys.free]: {
      planKey: animationToolPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [animationToolPlanKeys.proMonthly]: {
      planKey: animationToolPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [animationToolPlanKeys.proYearly]: {
      planKey: animationToolPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [animationToolPlanKeys.teamMonthly]: {
      planKey: animationToolPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [animationToolPlanKeys.teamYearly]: {
      planKey: animationToolPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: animationToolPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: AnimationToolLimits
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
          stripePriceId: process.env.STRIPE_ANIMATION_TOOL_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_ANIMATION_TOOL_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_ANIMATION_TOOL_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_ANIMATION_TOOL_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
