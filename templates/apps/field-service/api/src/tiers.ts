/**
 * Field Service tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface FieldServiceLimits {
  /** Maximum number of customers a user may own. */
  maxCustomers: number

  /** Maximum number of quotes a user may own. */
  maxQuotes: number

  /** Maximum number of jobs a user may own. */
  maxJobs: number

  /** Maximum number of technicians a user may own. */
  maxTechnicians: number

  /** Maximum number of invoices a user may own. */
  maxInvoices: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const fieldServicePlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: FieldServiceLimits = {
  // Free-tier limits sized to fit the seeded demo (8 customers, 7 quotes,
  // 13 jobs, 6 technicians, 5 invoices) plus headroom so a trial user can
  // add records without immediately hitting the upgrade wall.
  maxCustomers: 15,
  maxQuotes: 25,
  maxJobs: 30,
  maxTechnicians: 10,
  maxInvoices: 30,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: FieldServiceLimits = {
  maxCustomers: 1000,
  maxQuotes: 5000,
  maxJobs: 10000,
  maxTechnicians: 100,
  maxInvoices: 10000,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: FieldServiceLimits = {
  maxCustomers: 999_999,
  maxQuotes: 999_999,
  maxJobs: 999_999,
  maxTechnicians: 999_999,
  maxInvoices: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<FieldServiceLimits> = defineTiers<FieldServiceLimits>({
  tiers: {
    [fieldServicePlanKeys.free]: {
      planKey: fieldServicePlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [fieldServicePlanKeys.proMonthly]: {
      planKey: fieldServicePlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [fieldServicePlanKeys.proYearly]: {
      planKey: fieldServicePlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [fieldServicePlanKeys.teamMonthly]: {
      planKey: fieldServicePlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [fieldServicePlanKeys.teamYearly]: {
      planKey: fieldServicePlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: fieldServicePlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: FieldServiceLimits
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
          stripePriceId: process.env.STRIPE_FIELD_SERVICE_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_FIELD_SERVICE_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_FIELD_SERVICE_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_FIELD_SERVICE_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
