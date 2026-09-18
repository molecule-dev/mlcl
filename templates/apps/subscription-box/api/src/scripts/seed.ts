/**
 * Idempotent seed. Runs once at server startup. Populates the global
 * subscription_plans table so the /api/plans endpoint returns real
 * data on a fresh install — every page in the app depends on having
 * at least one tier to subscribe to.
 *
 * Adding rows here is safe: each row keys off slug uniqueness, so
 * a re-run only inserts what's missing.
 */

import { count, create } from '@molecule/api-database'

interface PlanSeed {
  slug: string
  name: string
  description: string
  price_cents: number
  interval: 'month' | 'quarter' | 'year'
  interval_count: number
  features: string[]
  included_items: string[]
  max_customizations: number
  stripe_price_id_env:
    | 'STRIPE_SUBSCRIPTION_BOX_PRO_MONTHLY'
    | 'STRIPE_SUBSCRIPTION_BOX_PRO_YEARLY'
    | 'STRIPE_SUBSCRIPTION_BOX_TEAM_MONTHLY'
    | 'STRIPE_SUBSCRIPTION_BOX_TEAM_YEARLY'
    | null
  sort_order: number
}

const PLANS: PlanSeed[] = [
  {
    slug: 'curator',
    name: 'Curator',
    description: 'A monthly taste of Crate — 4 to 5 hand-picked items.',
    price_cents: 3200,
    interval: 'month',
    interval_count: 1,
    features: [
      '4–5 curated items each month',
      'Free shipping in the continental US',
      'Skip a box anytime — no penalty',
      'Members-only seasonal previews',
    ],
    included_items: [
      'Hand-poured beeswax candle',
      'Letterpress correspondence cards',
      'Wild-rose sipping syrup',
    ],
    max_customizations: 1,
    stripe_price_id_env: 'STRIPE_SUBSCRIPTION_BOX_PRO_MONTHLY',
    sort_order: 10,
  },
  {
    slug: 'collector',
    name: 'Collector',
    description: 'Our most-loved tier — 6 to 7 items + a quarterly surprise.',
    price_cents: 4800,
    interval: 'month',
    interval_count: 1,
    features: [
      '6–7 curated items each month',
      'Quarterly limited-edition collectible',
      'Swap up to 2 items per box',
      'Early access to new editions',
      'Free shipping worldwide',
    ],
    included_items: [
      'Hand-poured beeswax candle',
      'Indigo-dyed linen napkins',
      'Wild-rose sipping syrup',
      'Hand-thrown stoneware coaster',
      'Letterpress correspondence cards',
      'Essay zine: On finding wonder',
    ],
    max_customizations: 2,
    stripe_price_id_env: 'STRIPE_SUBSCRIPTION_BOX_PRO_YEARLY',
    sort_order: 20,
  },
  {
    slug: 'connoisseur',
    name: 'Connoisseur',
    description: 'The full archive — every drop and a hand-written note from us.',
    price_cents: 7800,
    interval: 'month',
    interval_count: 1,
    features: [
      '9–10 curated items each month',
      'Every limited edition the moment it drops',
      'Unlimited swaps and a custom note',
      'A complimentary anniversary box',
      'Concierge curation calls (twice a year)',
    ],
    included_items: [
      'Hand-poured beeswax candle',
      'Indigo-dyed linen napkins',
      'Wild-rose sipping syrup',
      'Hand-thrown stoneware coaster',
      'Letterpress correspondence cards',
      'Essay zine: On finding wonder',
      'Wool throw, charcoal heather',
      'Single-origin coffee, 8oz',
    ],
    max_customizations: 5,
    stripe_price_id_env: 'STRIPE_SUBSCRIPTION_BOX_TEAM_MONTHLY',
    sort_order: 30,
  },
]

export async function seedPlans(): Promise<void> {
  for (const plan of PLANS) {
    const existing = await count('subscription_plans', [
      { field: 'slug', operator: '=', value: plan.slug },
    ])
    if (existing > 0) continue

    const stripePriceId = plan.stripe_price_id_env
      ? (process.env[plan.stripe_price_id_env] ?? null)
      : null

    await create('subscription_plans', {
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      price: plan.price_cents,
      currency: 'USD',
      interval: plan.interval,
      interval_count: plan.interval_count,
      // jsonb columns: stringify so node-postgres sends valid JSON
      // instead of postgres array-literal syntax (`{a,b}`).
      features: JSON.stringify(plan.features),
      included_items: JSON.stringify(plan.included_items),
      max_customizations: plan.max_customizations,
      stripe_price_id: stripePriceId,
      status: 'active',
      sort_order: plan.sort_order,
    })
  }
}
