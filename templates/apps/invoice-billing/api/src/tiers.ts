/**
 * Invoice Billing tier ladder.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface InvoiceBillingLimits {
  /** Maximum number of clients a user may own. */
  maxClients: number

  /** Maximum number of invoices a user may own. */
  maxInvoices: number

  /** Maximum number of payments a user may own. */
  maxPayments: number

  /** Maximum number of recurring a user may own. */
  maxRecurring: number

  /** Whether the user has access to advanced features beyond the basics. */
  advancedFeatures: boolean

  /** Whether the user may export their data. */
  canExport: boolean

  /** Days of historical data retained. 0 = unlimited. */
  retentionDays: number
}

export const invoiceBillingPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: InvoiceBillingLimits = {
  // Demo seed creates 4 clients + 5 invoices + a few payments and 1
  // recurring on a fresh signup. Free tier headroom must accommodate
  // those starting points AND leave room for a real user to play with
  // the app on their own — otherwise the very first "New invoice"
  // click hits a paywall on a fresh account.
  maxClients: 25,
  maxInvoices: 25,
  maxPayments: 50,
  maxRecurring: 5,
  advancedFeatures: false,
  canExport: false,
  retentionDays: 90,
}

const PRO_LIMITS: InvoiceBillingLimits = {
  maxClients: 500,
  maxInvoices: 500,
  maxPayments: 500,
  maxRecurring: 500,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 365,
}

const TEAM_LIMITS: InvoiceBillingLimits = {
  maxClients: 999_999,
  maxInvoices: 999_999,
  maxPayments: 999_999,
  maxRecurring: 999_999,
  advancedFeatures: true,
  canExport: true,
  retentionDays: 0,
}

export const tierRegistry: TierRegistry<InvoiceBillingLimits> = defineTiers<InvoiceBillingLimits>({
  tiers: {
    [invoiceBillingPlanKeys.free]: {
      planKey: invoiceBillingPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [invoiceBillingPlanKeys.proMonthly]: {
      planKey: invoiceBillingPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [invoiceBillingPlanKeys.proYearly]: {
      planKey: invoiceBillingPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [invoiceBillingPlanKeys.teamMonthly]: {
      planKey: invoiceBillingPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [invoiceBillingPlanKeys.teamYearly]: {
      planKey: invoiceBillingPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: invoiceBillingPlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: InvoiceBillingLimits
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
          stripePriceId: process.env.STRIPE_INVOICE_BILLING_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$150/yr',
          stripePriceId: process.env.STRIPE_INVOICE_BILLING_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_INVOICE_BILLING_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$490/yr',
          stripePriceId: process.env.STRIPE_INVOICE_BILLING_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
