/**
 * Design Canvas tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface DesignCanvasLimits {
  /** Maximum number of exports a user may own. */
  maxExports: number

  /** Maximum number of layers a user may own. */
  maxLayers: number

  /** Maximum number of projects a user may own. */
  maxProjects: number

  /** Maximum number of shapes a user may own. */
  maxShapes: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const designCanvasPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: DesignCanvasLimits = {
  maxExports: 5,
  maxLayers: 5,
  maxProjects: 5,
  maxShapes: 5,
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

const PRO_LIMITS: DesignCanvasLimits = {
  maxExports: 500,
  maxLayers: 500,
  maxProjects: 500,
  maxShapes: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: DesignCanvasLimits = {
  maxExports: 999_999,
  maxLayers: 999_999,
  maxProjects: 999_999,
  maxShapes: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<DesignCanvasLimits> = defineTiers<DesignCanvasLimits>({
  tiers: {
    [designCanvasPlanKeys.free]: {
      planKey: designCanvasPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [designCanvasPlanKeys.proMonthly]: {
      planKey: designCanvasPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [designCanvasPlanKeys.proYearly]: {
      planKey: designCanvasPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [designCanvasPlanKeys.teamMonthly]: {
      planKey: designCanvasPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [designCanvasPlanKeys.teamYearly]: {
      planKey: designCanvasPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: designCanvasPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: DesignCanvasLimits
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
          stripePriceId: process.env.STRIPE_DESIGN_CANVAS_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_DESIGN_CANVAS_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_DESIGN_CANVAS_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_DESIGN_CANVAS_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
