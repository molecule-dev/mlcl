/**
 * Demo seed for subscription-box (Crate).
 *
 * Seeds three canonical subscription tiers — Curator, Collector,
 * Connoisseur — so the dashboard onboarding view and /boxes catalog
 * render real data with usable IDs. Idempotent: skipped if any
 * subscription_plans row already exists.
 *
 * @module
 */

import { count, create } from '@molecule/api-database'

interface SeededPlan {
  id: string
  slug: string
  name: string
}

interface PlanDef {
  slug: string
  name: string
  description: string
  priceCents: number
  interval: 'month' | 'quarter' | 'year'
  intervalCount: number
  features: string[]
  includedItems: string[]
  maxCustomizations: number
  sortOrder: number
  /** Env var that holds the real Stripe price id at boot time. */
  stripePriceIdEnv: string
}

const PLANS: ReadonlyArray<PlanDef> = [
  {
    slug: 'curator',
    name: 'Curator',
    description:
      'A monthly introduction to small-batch makers. Three hand-picked items, packed and shipped on the first Friday of the month.',
    priceCents: 3800,
    interval: 'month',
    intervalCount: 1,
    features: [
      'Three curated items each month',
      'Curator notes with every shipment',
      'Free continental shipping',
    ],
    includedItems: ['Single-estate tea', 'Wildflower honey', 'Letterpress card set'],
    maxCustomizations: 1,
    sortOrder: 10,
    stripePriceIdEnv: 'STRIPE_SUBSCRIPTION_BOX_PRO_MONTHLY',
  },
  {
    slug: 'collector',
    name: 'Collector',
    description:
      'Five hand-picked items each month with deeper editorial notes and one limited-run object reserved for Collectors only.',
    priceCents: 6800,
    interval: 'month',
    intervalCount: 1,
    features: [
      'Five items including a limited-run object',
      'Maker interviews each month',
      'Customise up to two items per box',
      'Priority shipping',
    ],
    includedItems: [
      'Single-estate tea',
      'Wildflower honey',
      'Letterpress card set',
      'Hand-rolled incense',
      'Limited-run print',
    ],
    maxCustomizations: 2,
    sortOrder: 20,
    stripePriceIdEnv: 'STRIPE_SUBSCRIPTION_BOX_TEAM_MONTHLY',
  },
  {
    slug: 'connoisseur',
    name: 'Connoisseur',
    description:
      'Our flagship tier. Seven curated items, two limited-run pieces, and a quarterly archive gift sent every third month.',
    priceCents: 12800,
    interval: 'month',
    intervalCount: 1,
    features: [
      'Seven items with two limited-run pieces',
      'Quarterly archive gift',
      'Customise up to four items per box',
      'Priority shipping + concierge support',
    ],
    includedItems: [
      'Single-estate tea flight',
      'Estate honey trio',
      'Letterpress card set',
      'Hand-rolled incense',
      'Limited-run print',
      'Archive object',
      'Botanical tonic',
    ],
    maxCustomizations: 4,
    sortOrder: 30,
    stripePriceIdEnv: 'STRIPE_SUBSCRIPTION_BOX_PRO_YEARLY',
  },
]

/**
 * Seed the subscription_plans catalog with three canonical tiers if the
 * table is empty. Idempotent — returns early on subsequent calls.
 */
export async function seedGlobalCatalogIfEmpty(): Promise<{
  plansCreated: number
}> {
  const existing = await count('subscription_plans', [])
  if (existing > 0) {
    return { plansCreated: 0 }
  }

  let plansCreated = 0
  for (const p of PLANS) {
    await create<SeededPlan>('subscription_plans', {
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.priceCents,
      currency: 'USD',
      interval: p.interval,
      interval_count: p.intervalCount,
      features: JSON.stringify(p.features),
      included_items: JSON.stringify(p.includedItems),
      max_customizations: p.maxCustomizations,
      status: 'active',
      sort_order: p.sortOrder,
      // Map each tier onto a real Stripe price id so the Subscribe and
      // /api/billing/checkout flows hit Stripe with a valid resource.
      // Falls back to null in environments without flagship-rollout envs;
      // the handler's `?? planId` branch keeps the unit tests passing.
      stripe_price_id: process.env[p.stripePriceIdEnv] ?? null,
    })
    plansCreated++
  }

  return { plansCreated }
}
