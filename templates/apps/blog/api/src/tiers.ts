/**
 * Blog tier ladder.
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
export interface BlogLimits {
  /** Total number of posts a user may have at any time (drafts + published). */
  maxPosts: number

  /** Maximum number of comments the user may post per calendar day. */
  maxCommentsPerDay: number

  /** Whether the user may schedule posts for future publication. */
  canSchedulePosts: boolean

  /** Whether the user may upload custom cover images / inline images. */
  canUploadImages: boolean

  /** Storage cap for uploaded images, in megabytes. 0 = no uploads. */
  uploadStorageMb: number

  /** Whether the user may use AI-driven post summarization. */
  aiSummarization: boolean

  /** Whether the user gets advanced analytics on their posts. */
  advancedAnalytics: boolean

  /** Maximum number of custom tags a user may create. */
  maxTags: number

  /** Whether the user may export their content as JSON / Markdown. */
  canExport: boolean
}

/** Plan keys recognised by the entitlements glue. */
export const blogPlanKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
} as const

const FREE_LIMITS: BlogLimits = {
  maxPosts: 5,
  maxCommentsPerDay: 20,
  canSchedulePosts: false,
  canUploadImages: false,
  uploadStorageMb: 0,
  aiSummarization: false,
  advancedAnalytics: false,
  maxTags: 5,
  canExport: false,
}

const PRO_LIMITS: BlogLimits = {
  maxPosts: 500,
  maxCommentsPerDay: 1_000,
  canSchedulePosts: true,
  canUploadImages: true,
  uploadStorageMb: 1_024,
  aiSummarization: true,
  advancedAnalytics: true,
  maxTags: 100,
  canExport: true,
}

const TEAM_LIMITS: BlogLimits = {
  maxPosts: 999_999,
  maxCommentsPerDay: 999_999,
  canSchedulePosts: true,
  canUploadImages: true,
  uploadStorageMb: 51_200,
  aiSummarization: true,
  advancedAnalytics: true,
  maxTags: 999_999,
  canExport: true,
}

/** Blog tier registry. Bond it with `setupEntitlements()` at startup. */
export const tierRegistry: TierRegistry<BlogLimits> = defineTiers<BlogLimits>({
  tiers: {
    [blogPlanKeys.free]: {
      planKey: blogPlanKeys.free,
      category: 'free',
      name: 'Free',
      limits: FREE_LIMITS,
    },
    [blogPlanKeys.proMonthly]: {
      planKey: blogPlanKeys.proMonthly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [blogPlanKeys.proYearly]: {
      planKey: blogPlanKeys.proYearly,
      category: 'pro',
      name: 'Pro',
      limits: PRO_LIMITS,
    },
    [blogPlanKeys.teamMonthly]: {
      planKey: blogPlanKeys.teamMonthly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
    [blogPlanKeys.teamYearly]: {
      planKey: blogPlanKeys.teamYearly,
      category: 'team',
      name: 'Team',
      limits: TEAM_LIMITS,
    },
  },
  defaultPlanKey: blogPlanKeys.free,
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
  limits: BlogLimits
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
          price: '$8/mo',
          stripePriceId: process.env.STRIPE_BLOG_PRO_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$80/yr',
          stripePriceId: process.env.STRIPE_BLOG_PRO_YEARLY ?? null,
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
          price: '$25/mo',
          stripePriceId: process.env.STRIPE_BLOG_TEAM_MONTHLY ?? null,
        },
        {
          period: 'year',
          price: '$250/yr',
          stripePriceId: process.env.STRIPE_BLOG_TEAM_YEARLY ?? null,
        },
      ],
      limits: TEAM_LIMITS,
    },
  ]
}
