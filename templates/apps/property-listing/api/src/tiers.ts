/**
 * Property-listing tier ladder.
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

/** Quantitative limits enforced per user, scaled by subscription tier. */
export interface PropertyListingLimits {
  /** Total number of property listings the user may have active. */
  maxListings: number

  /** Maximum number of photos per listing. */
  maxPhotosPerListing: number

  /** Total upload storage cap, in megabytes. */
  maxStorageMb: number

  /** Number of listings the user may promote as featured. */
  featuredListings: number

  /** Whether the user may attach virtual tour links / 3D walkthroughs. */
  virtualTours: boolean

  /** Whether the in-listing mortgage calculator is available. */
  mortgageCalculator: boolean

  /** Whether the user may collect leads via the listing contact form. */
  leadCapture: boolean

  /** Whether the user may apply custom branding to their listings. */
  customBranding: boolean

  /** Number of agent sub-accounts the user may invite. */
  agentAccounts: number
}

/** Plan keys recognised by the entitlements glue. */
export const propertyListingPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: PropertyListingLimits = {
  maxListings: 5,
  maxPhotosPerListing: 5,
  maxStorageMb: 50,
  featuredListings: 0,
  virtualTours: false,
  mortgageCalculator: false,
  leadCapture: false,
  customBranding: false,
  agentAccounts: 1,
}

const PRO_LIMITS: PropertyListingLimits = {
  maxListings: 100,
  maxPhotosPerListing: 30,
  maxStorageMb: 5_120,
  featuredListings: 5,
  virtualTours: true,
  mortgageCalculator: true,
  leadCapture: true,
  customBranding: true,
  agentAccounts: 5,
}

const TEAM_LIMITS: PropertyListingLimits = {
  maxListings: 999_999,
  maxPhotosPerListing: 999_999,
  maxStorageMb: 51_200,
  featuredListings: 999_999,
  virtualTours: true,
  mortgageCalculator: true,
  leadCapture: true,
  customBranding: true,
  agentAccounts: 999_999,
}

/** Property-listing tier registry. Bond it with `setupEntitlements()` at startup. */
export const tierRegistry: TierRegistry<PropertyListingLimits> = defineTiers<PropertyListingLimits>(
  {
    tiers: {
      [propertyListingPlanKeys.free]: {
        planKey: propertyListingPlanKeys.free,
        category: 'free',
        name: 'Free',
        limits: FREE_LIMITS,
      },
      [propertyListingPlanKeys.proMonthly]: {
        planKey: propertyListingPlanKeys.proMonthly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [propertyListingPlanKeys.proYearly]: {
        planKey: propertyListingPlanKeys.proYearly,
        category: 'pro',
        name: 'Pro',
        limits: PRO_LIMITS,
      },
      [propertyListingPlanKeys.teamMonthly]: {
        planKey: propertyListingPlanKeys.teamMonthly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
      [propertyListingPlanKeys.teamYearly]: {
        planKey: propertyListingPlanKeys.teamYearly,
        category: 'team',
        name: 'Team',
        limits: TEAM_LIMITS,
      },
    },
    defaultPlanKey: propertyListingPlanKeys.free,
    categoryOrder: ['free', 'pro', 'team'],
  },
)

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
  limits: PropertyListingLimits
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
          price: '$39/mo',
          stripePriceId: process.env.STRIPE_PROPERTY_LISTING_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$390/yr',
          stripePriceId: process.env.STRIPE_PROPERTY_LISTING_PRO_YEARLY ?? null,
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
          stripePriceId: process.env.STRIPE_PROPERTY_LISTING_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$990/yr',
          stripePriceId: process.env.STRIPE_PROPERTY_LISTING_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
