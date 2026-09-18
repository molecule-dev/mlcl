/**
 * Presentation Builder tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface PresentationBuilderLimits {
  /** Maximum number of exports a user may own. */
  maxExports: number

  /** Maximum number of presentations a user may own. */
  maxPresentations: number

  /** Maximum number of slides a user may own. */
  maxSlides: number

  /** Maximum number of themes a user may own. */
  maxThemes: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const presentationBuilderPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: PresentationBuilderLimits = {
  maxExports: 5,
  maxPresentations: 5,
  maxSlides: 5,
  maxThemes: 5,
  advancedFeatures: false,
  // Free gets a real export allowance — `maxExports` above IS the gate. This was
  // `false`, which made that number dead: POST /exports 402s before the count can
  // ever be reached, while Pricing advertised both and the export UI offered the
  // button to everyone. Exporting is this app’s entire output; behind payment a
  // free user has nothing to do. Paid tiers still differ on volume and
  // advancedFeatures.
  canExport: true,
  retentionDays: 90,
}

const PRO_LIMITS: PresentationBuilderLimits = {
  maxExports: 500,
  maxPresentations: 500,
  maxSlides: 500,
  maxThemes: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: PresentationBuilderLimits = {
  maxExports: 999_999,
  maxPresentations: 999_999,
  maxSlides: 999_999,
  maxThemes: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<PresentationBuilderLimits> =
  defineTiers<PresentationBuilderLimits>({
    tiers: {
      [presentationBuilderPlanKeys.free]: {
        planKey: presentationBuilderPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [presentationBuilderPlanKeys.proMonthly]: {
        planKey: presentationBuilderPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [presentationBuilderPlanKeys.proYearly]: {
        planKey: presentationBuilderPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [presentationBuilderPlanKeys.teamMonthly]: {
        planKey: presentationBuilderPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [presentationBuilderPlanKeys.teamYearly]: {
        planKey: presentationBuilderPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: presentationBuilderPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  })

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: PresentationBuilderLimits
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
          stripePriceId: process.env.STRIPE_PRESENTATION_BUILDER_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_PRESENTATION_BUILDER_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_PRESENTATION_BUILDER_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_PRESENTATION_BUILDER_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
