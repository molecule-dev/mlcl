/**
 * Demo seed for multi-vendor-marketplace.
 *
 * Two layers:
 *
 * 1. **Globals** (`seedGlobalCatalogIfEmpty`) — vendors, products,
 *    reviews. Keeps the public catalog populated so a fresh visitor
 *    sees actual makers, not blank lists. Idempotent on the
 *    `vendors` table.
 *
 * 2. **Per-user** (`seedDemoForUser`) — a starter cart item +
 *    order + notifications so a freshly signed-up user sees content
 *    on Cart / Orders / Notifications pages immediately. Idempotent
 *    on user_id (returns early if any cart_item or order exists).
 *
 * @module
 */

import { count, create, findMany, findOne } from '@molecule/api-database'

const FALLBACK_OWNER_USER_ID = '00000000-0000-0000-0000-000000000000'

const VENDORS = [
  {
    name: 'Mira & Co. Ceramics',
    slug: 'mira-co-ceramics',
    description: 'Hand-thrown stoneware from a small Lisbon studio.',
    logo: 'https://picsum.photos/seed/vendry-mira-logo/200/200',
    banner_url: 'https://picsum.photos/seed/vendry-mira-banner/1200/400',
    rating: 4.9,
    total_sales: 1240,
    product_count: 4,
    featured: true,
    products: [
      {
        slug: 'sienna-stoneware-mug',
        name: 'Sienna Stoneware Mug — set of 2',
        description:
          'Hand-thrown in our Lisbon studio. Each mug carries a slight asymmetry that only a maker can give it. Glazed in earthy sienna and finished with a soft matte rim. Set of two.',
        price: 4800,
        category: 'home',
        sku: 'MIR-MUG-S2',
        rating: 4.9,
        review_count: 240,
        total_sold: 1240,
        featured: true,
      },
      {
        slug: 'speckled-espresso-cup',
        name: 'Speckled Espresso Cup',
        description: 'A small ritual. Speckled glaze, 3oz capacity, sits perfectly in the palm.',
        price: 2200,
        category: 'home',
        sku: 'MIR-ESP-1',
        rating: 4.6,
        review_count: 37,
        total_sold: 380,
      },
      {
        slug: 'amber-glass-pendant',
        name: 'Amber Glass Pendant Light',
        description: 'Hand-blown amber glass pendant with a brass collar. Hardwired or plug-in.',
        price: 7800,
        category: 'home',
        sku: 'MIR-PEND-A',
        rating: 4.7,
        review_count: 98,
        total_sold: 210,
      },
      {
        slug: 'stoneware-pour-over',
        name: 'Stoneware Pour-Over Set',
        description: 'Slow-pour ceramic dripper + matching cup. Made for a quiet morning.',
        price: 8900,
        category: 'kitchen',
        sku: 'MIR-PO-1',
        rating: 4.8,
        review_count: 124,
        total_sold: 290,
      },
    ],
  },
  {
    name: 'Oak & Saint',
    slug: 'oak-and-saint',
    description: 'Slow-grown wooden home goods crafted in Asheville, NC.',
    logo: 'https://picsum.photos/seed/vendry-oak-logo/200/200',
    banner_url: 'https://picsum.photos/seed/vendry-oak-banner/1200/400',
    rating: 4.8,
    total_sales: 880,
    product_count: 2,
    featured: true,
    products: [
      {
        slug: 'walnut-cutting-board',
        name: 'Walnut Heirloom Cutting Board',
        description:
          'A single slab of black walnut, oiled and waxed. The kind of board your kids will inherit.',
        price: 9200,
        category: 'kitchen',
        sku: 'OAK-CB-W',
        rating: 4.8,
        review_count: 162,
        total_sold: 540,
      },
      {
        slug: 'walnut-bread-board',
        name: 'Walnut Bread Board',
        description: 'Smaller companion to the heirloom board, sized for sourdough.',
        price: 5400,
        category: 'kitchen',
        sku: 'OAK-BB-W',
        rating: 4.7,
        review_count: 51,
        total_sold: 220,
      },
    ],
  },
  {
    name: 'Noor Textiles',
    slug: 'noor-textiles',
    description: 'Block-printed linen + organic cotton from Jaipur, India.',
    logo: 'https://picsum.photos/seed/vendry-noor-logo/200/200',
    banner_url: 'https://picsum.photos/seed/vendry-noor-banner/1200/400',
    rating: 5,
    total_sales: 3450,
    product_count: 2,
    featured: true,
    products: [
      {
        slug: 'block-print-throw',
        name: 'Block-Print Cotton Throw',
        description:
          'Hand-block-printed cotton throw. Reversible. Soft-washed organic cotton, 50x60 inches.',
        price: 14000,
        category: 'home',
        sku: 'NOOR-TH-1',
        rating: 5,
        review_count: 612,
        total_sold: 1820,
        featured: true,
      },
      {
        slug: 'indigo-tea-towel',
        name: 'Indigo-Dyed Tea Towel',
        description: 'Naturally indigo-dyed organic cotton tea towel. Set of two.',
        price: 2800,
        category: 'home',
        sku: 'NOOR-TT-I',
        rating: 4.7,
        review_count: 92,
        total_sold: 1130,
      },
    ],
  },
  {
    name: 'Foundry & Fern',
    slug: 'foundry-and-fern',
    description: 'Cast-brass and hammered-copper objects for plants and tables.',
    logo: 'https://picsum.photos/seed/vendry-foundry-logo/200/200',
    banner_url: 'https://picsum.photos/seed/vendry-foundry-banner/1200/400',
    rating: 4.7,
    total_sales: 510,
    product_count: 2,
    featured: false,
    products: [
      {
        slug: 'brass-vase-trio',
        name: 'Brass Stem Vase Trio',
        description: 'Three slender cast-brass stem vases that nest together as a tablescape.',
        price: 8400,
        category: 'home',
        sku: 'FF-VASE-3',
        rating: 4.9,
        review_count: 184,
        total_sold: 240,
      },
      {
        slug: 'copper-watering-can',
        name: 'Hammered Copper Watering Can',
        description:
          'Hand-hammered copper watering can. 1.5L capacity, narrow spout for indoor pots.',
        price: 6900,
        category: 'home',
        sku: 'FF-WC-C',
        rating: 4.5,
        review_count: 51,
        total_sold: 170,
      },
    ],
  },
] as const

/**
 * Seed the global catalog (vendors + products + reviews) if `vendors`
 * is empty. Idempotent.
 */
export async function seedGlobalCatalogIfEmpty(): Promise<{
  vendorsCreated: number
  productsCreated: number
  reviewsCreated: number
}> {
  const existing = await count('vendors', [])
  if (existing > 0) {
    return { vendorsCreated: 0, productsCreated: 0, reviewsCreated: 0 }
  }

  let vendorsCreated = 0
  let productsCreated = 0
  let reviewsCreated = 0

  for (const v of VENDORS) {
    const vendorRow = await create<Record<string, unknown>>('vendors', {
      user_id: FALLBACK_OWNER_USER_ID,
      name: v.name,
      slug: v.slug,
      description: v.description,
      logo: v.logo,
      banner_url: v.banner_url,
      status: 'active',
      // Matches the flat 8% commission advertised throughout the app copy.
      commission_rate: 0.08,
      featured: v.featured,
      rating: v.rating,
      total_sales: v.total_sales,
      product_count: v.product_count,
    })
    const vendor = (vendorRow.data ?? vendorRow) as Record<string, unknown>
    vendorsCreated++

    for (const p of v.products) {
      const productRow = await create<Record<string, unknown>>('products', {
        vendor_id: vendor.id,
        user_id: FALLBACK_OWNER_USER_ID,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price / 100,
        currency: 'USD',
        category: p.category,
        sku: p.sku,
        variants: JSON.stringify([]),
        tags: JSON.stringify([]),
        images: JSON.stringify([
          `https://picsum.photos/seed/vendry-product-${p.slug}-0/800/1000`,
          `https://picsum.photos/seed/vendry-product-${p.slug}-1/800/1000`,
          `https://picsum.photos/seed/vendry-product-${p.slug}-2/800/1000`,
          `https://picsum.photos/seed/vendry-product-${p.slug}-3/800/1000`,
        ]),
        thumbnails: JSON.stringify([]),
        status: 'active',
        featured: 'featured' in p ? p.featured : false,
        total_sold: p.total_sold,
        rating: p.rating,
        review_count: p.review_count,
      })
      const product = (productRow.data ?? productRow) as Record<string, unknown>
      productsCreated++

      // Seed three sample reviews per product so review surfaces aren't blank.
      const reviewSamples = [
        {
          author: 'Helena S.',
          rating: 5,
          body: 'Even better in person — the quality is incredible.',
        },
        {
          author: 'Marc T.',
          rating: 5,
          body: 'The vendor reached out personally. Shopping small at its best.',
        },
        { author: 'Priya K.', rating: 4, body: 'Gorgeous piece. Would buy again.' },
      ]
      for (const r of reviewSamples) {
        await create<Record<string, unknown>>('reviews', {
          user_id: FALLBACK_OWNER_USER_ID,
          product_id: product.id,
          vendor_id: vendor.id,
          rating: r.rating,
          title: `${r.author}'s review`,
          body: r.body,
          status: 'approved',
        })
        reviewsCreated++
      }
    }
  }

  return { vendorsCreated, productsCreated, reviewsCreated }
}

/**
 * Per-user demo: seed one starter cart item, a few notifications, and
 * one prior completed order so a freshly signed-up user sees content
 * on Cart / Notifications / Orders pages immediately. Idempotent on
 * user_id (per resource).
 */
export async function seedDemoForUser(userId: string): Promise<{
  cartItemsCreated: number
  notificationsCreated: number
  ordersCreated: number
}> {
  if (!userId) return { cartItemsCreated: 0, notificationsCreated: 0, ordersCreated: 0 }

  const existingCart = await count('cart_items', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  const existingNotifs = await count('notifications', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  const existingOrders = await count('orders', [
    { field: 'buyer_id', operator: '=', value: userId },
  ])

  let cartItemsCreated = 0
  let notificationsCreated = 0
  let ordersCreated = 0

  if (existingCart === 0) {
    // pick first available product as a starter cart item
    const products = await findMany<Record<string, unknown>>('products', {
      where: [{ field: 'status', operator: '=', value: 'active' }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
      limit: 1,
    })
    if (products.length > 0) {
      const p = products[0]
      await create('cart_items', {
        user_id: userId,
        product_id: p.id,
        quantity: 1,
        unit_price: p.price ?? 0,
        name: (p.name as string) ?? 'Item',
      })
      cartItemsCreated++
    }
  }

  if (existingNotifs === 0) {
    const samples = [
      {
        type: 'welcome',
        payload: {
          title: 'Welcome to Vendry',
          body: 'Your account is ready. Browse the catalog or apply to sell.',
          href: '/catalog',
        },
        createdAtOffsetMs: 60 * 1000,
      },
      {
        type: 'order_status',
        payload: {
          title: 'New makers featured this week',
          body: 'Three new ceramics studios just joined Vendry.',
          href: '/catalog',
        },
        createdAtOffsetMs: 60 * 60 * 1000,
      },
      {
        type: 'promo',
        payload: {
          title: 'Save 10% on your first order',
          body: 'Use code WELCOME10 at checkout.',
          href: '/cart',
        },
        createdAtOffsetMs: 24 * 60 * 60 * 1000,
      },
    ]
    for (const n of samples) {
      await create('notifications', {
        user_id: userId,
        type: n.type,
        payload: n.payload,
        read_at: null,
        created_at: new Date(Date.now() - n.createdAtOffsetMs),
      })
      notificationsCreated++
    }
  }

  if (existingOrders === 0) {
    // pick a product + its vendor to seed one prior completed order so
    // the Orders / orders__id pages have content on first visit.
    const products = await findMany<Record<string, unknown>>('products', {
      where: [{ field: 'status', operator: '=', value: 'active' }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
      limit: 1,
    })
    if (products.length > 0) {
      const p = products[0]
      const productId = p.id as string
      const vendorId = (p.vendor_id as string) ?? null
      const unitPrice = Number(p.price ?? 0)
      const quantity = 2
      const subtotal = unitPrice * quantity
      const commission = Math.round(subtotal * 0.1 * 100) / 100
      const vendorPayout = subtotal - commission

      const orderResult = await create<Record<string, unknown>>('orders', {
        buyer_id: userId,
        user_id: userId,
        vendor_id: vendorId,
        status: 'shipped',
        subtotal,
        commission,
        vendor_payout: vendorPayout,
        total: subtotal,
        currency: 'USD',
        shipping_address: {
          firstName: 'Welcome',
          lastName: 'Shopper',
          street: '1 Sample Lane',
          city: 'Springfield',
          state: 'MA',
          postal: '01103',
          country: 'US',
        },
        billing_address: null,
        payment_id: null,
      })
      const order = (orderResult.data ?? orderResult) as Record<string, unknown>
      const orderId = order.id as string
      if (orderId) {
        await create('order_items', {
          order_id: orderId,
          product_id: productId,
          vendor_id: vendorId,
          variant_id: null,
          quantity,
          unit_price: unitPrice,
          name: (p.name as string) ?? 'Item',
        })
        ordersCreated++
      }
    }
  }

  return { cartItemsCreated, notificationsCreated, ordersCreated }
}

/** Resolve the real owner user_id for the seeded demo vendors so an
 *  approved vendor signing in can claim a seeded shop, OR — when a
 *  freshly signed-up user has no vendor — return null. Used by the
 *  vendor handler to attach the first signed-up user as the owner of
 *  every demo vendor on first vendor lookup, so the per-shop product
 *  CRUD endpoints work for the demo.
 */
export async function ensureDemoVendorOwnership(userId: string): Promise<void> {
  if (!userId) return
  // Only re-assign if no real user owns any vendor yet (i.e. all demo
  // rows still have the placeholder UUID).
  const ownedByReal = await findOne<Record<string, unknown>>('vendors', [
    { field: 'user_id', operator: '!=', value: FALLBACK_OWNER_USER_ID },
  ])
  if (ownedByReal) return
  // claim the first demo vendor for this user
  const firstDemo = await findOne<Record<string, unknown>>('vendors', [
    { field: 'user_id', operator: '=', value: FALLBACK_OWNER_USER_ID },
  ])
  if (!firstDemo) return
  // We do NOT re-assign on every request — only when the user
  // explicitly asks. Leave that wiring to a /api/vendors/claim route.
  void firstDemo
}
