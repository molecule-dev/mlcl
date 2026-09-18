/**
 * Demo seed for coupon-deals-platform.
 *
 * Seeding runs in two layers:
 *
 * 1. **Globals** (`seedGlobalCatalogIfEmpty`) — categories, merchants,
 *    and deals used across the catalog. These are idempotent: if any
 *    category row already exists we skip globals entirely. Called once
 *    at server boot.
 *
 * 2. **Per-user** (`seedDemoForUser`) — a small starter set of saved
 *    coupons and notifications so a freshly signed-up user lands on
 *    a Dashboard / MyCoupons / Notifications page that actually shows
 *    something. Idempotent on user_id.
 *
 * @module
 */

import crypto from 'node:crypto'

import { count, create, findMany, findOne } from '@molecule/api-database'

const CATEGORIES = [
  { name: 'Restaurants', slug: 'restaurants', icon: 'restaurant', sort_order: 0 },
  { name: 'Beauty', slug: 'beauty', icon: 'spa', sort_order: 1 },
  { name: 'Fitness', slug: 'fitness', icon: 'fitness_center', sort_order: 2 },
  { name: 'Activities', slug: 'activities', icon: 'hiking', sort_order: 3 },
  { name: 'Online', slug: 'online', icon: 'shopping_bag', sort_order: 4 },
  { name: 'Services', slug: 'services', icon: 'home_repair_service', sort_order: 5 },
] as const

const MERCHANTS = [
  {
    name: 'Sunny Side Cafe',
    desc: 'All-day brunch spot with rotating seasonal menus.',
    address: '248 Vanderbilt Ave, Brooklyn, NY 11205',
    phone: '+1 (718) 555-0142',
    rating: 4.6,
    lat: 40.6878,
    lng: -73.9682,
    deals: [
      {
        title: '$30 for $60 worth of brunch at Sunny Side',
        description:
          'Two weekend brunches for the price of one. Includes one entrée + one drink each.',
        terms:
          'Valid 9am-2pm Sat/Sun only.\nCannot combine with other promotions.\nReservations recommended.',
        original_price_cents: 6000,
        deal_price_cents: 3000,
        category: 'restaurants',
        days: 14,
        featured: true,
      },
    ],
  },
  {
    name: 'Lotus Studio',
    desc: 'Heated yoga studio with daily drop-ins and 5-class punch cards.',
    address: '116 Bedford Ave, Brooklyn, NY 11211',
    phone: '+1 (718) 555-0913',
    rating: 4.8,
    lat: 40.7173,
    lng: -73.9594,
    deals: [
      {
        title: '$25 for $50 yoga class card (5 classes)',
        description: '5-class punch card for any drop-in class.',
        terms: 'New customers only.\nExpires 90 days from first redemption.',
        original_price_cents: 5000,
        deal_price_cents: 2500,
        category: 'fitness',
        days: 7,
        featured: true,
      },
    ],
  },
  {
    name: 'Threadly',
    desc: 'Sustainable online apparel store. Promo codes only.',
    address: '',
    phone: '',
    rating: 4.4,
    lat: null,
    lng: null,
    deals: [
      {
        title: '20% off entire order at Threadly',
        description: 'Online promo code: 20% off your full order.',
        terms: 'One-time use per customer.\nExcludes gift cards.',
        original_price_cents: 0,
        deal_price_cents: 0,
        category: 'online',
        days: 21,
        featured: false,
      },
    ],
  },
  {
    name: 'Tranquil Touch Spa',
    desc: 'Day spa offering massage, facials, and recovery services.',
    address: '432 5th Ave, Brooklyn, NY 11215',
    phone: '+1 (718) 555-0218',
    rating: 4.7,
    lat: 40.6678,
    lng: -73.9826,
    deals: [
      {
        title: '$45 for $90 spa massage (60 min)',
        description: '60-minute therapeutic massage with a licensed therapist.',
        terms: 'Appointments required, 24h cancellation.',
        original_price_cents: 9000,
        deal_price_cents: 4500,
        category: 'beauty',
        days: 38,
        featured: false,
      },
    ],
  },
  {
    name: 'Vertical Edge',
    desc: 'Indoor climbing gym with bouldering walls and pro shop.',
    address: '180 Front St, Brooklyn, NY 11201',
    phone: '+1 (718) 555-0701',
    rating: 4.9,
    lat: 40.7035,
    lng: -73.987,
    deals: [
      {
        title: '$20 for $40 climbing day-pass',
        description: 'Full-day climbing pass with shoe + harness rental.',
        terms: 'Liability waiver required.',
        original_price_cents: 4000,
        deal_price_cents: 2000,
        category: 'activities',
        days: 5,
        featured: true,
      },
    ],
  },
  {
    name: 'Studio 18 Salon',
    desc: 'Color, cut, and treatment salon in Park Slope.',
    address: '189 7th Ave, Brooklyn, NY 11215',
    phone: '+1 (718) 555-0188',
    rating: 4.5,
    lat: 40.6691,
    lng: -73.9784,
    deals: [
      {
        title: 'Free haircut with first color service',
        description: 'Free haircut ($30 value) with any color service ($55+).',
        terms: 'New clients only.',
        original_price_cents: 8500,
        deal_price_cents: 5500,
        category: 'beauty',
        days: 10,
        featured: false,
      },
    ],
  },
  {
    name: 'Quick Mobile Detail',
    desc: 'Mobile car-detailing service that comes to your driveway.',
    address: '720 Atlantic Ave, Brooklyn, NY 11238',
    phone: '+1 (718) 555-0555',
    rating: 4.3,
    lat: 40.6852,
    lng: -73.9722,
    deals: [
      {
        title: '30% off services at Quick Mobile Detail',
        description: 'Mobile car detail at your address. Sedan/SUV.',
        terms: 'Service area: within 10 miles of downtown.',
        original_price_cents: 12000,
        deal_price_cents: 8400,
        category: 'services',
        days: 9,
        featured: false,
      },
    ],
  },
  {
    name: 'Slice Time',
    desc: 'Walk-in pizza joint with daily two-slice combos.',
    address: '95 Court St, Brooklyn, NY 11201',
    phone: '+1 (718) 555-0431',
    rating: 4.6,
    lat: 40.6904,
    lng: -73.9926,
    deals: [
      {
        title: '$15 for $30 pizza + drinks at Slice Time',
        description: 'Two large slices + two drinks.',
        terms: 'Dine-in only.',
        original_price_cents: 3000,
        deal_price_cents: 1500,
        category: 'restaurants',
        days: 3,
        featured: true,
      },
    ],
  },
] as const

function generateRedemptionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.randomBytes(12)
  let code = ''
  for (let i = 0; i < 12; i++) code += chars[bytes[i] % chars.length]
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`
}

/**
 * Seed the global catalog (categories + merchants + deals) if the
 * `categories` table is empty. Idempotent.
 */
export async function seedGlobalCatalogIfEmpty(): Promise<{
  categoriesCreated: number
  merchantsCreated: number
  dealsCreated: number
}> {
  const existingCategoryCount = await count('categories', [])
  if (existingCategoryCount > 0) {
    return { categoriesCreated: 0, merchantsCreated: 0, dealsCreated: 0 }
  }

  const categoryIdsBySlug = new Map<string, string>()
  for (const cat of CATEGORIES) {
    const created = await create<Record<string, unknown>>('categories', {
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      sort_order: cat.sort_order,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    })
    const row = (created.data ?? created) as Record<string, unknown>
    categoryIdsBySlug.set(cat.slug, String(row.id))
  }

  let merchantsCreated = 0
  let dealsCreated = 0
  // The seed catalog has no real owner user — leave user_id blank using
  // a stable demo UUID so PUT /merchants/:id (status updates by an admin)
  // still works without ownership churn. The string-typed user_id keeps
  // foreign-key relationships consistent without referencing a user row.
  const demoOwnerUserId = '00000000-0000-0000-0000-000000000000'

  for (const m of MERCHANTS) {
    const created = await create<Record<string, unknown>>('merchants', {
      user_id: demoOwnerUserId,
      business_name: m.name,
      business_description: m.desc,
      contact_phone: m.phone,
      address: m.address,
      latitude: m.lat,
      longitude: m.lng,
      status: 'approved',
      commission_rate: 0.15,
      total_revenue: 0,
      total_deals: m.deals.length,
      rating: m.rating,
      review_count: Math.floor(m.rating * 28),
      created_at: new Date(),
      updated_at: new Date(),
    })
    const merchant = (created.data ?? created) as Record<string, unknown>
    merchantsCreated++

    for (const d of m.deals) {
      await create('deals', {
        merchant_id: merchant.id,
        category_id: categoryIdsBySlug.get(d.category) ?? null,
        title: d.title,
        description: d.description,
        terms: d.terms,
        original_price: d.original_price_cents,
        discounted_price: d.deal_price_cents,
        discount_percent:
          d.original_price_cents > 0
            ? Math.round((1 - d.deal_price_cents / d.original_price_cents) * 100)
            : 20,
        total_quantity: 100,
        remaining_quantity: 100,
        starts_at: new Date(),
        expires_at: new Date(Date.now() + d.days * 86_400_000),
        address: m.address,
        latitude: m.lat,
        longitude: m.lng,
        images: JSON.stringify([]),
        thumbnails: JSON.stringify([]),
        tags: [],
        status: 'active',
        featured: d.featured,
        created_at: new Date(),
        updated_at: new Date(),
      })
      dealsCreated++
    }
  }

  return { categoriesCreated: CATEGORIES.length, merchantsCreated, dealsCreated }
}

/**
 * Seed a freshly signed-up user with a small starter set of saved
 * coupons + notifications so the Dashboard / MyCoupons / Notifications
 * pages render with content. Idempotent: returns early if the user
 * already has any redemption rows.
 */
export async function seedDemoForUser(userId: string): Promise<{
  redemptionsCreated: number
  notificationsCreated: number
}> {
  if (!userId) return { redemptionsCreated: 0, notificationsCreated: 0 }
  const existingRedemptions = await count('redemptions', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existingRedemptions > 0) return { redemptionsCreated: 0, notificationsCreated: 0 }

  // Pick the first three active deals across distinct merchants so the
  // demo profile shows variety on the Dashboard top-merchants list.
  const deals = await findMany<Record<string, unknown>>('deals', {
    where: [{ field: 'status', operator: '=', value: 'active' }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
    limit: 8,
  })
  const seen = new Set<string>()
  const picks: Record<string, unknown>[] = []
  for (const d of deals) {
    const mid = String(d.merchant_id ?? '')
    if (seen.has(mid)) continue
    seen.add(mid)
    picks.push(d)
    if (picks.length === 3) break
  }

  let redemptionsCreated = 0
  for (let i = 0; i < picks.length; i++) {
    const deal = picks[i]
    const merchant = await findOne<Record<string, unknown>>('merchants', [
      { field: 'id', operator: '=', value: deal.merchant_id as string },
    ])
    const code = generateRedemptionCode()
    const isRedeemed = i === 1 // middle pick already redeemed for demo variety
    const purchasePrice = Number(deal.discounted_price ?? 0)
    const savings = Number(deal.original_price ?? 0) - Number(deal.discounted_price ?? 0)
    const redemptionRow = await create<Record<string, unknown>>('redemptions', {
      user_id: userId,
      deal_id: deal.id,
      merchant_id: deal.merchant_id,
      merchant_name: merchant?.business_name ?? null,
      code,
      qr_token: crypto.randomUUID(),
      qr_data: JSON.stringify({ code, deal_id: deal.id, user_id: userId }),
      status: isRedeemed ? 'redeemed' : 'purchased',
      purchase_price: purchasePrice,
      savings_cents: savings,
      purchased_at: new Date(Date.now() - (i + 1) * 86_400_000),
      redeemed_at: isRedeemed ? new Date(Date.now() - 86_400_000) : null,
      saved_at: new Date(Date.now() - (i + 1) * 86_400_000),
      expires_at: deal.expires_at,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const r = (redemptionRow.data ?? redemptionRow) as Record<string, unknown>
    await create('my_coupons', {
      user_id: userId,
      redemption_id: r.id,
      deal_id: deal.id,
      merchant_id: deal.merchant_id,
      code,
      status: isRedeemed ? 'redeemed' : 'active',
      saved_at: new Date(Date.now() - (i + 1) * 86_400_000),
      used_at: isRedeemed ? new Date(Date.now() - 86_400_000) : null,
      created_at: new Date(),
    })
    redemptionsCreated++
  }

  // Notifications keyed off the same picks
  const notifications = [
    {
      type: 'hot_deal',
      title: 'New hot deal nearby',
      body: 'A 50% off deal just dropped at Sunny Side Cafe.',
      href: picks[0] ? `/deals/${picks[0].id}` : '/deals',
      entity_id: picks[0]?.id ?? null,
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    {
      type: 'expiring',
      title: 'Coupon expiring soon',
      body: 'Your saved climbing day-pass expires in 24 hours.',
      href: picks[2] ? `/deals/${picks[2].id}` : '/my-coupons',
      entity_id: picks[2]?.id ?? null,
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      type: 'redeemed',
      title: 'Coupon redeemed',
      body: 'You redeemed your yoga class card. $25 saved.',
      href: '/my-coupons#redeemed',
      entity_id: picks[1]?.id ?? null,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      type: 'new_merchant',
      title: 'A new merchant joined Snagr',
      body: 'Slice Time just listed a $15 pizza combo deal.',
      href: '/merchants',
      entity_id: null,
      created_at: new Date(Date.now() - 36 * 60 * 60 * 1000),
    },
  ]

  let notificationsCreated = 0
  for (const n of notifications) {
    await create('notifications', {
      user_id: userId,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      entity_id: n.entity_id,
      unread: true,
      read_at: null,
      created_at: n.created_at,
    })
    notificationsCreated++
  }

  return { redemptionsCreated, notificationsCreated }
}
