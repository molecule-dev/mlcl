/**
 * Seed data for food-delivery.
 *
 * Two layers:
 *
 * 1. **Globals** (`seedGlobalCatalogIfEmpty`) — restaurants, menu_items.
 *    Keeps the public catalog populated so a fresh visitor sees actual
 *    restaurants and menus, not empty lists. Idempotent on the
 *    `restaurants` table.
 *
 * 2. **Per-user** (`seedDemoForUser`) — a default address and a couple
 *    of welcome notifications, so a freshly signed-up user sees content
 *    on Notifications/Settings pages immediately. Idempotent on user_id.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import { count, create, findMany } from '@molecule/api-database'
import { index } from '@molecule/api-search'

const PLACEHOLDER_OWNER_ID = '00000000-0000-0000-0000-000000000000'

interface MenuItemSeed {
  name: string
  description: string
  /** Price in cents. */
  price: number
  category: string
  dietary_tags?: string[]
  preparation_time?: number
  sort_order?: number
}

interface RestaurantSeed {
  name: string
  description: string
  cuisine: string
  address: string
  phone: string
  latitude: number
  longitude: number
  /** Minimum order in cents. */
  minimum_order: number
  estimated_delivery_min: number
  rating: number
  review_count: number
  image_seed: string
  /**
   * Per-restaurant hours, overriding the shared storefront window.
   *
   * Every seeded restaurant used to share 10:00-22:00, which made the whole
   * ordering flow — and its e2e coverage — unusable outside those hours: the
   * order endpoint correctly 400s a closed restaurant, so the suite passed by
   * day and failed at 4am. A 24-hour spot is both realistic demo data and the
   * fixed point the tests can rely on.
   */
  opening_hours?: Record<string, string>
  menu: MenuItemSeed[]
}

const RESTAURANTS: RestaurantSeed[] = [
  {
    name: 'Sakura Sushi',
    description: 'Traditional sushi handcrafted with daily-fresh fish from the local market.',
    cuisine: 'sushi',
    address: '215 Elm St, Springfield',
    phone: '+1 (555) 100-2001',
    latitude: 37.7749,
    longitude: -122.4194,
    minimum_order: 1500,
    estimated_delivery_min: 28,
    rating: 4.7,
    review_count: 312,
    image_seed: 'food-sakura-sushi',
    menu: [
      {
        name: 'Spicy Tuna Roll',
        description: '8 pieces, spicy mayo, scallion, sesame.',
        price: 1499,
        category: 'Rolls',
        dietary_tags: ['pescatarian'],
        sort_order: 1,
      },
      {
        name: 'Salmon Sashimi (5pc)',
        description: 'Hand-cut Norwegian salmon over crushed ice.',
        price: 1599,
        category: 'Sashimi',
        dietary_tags: ['gluten-free'],
        sort_order: 2,
      },
      {
        name: 'Edamame',
        description: 'Steamed soybeans, sea salt, lemon zest.',
        price: 599,
        category: 'Starters',
        dietary_tags: ['vegan', 'gluten-free'],
        sort_order: 1,
      },
      {
        name: 'Miso Soup',
        description: 'White miso, silken tofu, scallion, wakame.',
        price: 399,
        category: 'Starters',
        dietary_tags: ['vegetarian'],
        sort_order: 2,
      },
      {
        name: 'Dragon Roll',
        description: 'Eel, avocado, cucumber, eel sauce, sesame.',
        price: 1799,
        category: 'Rolls',
        sort_order: 3,
      },
      {
        name: 'Mochi Trio',
        description: 'Three flavors: strawberry, mango, green tea.',
        price: 699,
        category: 'Desserts',
        dietary_tags: ['vegetarian'],
        sort_order: 1,
      },
    ],
  },
  {
    name: 'Pizzeria Lucca',
    description:
      'Wood-fired Neapolitan pies with imported San Marzano tomatoes and bufala mozzarella.',
    cuisine: 'pizza',
    address: '88 Vine St, Springfield',
    phone: '+1 (555) 100-2002',
    latitude: 37.7755,
    longitude: -122.4189,
    minimum_order: 1200,
    estimated_delivery_min: 35,
    rating: 4.6,
    review_count: 489,
    image_seed: 'food-pizzeria-lucca',
    menu: [
      {
        name: 'Margherita Classica',
        description: 'San Marzano tomato, bufala mozzarella, basil, olive oil.',
        price: 1499,
        category: 'Pizzas',
        dietary_tags: ['vegetarian'],
        sort_order: 1,
      },
      {
        name: 'Quattro Formaggi',
        description: 'Bufala, gorgonzola, parmigiano, fontina, honey drizzle.',
        price: 1799,
        category: 'Pizzas',
        dietary_tags: ['vegetarian'],
        sort_order: 2,
      },
      {
        name: 'Diavola',
        description: 'San Marzano, mozzarella, calabrese salami, chili oil.',
        price: 1699,
        category: 'Pizzas',
        sort_order: 3,
      },
      {
        name: 'Caprese Salad',
        description: 'Heirloom tomato, bufala, basil, aged balsamic.',
        price: 1099,
        category: 'Starters',
        dietary_tags: ['vegetarian', 'gluten-free'],
        sort_order: 1,
      },
      {
        name: 'Tiramisu',
        description: 'Espresso-soaked ladyfingers, mascarpone, cocoa.',
        price: 799,
        category: 'Desserts',
        dietary_tags: ['vegetarian'],
        sort_order: 1,
      },
    ],
  },
  {
    name: 'Burger Forge',
    // The fleet's late-night option — open around the clock.
    opening_hours: {
      mon: '00:00-23:59',
      tue: '00:00-23:59',
      wed: '00:00-23:59',
      thu: '00:00-23:59',
      fri: '00:00-23:59',
      sat: '00:00-23:59',
      sun: '00:00-23:59',
    },
    description: 'Pasture-raised beef, brioche buns, smoke-house bacon. Made the way you remember.',
    cuisine: 'burgers',
    address: '500 Market St, Springfield',
    phone: '+1 (555) 100-2003',
    latitude: 37.779,
    longitude: -122.417,
    minimum_order: 1000,
    estimated_delivery_min: 22,
    rating: 4.5,
    review_count: 271,
    image_seed: 'food-burger-forge',
    menu: [
      {
        name: 'Forge Cheeseburger',
        description: 'Double patty, aged cheddar, secret sauce, brioche.',
        price: 1399,
        category: 'Burgers',
        sort_order: 1,
      },
      {
        name: 'Smokehouse Bacon Burger',
        description: 'Apple-wood bacon, smoked gouda, crispy onions.',
        price: 1599,
        category: 'Burgers',
        sort_order: 2,
      },
      {
        name: 'Garden Burger',
        description: 'House-made black bean patty, avocado, sriracha aioli.',
        price: 1299,
        category: 'Burgers',
        dietary_tags: ['vegetarian'],
        sort_order: 3,
      },
      {
        name: 'Forge Fries',
        description: 'Triple-cooked, malt vinegar, sea salt.',
        price: 599,
        category: 'Sides',
        dietary_tags: ['vegan'],
        sort_order: 1,
      },
      {
        name: 'Salted Caramel Shake',
        description: 'Hand-spun vanilla, salted caramel, sea-salt rim.',
        price: 699,
        category: 'Drinks',
        dietary_tags: ['vegetarian'],
        sort_order: 1,
      },
    ],
  },
  {
    name: 'Spice Route',
    description: 'Slow-cooked Indian curries, fresh tandoor breads, every plate made to order.',
    cuisine: 'asian',
    address: '21 Cedar Ave, Springfield',
    phone: '+1 (555) 100-2004',
    latitude: 37.772,
    longitude: -122.414,
    minimum_order: 1500,
    estimated_delivery_min: 32,
    rating: 4.8,
    review_count: 364,
    image_seed: 'food-spice-route',
    menu: [
      {
        name: 'Butter Chicken',
        description: 'Tandoori chicken, tomato-cream gravy, cardamom rice.',
        price: 1599,
        category: 'Curries',
        sort_order: 1,
      },
      {
        name: 'Chana Masala',
        description: 'Slow-cooked chickpeas, ginger, coriander, basmati.',
        price: 1299,
        category: 'Curries',
        dietary_tags: ['vegan'],
        sort_order: 2,
      },
      {
        name: 'Garlic Naan',
        description: 'Tandoor-baked, garlic, butter, parsley.',
        price: 399,
        category: 'Breads',
        dietary_tags: ['vegetarian'],
        sort_order: 1,
      },
      {
        name: 'Samosa Chaat',
        description: 'Crisp samosa, chickpeas, tamarind, mint chutney.',
        price: 799,
        category: 'Starters',
        dietary_tags: ['vegetarian'],
        sort_order: 1,
      },
      {
        name: 'Mango Lassi',
        description: 'Alphonso mango, yogurt, cardamom.',
        price: 499,
        category: 'Drinks',
        dietary_tags: ['vegetarian'],
        sort_order: 1,
      },
    ],
  },
  {
    name: 'El Mercado',
    description:
      'Mexican street food. Slow-braised meats, hand-pressed tortillas, salsa from scratch.',
    cuisine: 'mexican',
    address: '17 Beachside Blvd, Springfield',
    phone: '+1 (555) 100-2005',
    latitude: 37.781,
    longitude: -122.42,
    minimum_order: 1000,
    estimated_delivery_min: 25,
    rating: 4.6,
    review_count: 198,
    image_seed: 'food-el-mercado',
    menu: [
      {
        name: 'Carnitas Tacos (3)',
        description: 'Slow-braised pork, salsa verde, lime, onion, cilantro.',
        price: 1199,
        category: 'Tacos',
        sort_order: 1,
      },
      {
        name: 'Al Pastor Tacos (3)',
        description: 'Trompo-grilled pork, pineapple, onion, cilantro.',
        price: 1299,
        category: 'Tacos',
        sort_order: 2,
      },
      {
        name: 'Veggie Tacos (3)',
        description: 'Roasted poblano, mushroom, sweet corn, queso fresco.',
        price: 1199,
        category: 'Tacos',
        dietary_tags: ['vegetarian'],
        sort_order: 3,
      },
      {
        name: 'Loaded Nachos',
        description: 'Black beans, jack, pico, jalapeño, sour cream.',
        price: 1099,
        category: 'Sides',
        dietary_tags: ['vegetarian'],
        sort_order: 1,
      },
      {
        name: 'Horchata',
        description: 'Sweet rice-cinnamon agua fresca.',
        price: 449,
        category: 'Drinks',
        dietary_tags: ['vegetarian'],
        sort_order: 1,
      },
    ],
  },
  {
    name: 'Greenleaf Bowls',
    description: 'Grain-based bowls, locally sourced greens, dressings made every morning.',
    cuisine: 'healthy',
    address: '404 Olive Ln, Springfield',
    phone: '+1 (555) 100-2006',
    latitude: 37.77,
    longitude: -122.415,
    minimum_order: 800,
    estimated_delivery_min: 18,
    rating: 4.4,
    review_count: 156,
    image_seed: 'food-greenleaf',
    menu: [
      {
        name: 'Mediterranean Bowl',
        description: 'Quinoa, roasted veg, hummus, feta, lemon-tahini.',
        price: 1399,
        category: 'Bowls',
        dietary_tags: ['vegetarian'],
        sort_order: 1,
      },
      {
        name: 'Salmon Power Bowl',
        description: 'Wild salmon, brown rice, edamame, miso-ginger.',
        price: 1599,
        category: 'Bowls',
        dietary_tags: ['gluten-free'],
        sort_order: 2,
      },
      {
        name: 'Citrus Kale Salad',
        description: 'Massaged kale, orange, almonds, parmesan.',
        price: 1099,
        category: 'Salads',
        dietary_tags: ['vegetarian'],
        sort_order: 1,
      },
      {
        name: 'Cold-Pressed Greens',
        description: 'Spinach, apple, cucumber, ginger, lemon.',
        price: 699,
        category: 'Drinks',
        dietary_tags: ['vegan'],
        sort_order: 1,
      },
    ],
  },
]

let _globalSeeded = false

/**
 * Seed the global restaurant + menu catalog if `restaurants` is empty.
 * Idempotent.
 */
export async function seedGlobalCatalogIfEmpty(): Promise<{
  restaurantsCreated: number
  menuItemsCreated: number
}> {
  if (_globalSeeded) return { restaurantsCreated: 0, menuItemsCreated: 0 }
  const existing = await count('restaurants', [])
  if (existing > 0) {
    _globalSeeded = true
    return { restaurantsCreated: 0, menuItemsCreated: 0 }
  }

  let restaurantsCreated = 0
  let menuItemsCreated = 0

  // jsonb columns must be passed as JSON-serialized strings; the pg driver
  // otherwise encodes JS arrays/objects as Postgres array literals
  // ('{pescatarian}'), which Postgres's jsonb input parser rejects.
  const openingHours = JSON.stringify({
    mon: '10:00-22:00',
    tue: '10:00-22:00',
    wed: '10:00-22:00',
    thu: '10:00-22:00',
    fri: '10:00-23:00',
    sat: '10:00-23:00',
    sun: '11:00-21:00',
  })

  for (const r of RESTAURANTS) {
    const restaurantRow = await create<Record<string, unknown>>('restaurants', {
      owner_id: PLACEHOLDER_OWNER_ID,
      name: r.name,
      description: r.description,
      cuisine: r.cuisine,
      address: r.address,
      phone: r.phone,
      latitude: r.latitude,
      longitude: r.longitude,
      opening_hours: r.opening_hours ? JSON.stringify(r.opening_hours) : openingHours,
      minimum_order: r.minimum_order,
      estimated_delivery_min: r.estimated_delivery_min,
      rating: r.rating,
      review_count: r.review_count,
      status: 'active',
      image_url: `https://picsum.photos/seed/${r.image_seed}/1200/600`,
      thumbnail_url: `https://picsum.photos/seed/${r.image_seed}/600/400`,
    })
    const restaurant = (restaurantRow.data ?? restaurantRow) as Record<string, unknown>
    restaurantsCreated++

    if (restaurant.id) {
      try {
        await index('restaurants', String(restaurant.id), restaurant)
      } catch (indexErr) {
        getLogger().warn?.(`[food-delivery seed] index failed: ${(indexErr as Error).message}`)
      }
    }

    for (const item of r.menu) {
      await create('menu_items', {
        restaurant_id: restaurant.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        dietary_tags: JSON.stringify(item.dietary_tags ?? []),
        preparation_time: item.preparation_time ?? 15,
        sort_order: item.sort_order ?? 0,
        status: 'available',
        image_url: `https://picsum.photos/seed/${r.image_seed}-${item.name.replace(/\s+/g, '-').toLowerCase()}/600/400`,
        thumbnail_url: `https://picsum.photos/seed/${r.image_seed}-${item.name.replace(/\s+/g, '-').toLowerCase()}/300/200`,
      })
      menuItemsCreated++
    }
  }

  _globalSeeded = true
  return { restaurantsCreated, menuItemsCreated }
}

const seededUsers = new Set<string>()

/**
 * Per-user demo: seed a default home address and a few welcome
 * notifications so a freshly signed-up user sees content immediately.
 * Idempotent on user_id.
 */
export async function seedDemoForUser(userId: string): Promise<{
  addressesCreated: number
  notificationsCreated: number
}> {
  if (!userId) return { addressesCreated: 0, notificationsCreated: 0 }
  if (seededUsers.has(userId)) return { addressesCreated: 0, notificationsCreated: 0 }
  seededUsers.add(userId)

  let addressesCreated = 0
  let notificationsCreated = 0

  try {
    const existingAddresses = await findMany<Record<string, unknown>>('addresses', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1,
    })
    if (existingAddresses.length === 0) {
      await create('addresses', {
        user_id: userId,
        label: 'Home',
        street: '215 Elm St',
        city: 'Springfield',
        postal_code: '54321',
        country: 'US',
        lat: 37.7749,
        lng: -122.4194,
        is_default: true,
      })
      addressesCreated++
    }

    const existingNotifs = await findMany<Record<string, unknown>>('notifications', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1,
    })
    if (existingNotifs.length === 0) {
      const samples = [
        {
          type: 'account',
          title: 'Welcome to Molecule Eats',
          body: 'Browse restaurants near you and place your first order — delivery is on us.',
          payload: { href: '/restaurants' },
          createdAtOffsetMs: 60 * 1000,
        },
        {
          type: 'promo',
          title: '20% off your first order',
          body: 'Use code WELCOME20 at checkout. Valid this week only.',
          payload: { href: '/restaurants' },
          createdAtOffsetMs: 30 * 60 * 1000,
        },
        {
          type: 'order_status',
          title: 'New restaurants this week',
          body: 'Six new local restaurants just joined Molecule Eats.',
          payload: { href: '/restaurants' },
          createdAtOffsetMs: 24 * 60 * 60 * 1000,
        },
      ]
      for (const s of samples) {
        await create('notifications', {
          user_id: userId,
          type: s.type,
          title: s.title,
          body: s.body,
          payload: JSON.stringify(s.payload),
          read_at: null,
          created_at: new Date(Date.now() - s.createdAtOffsetMs),
        })
        notificationsCreated++
      }
    }
  } catch (err) {
    // Seeding is best-effort; never block the request.

    console.error('[food-delivery seed] seedDemoForUser failed:', err)
  }

  return { addressesCreated, notificationsCreated }
}
