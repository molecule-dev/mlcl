/**
 * Seed data for grocery-delivery.
 *
 * Globals (`seedGlobalCatalogIfEmpty`) — products + a rolling 7-day window
 * of delivery slots. Keeps the public catalog populated so the Shop page
 * and Cart slot picker have real rows to render on a fresh boot; without
 * this, e2e tests fail because no product card is ever rendered.
 *
 * Idempotent on each target table (`products`, `delivery_slots`). Safe to
 * call on every boot — guarded by a row count + a process-local flag.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import { count, create } from '@molecule/api-database'

interface SeedProduct {
  name: string
  brand: string
  category: string
  /** Display size string ("4 ct", "1 gal", "26 oz"). */
  unit_size: string
  unit: string
  /** Cents (integer). */
  price: number
  /** Cents per unit_label, optional for unit pricing rows. */
  unit_price_cents?: number
  unit_label?: string
  organic: boolean
  description: string
  image_url: string
  rating: number
  review_count: number
  in_stock: boolean
  badges: Array<'organic' | 'sale' | 'new' | 'local'>
}

const SEED_PRODUCTS: SeedProduct[] = [
  {
    name: 'Organic Hass Avocados',
    brand: 'Earthbound',
    category: 'produce',
    unit_size: '4 ct',
    unit: 'each',
    price: 599,
    unit_price_cents: 150,
    unit_label: 'ea',
    organic: true,
    description: 'Hand-picked organic Hass avocados, ripe in 1-2 days.',
    image_url: 'https://picsum.photos/seed/p1/360/360',
    rating: 4.6,
    review_count: 214,
    in_stock: true,
    badges: ['organic', 'local'],
  },
  {
    name: 'Whole Milk',
    brand: 'Clover',
    category: 'dairy',
    unit_size: '1 gal',
    unit: 'each',
    price: 549,
    unit_price_cents: 43,
    unit_label: 'qt',
    organic: false,
    description: 'Local whole milk, pasteurized.',
    image_url: 'https://picsum.photos/seed/p2/360/360',
    rating: 4.7,
    review_count: 502,
    in_stock: true,
    badges: ['local'],
  },
  {
    name: 'Sourdough Boule',
    brand: 'Acme Bread',
    category: 'bakery',
    unit_size: '26 oz',
    unit: 'each',
    price: 649,
    organic: false,
    description: 'Naturally leavened sourdough, baked daily.',
    image_url: 'https://picsum.photos/seed/p3/360/360',
    rating: 4.8,
    review_count: 178,
    in_stock: true,
    badges: ['new'],
  },
  {
    name: 'Atlantic Salmon Fillet',
    brand: 'Marina',
    category: 'meat',
    unit_size: '1 lb',
    unit: 'lb',
    price: 1299,
    unit_price_cents: 1299,
    unit_label: 'lb',
    organic: false,
    description: 'Wild-caught Atlantic salmon fillet.',
    image_url: 'https://picsum.photos/seed/p4/360/360',
    rating: 4.5,
    review_count: 98,
    in_stock: true,
    badges: [],
  },
  {
    name: 'Organic Quinoa',
    brand: "Bob's Pantry",
    category: 'pantry',
    unit_size: '16 oz',
    unit: 'each',
    price: 599,
    organic: true,
    description: 'Tri-color organic quinoa.',
    image_url: 'https://picsum.photos/seed/p5/360/360',
    rating: 4.6,
    review_count: 321,
    in_stock: true,
    badges: ['organic'],
  },
  {
    name: 'Frozen Wild Berries',
    brand: 'Cascadian',
    category: 'frozen',
    unit_size: '10 oz',
    unit: 'each',
    price: 399,
    organic: false,
    description: 'Mixed frozen berries - blueberry, raspberry, blackberry.',
    image_url: 'https://picsum.photos/seed/p6/360/360',
    rating: 4.4,
    review_count: 142,
    in_stock: true,
    badges: ['sale'],
  },
  {
    name: 'Sparkling Water (12 ct)',
    brand: 'La Croix',
    category: 'beverages',
    unit_size: '12 x 12 oz',
    unit: 'each',
    price: 599,
    unit_price_cents: 50,
    unit_label: 'can',
    organic: false,
    description: 'Naturally flavored sparkling water variety pack.',
    image_url: 'https://picsum.photos/seed/p7/360/360',
    rating: 4.7,
    review_count: 1102,
    in_stock: true,
    badges: [],
  },
  {
    name: 'Plant-Based Dish Soap',
    brand: 'Method',
    category: 'household',
    unit_size: '18 oz',
    unit: 'each',
    price: 399,
    organic: true,
    description: 'Naturally derived dish soap.',
    image_url: 'https://picsum.photos/seed/p8/360/360',
    rating: 4.5,
    review_count: 408,
    in_stock: true,
    badges: ['organic'],
  },
  {
    name: 'Fresh Strawberries',
    brand: "Driscoll's",
    category: 'produce',
    unit_size: '1 lb',
    unit: 'lb',
    price: 499,
    unit_price_cents: 499,
    unit_label: 'lb',
    organic: false,
    description: 'Locally-grown fresh strawberries.',
    image_url: 'https://picsum.photos/seed/p9/360/360',
    rating: 4.7,
    review_count: 611,
    in_stock: true,
    badges: ['sale', 'local'],
  },
  {
    name: 'Greek Yogurt, Plain',
    brand: 'Fage',
    category: 'dairy',
    unit_size: '32 oz',
    unit: 'each',
    price: 599,
    organic: false,
    description: 'Total 5% Greek yogurt.',
    image_url: 'https://picsum.photos/seed/p10/360/360',
    rating: 4.8,
    review_count: 733,
    in_stock: true,
    badges: [],
  },
  {
    name: 'Free-Range Eggs',
    brand: 'Vital Farms',
    category: 'dairy',
    unit_size: '12 ct',
    unit: 'each',
    price: 699,
    organic: true,
    description: 'Pasture-raised eggs from a small farm.',
    image_url: 'https://picsum.photos/seed/p11/360/360',
    rating: 4.6,
    review_count: 402,
    in_stock: true,
    badges: ['organic', 'local'],
  },
  {
    name: 'Multigrain Bread Loaf',
    brand: "Dave's",
    category: 'bakery',
    unit_size: '27 oz',
    unit: 'each',
    price: 549,
    organic: false,
    description: 'Hearty multigrain bread.',
    image_url: 'https://picsum.photos/seed/p12/360/360',
    rating: 4.7,
    review_count: 590,
    in_stock: true,
    badges: [],
  },
  {
    name: 'Boneless Chicken Breast',
    brand: "Mary's",
    category: 'meat',
    unit_size: '1.25 lb',
    unit: 'lb',
    price: 899,
    unit_price_cents: 719,
    unit_label: 'lb',
    organic: false,
    description: 'Air-chilled organic chicken breast.',
    image_url: 'https://picsum.photos/seed/p13/360/360',
    rating: 4.4,
    review_count: 187,
    in_stock: true,
    badges: [],
  },
  {
    name: 'Extra Virgin Olive Oil',
    brand: 'California',
    category: 'pantry',
    unit_size: '500 ml',
    unit: 'each',
    price: 1499,
    unit_price_cents: 300,
    unit_label: '100ml',
    organic: false,
    description: 'Cold-pressed California olive oil.',
    image_url: 'https://picsum.photos/seed/p14/360/360',
    rating: 4.6,
    review_count: 256,
    in_stock: true,
    badges: ['new'],
  },
  {
    name: 'Frozen Pizza, Margherita',
    brand: "Amy's",
    category: 'frozen',
    unit_size: '13 oz',
    unit: 'each',
    price: 599,
    organic: false,
    description: 'Stone-fired margherita pizza.',
    image_url: 'https://picsum.photos/seed/p15/360/360',
    rating: 4.3,
    review_count: 311,
    in_stock: true,
    badges: [],
  },
  {
    name: 'Cold Brew Coffee',
    brand: 'Stumptown',
    category: 'beverages',
    unit_size: '32 oz',
    unit: 'each',
    price: 799,
    organic: false,
    description: 'Slow-steeped cold brew coffee concentrate.',
    image_url: 'https://picsum.photos/seed/p16/360/360',
    rating: 4.5,
    review_count: 179,
    in_stock: true,
    badges: [],
  },
  {
    name: 'Paper Towels, 6 Rolls',
    brand: 'Bounty',
    category: 'household',
    unit_size: '6 ct',
    unit: 'each',
    price: 899,
    organic: false,
    description: '2-ply paper towels, 6 mega rolls.',
    image_url: 'https://picsum.photos/seed/p17/360/360',
    rating: 4.6,
    review_count: 802,
    in_stock: true,
    badges: [],
  },
  {
    name: 'Bananas',
    brand: 'Chiquita',
    category: 'produce',
    unit_size: '2 lb',
    unit: 'lb',
    price: 199,
    unit_price_cents: 99,
    unit_label: 'lb',
    organic: false,
    description: 'Fresh ripening bananas.',
    image_url: 'https://picsum.photos/seed/p18/360/360',
    rating: 4.4,
    review_count: 340,
    in_stock: true,
    badges: [],
  },
  {
    name: 'Almond Butter',
    brand: 'Kirkland',
    category: 'pantry',
    unit_size: '27 oz',
    unit: 'each',
    price: 999,
    organic: false,
    description: 'Creamy almond butter, no added sugar.',
    image_url: 'https://picsum.photos/seed/p19/360/360',
    rating: 4.5,
    review_count: 211,
    in_stock: false,
    badges: ['sale'],
  },
  {
    name: 'Frozen Strawberry Bars',
    brand: 'Outshine',
    category: 'frozen',
    unit_size: '12 ct',
    unit: 'each',
    price: 499,
    organic: false,
    description: 'Real fruit popsicles, no added preservatives.',
    image_url: 'https://picsum.photos/seed/p20/360/360',
    rating: 4.6,
    review_count: 421,
    in_stock: true,
    badges: ['new'],
  },
]

let _globalSeeded = false

/**
 * Seed the global product catalog + a rolling 7-day window of delivery
 * slots if the relevant tables are empty. Idempotent.
 *
 * Without this, fresh boots render an empty Shop page and a Cart with no
 * slot to choose at checkout — the entire shopping flow is unreachable.
 */
export async function seedGlobalCatalogIfEmpty(): Promise<{
  productsCreated: number
  slotsCreated: number
}> {
  if (_globalSeeded) return { productsCreated: 0, slotsCreated: 0 }

  let productsCreated = 0
  let slotsCreated = 0

  try {
    const existingProducts = await count('products', [])
    if (existingProducts === 0) {
      for (const p of SEED_PRODUCTS) {
        // Encode unit_price/label/rating/etc into the `attributes` jsonb so
        // the schema doesn't need new columns and the products handler can
        // surface them.
        const attributes: Record<string, unknown> = {
          unit_price_cents: p.unit_price_cents ?? null,
          unit_label: p.unit_label ?? null,
          rating: p.rating,
          review_count: p.review_count,
          in_stock: p.in_stock,
        }
        await create('products', {
          name: p.name,
          brand: p.brand,
          category: p.category,
          department: p.category,
          unit_size: p.unit_size,
          unit: p.unit,
          price: p.price,
          currency: 'USD',
          organic: p.organic,
          description: p.description,
          image_url: p.image_url,
          attributes: JSON.stringify(attributes),
          tags: JSON.stringify(p.badges),
          status: 'active',
        })
        productsCreated++
      }
    }
  } catch (err) {
    getLogger().warn?.(`[grocery-delivery seed] products failed: ${(err as Error).message}`)
  }

  try {
    const existingSlots = await count('delivery_slots', [])
    if (existingSlots === 0) {
      const windows: Array<[number, number]> = [
        [9, 11],
        [13, 15],
        [17, 19],
        [19, 21],
      ]
      const now = new Date()
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const day = new Date(now)
        day.setUTCDate(day.getUTCDate() + dayOffset)
        const dateStr = day.toISOString().split('T')[0]
        for (const [startHour, endHour] of windows) {
          const start = new Date(day)
          start.setUTCHours(startHour, 0, 0, 0)
          const end = new Date(day)
          end.setUTCHours(endHour, 0, 0, 0)
          await create('delivery_slots', {
            date: dateStr,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            capacity: 25,
            remaining_capacity: 25,
            region: null,
            fee_override: null,
            status: 'active',
          })
          slotsCreated++
        }
      }
    }
  } catch (err) {
    getLogger().warn?.(`[grocery-delivery seed] slots failed: ${(err as Error).message}`)
  }

  _globalSeeded = true
  return { productsCreated, slotsCreated }
}
