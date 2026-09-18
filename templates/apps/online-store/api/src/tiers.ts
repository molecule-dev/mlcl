/**
 * Online-store tier ladder.
 *
 * Each user's `planKey` (set by the Stripe webhook glue in
 * `@molecule/api-resource-user`) maps to one of these tiers. Limits are
 * enforced by `enforceLimit(...)` middleware on the relevant POST routes.
 *
 * Stripe price IDs are pulled from environment variables so the same code
 * runs in test, staging, and production. Each environment provisions its
 * own Stripe products via the Stripe dashboard or `stripe products create`.
 *
 * @module
 */

import { defineTiers, setProvider, type TierRegistry } from '@molecule/api-entitlements'

/** Quantitative limits enforced per merchant, scaled by subscription tier. */
export interface OnlineStoreLimits {
  /** Maximum number of products in the catalogue. */
  maxProducts: number

  /** Maximum number of orders accepted per calendar month. */
  maxOrdersPerMonth: number

  /** Maximum number of SKU/variant rows per product. */
  maxSkuVariantsPerProduct: number

  /** Storage cap for product image uploads, in megabytes. */
  maxStorageMb: number

  /** Whether the merchant may bind a custom apex/subdomain. */
  customDomain: boolean

  /** Whether automated abandoned-cart recovery emails are enabled. */
  abandonedCartRecovery: boolean

  /** Whether advanced analytics dashboards are unlocked. */
  advancedAnalytics: boolean

  /** Platform transaction fee on each successful order, as a percent (0–100). */
  transactionFeePercent: number

  /** Maximum number of supported display currencies. */
  multiCurrency: number
}

/** Plan keys recognised by the entitlements glue. */
export const onlineStorePlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: OnlineStoreLimits = {
  maxProducts: 25,
  maxOrdersPerMonth: 50,
  maxSkuVariantsPerProduct: 3,
  maxStorageMb: 100,
  customDomain: false,
  abandonedCartRecovery: false,
  advancedAnalytics: false,
  transactionFeePercent: 5,
  multiCurrency: 1,
}

const PRO_LIMITS: OnlineStoreLimits = {
  maxProducts: 5_000,
  maxOrdersPerMonth: 5_000,
  maxSkuVariantsPerProduct: 50,
  maxStorageMb: 5_120,
  customDomain: true,
  abandonedCartRecovery: true,
  advancedAnalytics: true,
  transactionFeePercent: 2,
  multiCurrency: 25,
}

const TEAM_LIMITS: OnlineStoreLimits = {
  maxProducts: 999_999,
  maxOrdersPerMonth: 999_999,
  maxSkuVariantsPerProduct: 999_999,
  maxStorageMb: 51_200,
  customDomain: true,
  abandonedCartRecovery: true,
  advancedAnalytics: true,
  transactionFeePercent: 0,
  multiCurrency: 999_999,
}

/** Online-store tier registry. Bond it with `setupEntitlements()` at startup. */
export const tierRegistry: TierRegistry<OnlineStoreLimits> = defineTiers<OnlineStoreLimits>({
  tiers: {
    [onlineStorePlanKeys.free]: {
      planKey: onlineStorePlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [onlineStorePlanKeys.proMonthly]: {
      planKey: onlineStorePlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [onlineStorePlanKeys.proYearly]: {
      planKey: onlineStorePlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [onlineStorePlanKeys.teamMonthly]: {
      planKey: onlineStorePlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [onlineStorePlanKeys.teamYearly]: {
      planKey: onlineStorePlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: onlineStorePlanKeys.free,
  categoryOrder: ['free', 'pro', 'team'],
})

/** Bond the tier registry as the active entitlements provider. */
export function setupEntitlements(): void {
  setProvider(tierRegistry)
}

/**
 * Display configuration for the public pricing page.
 *
 * @returns Pricing tier display data ready to render on the `/pricing` page.
 */
export function getPricingTiers(): Array<{
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: OnlineStoreLimits
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
          price: '$29/mo',
          stripePriceId: process.env.STRIPE_ONLINE_STORE_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$290/yr',
          stripePriceId: process.env.STRIPE_ONLINE_STORE_PRO_YEARLY ?? null,
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
          price: '$99/mo',
          stripePriceId: process.env.STRIPE_ONLINE_STORE_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$990/yr',
          stripePriceId: process.env.STRIPE_ONLINE_STORE_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
