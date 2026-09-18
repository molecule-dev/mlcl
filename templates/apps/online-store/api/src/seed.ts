/**
 * Demo product seed.
 *
 * Inserts a small, deterministic catalogue of products + inventory rows on
 * server boot if the products table is empty. Called from server.ts after
 * migrations + bond setup.
 *
 * Without this, every fresh scaffold renders an empty storefront — there
 * are no products to browse, add to cart, or check out with. Stripe
 * integration is real, OAuth is real, but the catalogue has to come from
 * somewhere.
 *
 * Prices are stored in cents (integer minor units) per the schema's
 * `numeric(20,4)` — Postgres rounds them to whole cents.
 */
import { count, create } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'
import { bulkIndex, deleteIndex, hasProvider as hasSearchProvider } from '@molecule/api-search'

interface SeedProduct {
  name: string
  description: string
  /** Cents (integer). */
  price: number
  category: string
  sku: string
  featured: boolean
  /** Stock quantity to seed in `inventory.available`. */
  stock: number
  thumbnails: string[]
}

const SEED_PRODUCTS: SeedProduct[] = [
  {
    name: 'Sony WH-1000XM5 Headphones',
    description:
      'Industry-leading noise cancelling wireless over-ear headphones with 30-hour battery life and crystal-clear hands-free calling.',
    price: 34800,
    category: 'Electronics',
    sku: 'BAZ-ELEC-001',
    featured: true,
    stock: 24,
    thumbnails: ['https://picsum.photos/seed/bazaar-sony-xm5/400/400'],
  },
  {
    name: 'Organic Cotton Crew Neck Tee',
    description:
      'Soft, breathable 100% organic cotton tee in a relaxed crew-neck cut. Pre-washed for zero shrinkage.',
    price: 3200,
    category: 'Fashion',
    sku: 'BAZ-FASH-001',
    featured: true,
    stock: 120,
    thumbnails: ['https://picsum.photos/seed/bazaar-tee/400/400'],
  },
  {
    name: 'Ceramic Pour-Over Coffee Set',
    description:
      'Hand-thrown ceramic dripper, server, and two cups. Slow extraction for a cleaner cup of coffee.',
    price: 6400,
    category: 'Home & Living',
    sku: 'BAZ-HOME-001',
    featured: true,
    stock: 40,
    thumbnails: ['https://picsum.photos/seed/bazaar-pourover/400/400'],
  },
  {
    name: 'Trail Runner Pro Shoes',
    description:
      'All-terrain trail running shoes with vibram outsole, rock plate, and breathable mesh upper.',
    price: 12900,
    category: 'Sports',
    sku: 'BAZ-SPRT-001',
    featured: true,
    stock: 60,
    thumbnails: ['https://picsum.photos/seed/bazaar-trail/400/400'],
  },
  {
    name: 'Minimalist Leather Wallet',
    description: 'Slim bifold wallet hand-cut from full-grain Italian leather. RFID-blocking.',
    price: 5800,
    category: 'Fashion',
    sku: 'BAZ-FASH-002',
    featured: false,
    stock: 80,
    thumbnails: ['https://picsum.photos/seed/bazaar-wallet/400/400'],
  },
  {
    name: 'Bluetooth Portable Speaker',
    description: 'IP67 waterproof Bluetooth 5.3 speaker with 24-hour battery and 360° audio.',
    price: 8900,
    category: 'Electronics',
    sku: 'BAZ-ELEC-002',
    featured: false,
    stock: 45,
    thumbnails: ['https://picsum.photos/seed/bazaar-speaker/400/400'],
  },
  {
    name: 'Linen Blend Throw Pillow',
    description: 'Hand-loomed linen-cotton blend throw pillow in muted earth tones. Set of 2.',
    price: 3400,
    category: 'Home & Living',
    sku: 'BAZ-HOME-002',
    featured: false,
    stock: 90,
    thumbnails: ['https://picsum.photos/seed/bazaar-pillow/400/400'],
  },
  {
    name: 'Stainless Steel Water Bottle',
    description: '24oz vacuum-insulated water bottle. Keeps cold 24h, hot 12h. BPA-free.',
    price: 2800,
    category: 'Sports',
    sku: 'BAZ-SPRT-002',
    featured: false,
    stock: 200,
    thumbnails: ['https://picsum.photos/seed/bazaar-bottle/400/400'],
  },
  {
    name: 'Wireless Charging Pad',
    description: '15W Qi-certified fast wireless charger compatible with iPhone and Android.',
    price: 4200,
    category: 'Electronics',
    sku: 'BAZ-ELEC-003',
    featured: false,
    stock: 75,
    thumbnails: ['https://picsum.photos/seed/bazaar-charger/400/400'],
  },
  {
    name: 'Cashmere Beanie',
    description: 'Pure mongolian cashmere ribbed beanie. One size, four colours.',
    price: 6900,
    category: 'Fashion',
    sku: 'BAZ-FASH-003',
    featured: false,
    stock: 50,
    thumbnails: ['https://picsum.photos/seed/bazaar-beanie/400/400'],
  },
  {
    name: 'Yoga Mat Premium',
    description: '6mm extra-thick eco-friendly TPE yoga mat with carrying strap. Non-slip.',
    price: 5400,
    category: 'Sports',
    sku: 'BAZ-SPRT-003',
    featured: false,
    stock: 100,
    thumbnails: ['https://picsum.photos/seed/bazaar-mat/400/400'],
  },
  {
    name: 'Scented Soy Candle',
    description: 'Hand-poured 100% soy wax candle. 60-hour burn time. Bergamot & sandalwood.',
    price: 2900,
    category: 'Home & Living',
    sku: 'BAZ-HOME-003',
    featured: false,
    stock: 150,
    thumbnails: ['https://picsum.photos/seed/bazaar-candle/400/400'],
  },
]

/**
 * Idempotently seed the demo catalogue. Safe to call on every boot —
 * we early-return if any product rows exist.
 */
export async function seedProductsIfEmpty(): Promise<void> {
  try {
    const total = await count('products', [])
    if (total > 0) return

    const indexed: Array<{ id: string; document: Record<string, unknown> }> = []

    for (const p of SEED_PRODUCTS) {
      const productResult = await create<{ id: string }>('products', {
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.category,
        sku: p.sku,
        variants: JSON.stringify([]),
        tags: JSON.stringify([]),
        images: JSON.stringify(p.thumbnails),
        thumbnails: JSON.stringify(p.thumbnails),
        status: 'active',
        featured: p.featured,
        total_sold: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const productId = productResult.data?.id
      if (!productId) continue

      await create('inventory', {
        product_id: productId,
        available: p.stock,
        reserved: 0,
        reason: 'seed',
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })

      indexed.push({
        id: productId,
        document: {
          id: productId,
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category,
          sku: p.sku,
          status: 'active',
          featured: p.featured,
          thumbnails: p.thumbnails,
        },
      })
    }

    // Mirror the catalogue into the search index so /api/storefront/search
    // can return real hits for queries (e.g. "Sony" matches the seeded XM5
    // headphones). Best-effort: a missing / unreachable provider should not
    // fail the boot — the storefront list endpoints still work without
    // search.
    //
    // Drop any pre-existing index first. The search backend (Meilisearch,
    // Elasticsearch, etc.) persists outside Postgres, so on a fresh DB
    // re-seed the previous run's documents linger with stale UUIDs that no
    // longer resolve to real product rows. Without this, `/storefront/search`
    // returns duplicates (one ghost per old seed run) which the frontend
    // renders as "$NaN" cards (the hit shape lacks the price the page
    // expects).
    if (indexed.length > 0 && hasSearchProvider()) {
      try {
        try {
          await deleteIndex('products')
        } catch (_error) {
          // Index may not exist on first boot — deletion is best-effort before re-indexing
        }
        await bulkIndex('products', indexed)
        logger.info(`Indexed ${indexed.length} demo products in search`)
      } catch (error) {
        logger.warn({ error }, 'Failed to index demo products in search (non-fatal)')
      }
    }

    logger.info(`Seeded ${SEED_PRODUCTS.length} demo products`)
  } catch (error) {
    logger.error({ error }, 'Failed to seed demo products')
  }
}
