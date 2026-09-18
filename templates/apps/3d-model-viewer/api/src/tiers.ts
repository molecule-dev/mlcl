/**
 * 3D Model Viewer tier ladder.
 *
 * Identifier prefix `ModelViewer` (TypeScript identifiers cannot start with
 * a digit, so we deliberately drop the `3d` numeric prefix from symbol
 * names while keeping the slug `3d-model-viewer` everywhere else).
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface ModelViewerLimits {
  /** Maximum number of annotations a user may own. */
  maxAnnotations: number

  /** Maximum number of embeds a user may own. */
  maxEmbeds: number

  /** Maximum number of models a user may own. */
  maxModels: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

/** Plan keys recognised by the entitlements glue. Stripe webhook events
 *  set one of these on the `users.planKey` column. */
export const modelViewerPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: ModelViewerLimits = {
  maxAnnotations: 5,
  maxEmbeds: 5,
  maxModels: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: ModelViewerLimits = {
  maxAnnotations: 500,
  maxEmbeds: 500,
  maxModels: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: ModelViewerLimits = {
  maxAnnotations: 999_999,
  maxEmbeds: 999_999,
  maxModels: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

/** 3D Model Viewer tier registry. Bond it with `setupEntitlements()` at startup. */
export const tierRegistry: TierRegistry<ModelViewerLimits> = defineTiers<ModelViewerLimits>({
  tiers: {
    [modelViewerPlanKeys.free]: {
      planKey: modelViewerPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [modelViewerPlanKeys.proMonthly]: {
      planKey: modelViewerPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [modelViewerPlanKeys.proYearly]: {
      planKey: modelViewerPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [modelViewerPlanKeys.teamMonthly]: {
      planKey: modelViewerPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [modelViewerPlanKeys.teamYearly]: {
      planKey: modelViewerPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: modelViewerPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

/** Bond the tier registry as the active entitlements provider. */
export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

/**
 * Display configuration for the public pricing page. Resolves Stripe price
 * IDs at runtime so the same code works across test/staging/production.
 */
export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: ModelViewerLimits
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
          stripePriceId: process.env.STRIPE_3D_MODEL_VIEWER_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_3D_MODEL_VIEWER_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_3D_MODEL_VIEWER_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_3D_MODEL_VIEWER_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
