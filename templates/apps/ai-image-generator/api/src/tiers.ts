/**
 * Ai Image Generator tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface AiImageGeneratorLimits {
  /** Maximum number of gallery a user may own. */
  maxGallery: number

  /** Maximum number of generations a user may own. */
  maxGenerations: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const aiImageGeneratorPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

// Keep these numbers in sync with the credit allowances in
// `handlers/plans.ts` (Starter 120 / Creator 4,000 / Studio 20,000
// credits per month) so the public pricing page never contradicts the
// in-app plan catalogue.
const FREE_LIMITS: AiImageGeneratorLimits = {
  maxGallery: 120,
  maxGenerations: 120,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: AiImageGeneratorLimits = {
  maxGallery: 4_000,
  maxGenerations: 4_000,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: AiImageGeneratorLimits = {
  maxGallery: 999_999,
  maxGenerations: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<AiImageGeneratorLimits> =
  defineTiers<AiImageGeneratorLimits>({
    tiers: {
      [aiImageGeneratorPlanKeys.free]: {
        planKey: aiImageGeneratorPlanKeys.free,
        category: 'free',
        name: 'Starter',
        limits: FREE_LIMITS,
      },
      [aiImageGeneratorPlanKeys.proMonthly]: {
        planKey: aiImageGeneratorPlanKeys.proMonthly,
        category: 'pro',
        name: 'Creator',
        limits: PRO_LIMITS,
      },
      [aiImageGeneratorPlanKeys.proYearly]: {
        planKey: aiImageGeneratorPlanKeys.proYearly,
        category: 'pro',
        name: 'Creator',
        limits: PRO_LIMITS,
      },
      [aiImageGeneratorPlanKeys.teamMonthly]: {
        planKey: aiImageGeneratorPlanKeys.teamMonthly,
        category: 'team',
        name: 'Studio',
        limits: TEAM_LIMITS,
      },
      [aiImageGeneratorPlanKeys.teamYearly]: {
        planKey: aiImageGeneratorPlanKeys.teamYearly,
        category: 'team',
        name: 'Studio',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: aiImageGeneratorPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: AiImageGeneratorLimits
}> {
  // Names and monthly prices mirror `handlers/plans.ts` (the in-app plan
  // catalogue used by Settings and the Landing page) so every surface
  // advertises the same ladder: Starter $0, Creator $24/mo, Studio $96/mo.
  return [
    {
      key: 'free',
      name: 'Starter',
      prices: [{ period: 'month', price: '$0', stripePriceId: null }],
      limits: FREE_LIMITS,
    },
    {
      key: 'pro',
      name: 'Creator',
      prices: [
        {
          period: 'month',
          price: '$24/mo',
          stripePriceId: process.env.STRIPE_AI_IMAGE_GENERATOR_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$240/yr',
          stripePriceId: process.env.STRIPE_AI_IMAGE_GENERATOR_PRO_YEARLY ?? null,
        },
      ],
      limits: PRO_LIMITS,
    },
    {
      key: 'team',
      name: 'Studio',
      prices: [
        {
          period: 'month',
          price: '$96/mo',
          stripePriceId: process.env.STRIPE_AI_IMAGE_GENERATOR_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$960/yr',
          stripePriceId: process.env.STRIPE_AI_IMAGE_GENERATOR_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
