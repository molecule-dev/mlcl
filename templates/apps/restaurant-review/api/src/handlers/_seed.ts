/**
 * Demo seed for restaurant-review.
 *
 * Two layers:
 *
 * 1. **Globals** (`seedGlobalCatalogIfEmpty`) — restaurants, menu items,
 *    a handful of authored reviews, and demo lists so /discover,
 *    /restaurants/:id and /lists render real data on first boot.
 *    Idempotent: skipped if any restaurant row already exists.
 *
 * 2. **Per-user** (`seedDemoForUser`) — a couple of welcome notifications
 *    so a freshly signed-up user lands on /notifications with content.
 *    Idempotent on owner_id.
 *
 * @module
 */
import { count, create, findMany, findOne } from '@molecule/api-database'

interface SeededRestaurant {
  id: string
  name: string
  city: string
}

const PLACEHOLDER_USER_PREFIX = '00000000-0000-0000-aaaa-'

const RESTAURANTS: ReadonlyArray<{
  name: string
  slug: string
  cuisine: string
  neighborhood: string
  city: string
  address: string
  description: string
  price_level: number
  rating: number
  review_count: number
  thumbnail_url: string
  gallery: string[]
  badges: string[]
  tags: string[]
  hours: Record<string, string>
  latitude: number
  longitude: number
  menu: ReadonlyArray<{
    name: string
    description: string
    price_cents: number
    category: string
  }>
  seedReviews: ReadonlyArray<{
    title: string
    rating: number
    body: string
    photos: string[]
  }>
}> = [
  {
    name: 'Maialino Rosso',
    slug: 'maialino-rosso',
    cuisine: 'Italian',
    neighborhood: 'East Village',
    city: 'NYC',
    address: '215 Mott Street, New York, NY',
    description:
      "Roman-style trattoria with hand-rolled pastas, a forty-label amaro list, and the city's most consistent cacio e pepe.",
    price_level: 3,
    rating: 4.7,
    review_count: 412,
    thumbnail_url: 'https://picsum.photos/seed/morsel-r1/800/500',
    gallery: [
      'https://picsum.photos/seed/morsel-r1-g1/600/600',
      'https://picsum.photos/seed/morsel-r1-g2/600/600',
      'https://picsum.photos/seed/morsel-r1-g3/600/600',
      'https://picsum.photos/seed/morsel-r1-g4/600/600',
    ],
    badges: ['editor_pick'],
    tags: ['pasta', 'wine_bar', 'date_night'],
    hours: { mon_thu: '5pm – 11pm', fri_sat: '5pm – 1am', sun: '5pm – 10pm' },
    latitude: 40.7234,
    longitude: -73.9912,
    menu: [
      {
        name: 'Cacio e Pepe Arancini',
        description: 'Crisp risotto spheres, pecorino-pepper heart.',
        price_cents: 1400,
        category: 'Antipasti',
      },
      {
        name: 'Spaghetti alla Carbonara',
        description: 'Hand-cut tonnarelli, guanciale, pecorino, organic egg yolk.',
        price_cents: 2400,
        category: 'Pasta',
      },
      {
        name: 'Cacio e Pepe',
        description: 'Rigatoni, aged pecorino romano, cracked black pepper.',
        price_cents: 2200,
        category: 'Pasta',
      },
      {
        name: 'Saltimbocca alla Romana',
        description: 'Veal scaloppini, prosciutto, sage, marsala-pan jus.',
        price_cents: 3600,
        category: 'Secondi',
      },
    ],
    seedReviews: [
      {
        title: 'Best carbonara in the city',
        rating: 5,
        body: 'The carbonara has no business being this silken. Pecorino-and-pepper bite, ribbons of guanciale, and an egg-yolk lacquer that clung to every strand. Came back the next night for the cacio e pepe.',
        photos: ['https://picsum.photos/seed/morsel-rd-rv1a/200/200'],
      },
      {
        title: 'Saltimbocca steals the night',
        rating: 4,
        body: 'Service is warm, the pasta is the headline, but the saltimbocca quietly steals the night. Wine list leans Lazio — let the somm pair you.',
        photos: [],
      },
    ],
  },
  {
    name: 'Sakura Omakase',
    slug: 'sakura-omakase',
    cuisine: 'Japanese',
    neighborhood: 'West Loop',
    city: 'Chicago',
    address: '841 W Randolph Street, Chicago, IL',
    description:
      'Twelve-seat counter, single seating, hand-cut nigiri sourced from Toyosu market. Reservations open the first of each month.',
    price_level: 4,
    rating: 4.9,
    review_count: 156,
    thumbnail_url: 'https://picsum.photos/seed/morsel-r2/800/500',
    gallery: [
      'https://picsum.photos/seed/morsel-r2-g1/600/600',
      'https://picsum.photos/seed/morsel-r2-g2/600/600',
      'https://picsum.photos/seed/morsel-r2-g3/600/600',
    ],
    badges: ['michelin', 'editor_pick'],
    tags: ['sushi', 'tasting_menu', 'splurge'],
    hours: { tue_sat: '6pm – 10pm (single seating)', sun_mon: 'closed' },
    latitude: 41.8847,
    longitude: -87.6489,
    menu: [
      {
        name: 'Omakase nigiri (12 pieces)',
        description: 'Hand-cut from Toyosu — chef’s rotating selection.',
        price_cents: 19500,
        category: 'Tasting',
      },
      {
        name: 'Toro tartare',
        description: 'Otoro, finger lime, aged shoyu.',
        price_cents: 4200,
        category: 'Starters',
      },
    ],
    seedReviews: [
      {
        title: 'Worth the booking gymnastics',
        rating: 5,
        body: 'Eight-course omakase that earned every minute. The aji with smoked-salt mignonette is a small religious experience. Service is stoic but warm, the way you want it at a 10-seat counter.',
        photos: [],
      },
    ],
  },
  {
    name: 'La Birria Brigade',
    slug: 'la-birria-brigade',
    cuisine: 'Mexican',
    neighborhood: 'Mission',
    city: 'San Francisco',
    address: '2901 24th Street, San Francisco, CA',
    description:
      'Slow-braised birria tacos, consommé on the side, mezcal flights. The salsa macha alone is worth the line.',
    price_level: 2,
    rating: 4.6,
    review_count: 873,
    thumbnail_url: 'https://picsum.photos/seed/morsel-r3/800/500',
    gallery: [
      'https://picsum.photos/seed/morsel-r3-g1/600/600',
      'https://picsum.photos/seed/morsel-r3-g2/600/600',
    ],
    badges: ['trending'],
    tags: ['tacos', 'mezcal', 'casual'],
    hours: { tue_sun: '11am – 10pm', mon: 'closed' },
    latitude: 37.7521,
    longitude: -122.408,
    menu: [
      {
        name: 'Birria taco (3)',
        description: 'Slow-braised, queso quesadilla style, with consommé.',
        price_cents: 1500,
        category: 'Tacos',
      },
      {
        name: 'Mezcal flight',
        description: 'Three small pours, organized by smoke.',
        price_cents: 2800,
        category: 'Bar',
      },
    ],
    seedReviews: [
      {
        title: 'Birria done right',
        rating: 5,
        body: 'Birria consomé was rich and balanced, the tortillas were hand-pressed and crisp. Service ran a bit thin on a Saturday but the food carried the night.',
        photos: ['https://picsum.photos/seed/morsel-mrv2/200/200'],
      },
    ],
  },
  {
    name: 'Hanok Banchan',
    slug: 'hanok-banchan',
    cuisine: 'Korean',
    neighborhood: 'Koreatown',
    city: 'LA',
    address: '928 S Western Avenue, Los Angeles, CA',
    description:
      'Family-run, seventeen-banchan tableside spread. The galbijjim braises for nine hours and tastes like it.',
    price_level: 2,
    rating: 4.5,
    review_count: 642,
    thumbnail_url: 'https://picsum.photos/seed/morsel-r4/800/500',
    gallery: [
      'https://picsum.photos/seed/morsel-r4-g1/600/600',
      'https://picsum.photos/seed/morsel-r4-g2/600/600',
    ],
    badges: ['hidden_gem'],
    tags: ['bbq', 'banchan', 'group'],
    hours: { mon_sun: '11:30am – 11pm' },
    latitude: 34.0561,
    longitude: -118.3089,
    menu: [
      {
        name: 'Galbijjim',
        description: 'Nine-hour braised short rib, daikon, jujube.',
        price_cents: 3800,
        category: 'Mains',
      },
      {
        name: 'Banchan platter',
        description: 'Seventeen seasonal small plates.',
        price_cents: 1400,
        category: 'Starters',
      },
    ],
    seedReviews: [
      {
        title: 'Banchan game unmatched',
        rating: 4,
        body: 'Banchan game is unmatched here. Their kimchi alone earns the trip — the KBBQ is good, not transcendent. Late-night vibe is a strong yes.',
        photos: ['https://picsum.photos/seed/morsel-mrv3/200/200'],
      },
    ],
  },
  {
    name: 'Café de Saint Clair',
    slug: 'cafe-de-saint-clair',
    cuisine: 'French',
    neighborhood: 'Le Marais',
    city: 'Paris',
    address: '12 Rue des Archives, 75004 Paris',
    description:
      'Classic bistro with a daily-changing chalkboard, butter from Brittany, and a tarte tatin worth the flight.',
    price_level: 4,
    rating: 4.8,
    review_count: 235,
    thumbnail_url: 'https://picsum.photos/seed/morsel-r5/800/500',
    gallery: [
      'https://picsum.photos/seed/morsel-r5-g1/600/600',
      'https://picsum.photos/seed/morsel-r5-g2/600/600',
    ],
    badges: ['editor_pick'],
    tags: ['bistro', 'wine', 'classic'],
    hours: { tue_sun: '12pm – 11pm', mon: 'closed' },
    latitude: 48.8589,
    longitude: 2.359,
    menu: [
      {
        name: 'Steak frites',
        description: 'Hanger steak, Bordelaise butter, hand-cut frites.',
        price_cents: 3200,
        category: 'Mains',
      },
      {
        name: 'Tarte tatin',
        description: 'Caramelised apples, salted-butter pastry, Normandy cream.',
        price_cents: 1400,
        category: 'Dessert',
      },
    ],
    seedReviews: [
      {
        title: 'Worth the flight',
        rating: 5,
        body: 'A textbook bistro. Butter heavy, brown-sauce serious, wine list deep into the Loire. The tarte tatin alone justifies the trip.',
        photos: [],
      },
    ],
  },
  {
    name: 'Soi 38',
    slug: 'soi-38',
    cuisine: 'Thai',
    neighborhood: 'Mid-Wilshire',
    city: 'LA',
    address: '5168 Wilshire Boulevard, Los Angeles, CA',
    description:
      'Bangkok street food done right — boat noodles, khao soi, and the hottest som tam on the block.',
    price_level: 2,
    rating: 4.4,
    review_count: 511,
    thumbnail_url: 'https://picsum.photos/seed/morsel-r6/800/500',
    gallery: [
      'https://picsum.photos/seed/morsel-r6-g1/600/600',
      'https://picsum.photos/seed/morsel-r6-g2/600/600',
    ],
    badges: ['new'],
    tags: ['spicy', 'noodles', 'casual'],
    hours: { mon_sun: '11am – 10pm' },
    latitude: 34.0628,
    longitude: -118.3489,
    menu: [
      {
        name: 'Boat noodles',
        description: 'Beef brisket, pork blood broth, morning glory, peanuts.',
        price_cents: 1500,
        category: 'Noodles',
      },
      {
        name: 'Khao soi',
        description: 'Northern Thai curry, egg noodles, pickled mustard, lime.',
        price_cents: 1700,
        category: 'Curries',
      },
    ],
    seedReviews: [
      {
        title: 'Real Bangkok flavor',
        rating: 4,
        body: 'Authentic boat noodles, proper khao soi, and the hottest som tam on Wilshire. Casual, packed, fast.',
        photos: [],
      },
    ],
  },
]

const DEMO_LISTS = [
  {
    name: 'Editor’s pick: 50 essential pizzas',
    description:
      'A coast-to-coast Naples-via-Brooklyn tour — Detroit, New Haven, Philly, and beyond.',
    cover_url: 'https://picsum.photos/seed/morsel-list-3/1200/700',
    visibility: 'public',
  },
  {
    name: 'NYC omakase under $200',
    description:
      'Counter-only kitchens where the chef’s tasting reads like a love letter, not a flex.',
    cover_url: 'https://picsum.photos/seed/morsel-list-4/1200/700',
    visibility: 'public',
  },
] as const

/**
 * Which seeded restaurants belong to each `DEMO_LISTS` entry, indexed into
 * `RESTAURANTS`. Keeps the demo lists non-empty so `/lists/:id` and the
 * "N spots" counts render real content on first boot.
 */
const DEMO_LIST_ITEM_INDICES: readonly (readonly number[])[] = [
  [0, 4, 2], // Maialino Rosso, Café de Saint Clair, La Birria Brigade
  [1, 3, 5], // Sakura Omakase, Hanok Banchan, Soi 38
]

/**
 * Seed restaurants (with menus + a couple of authored reviews) and a few
 * public lists if the `restaurants` table is empty.
 *
 * Returns counts of rows created so callers can log non-trivial bootstrap.
 */
export async function seedGlobalCatalogIfEmpty(): Promise<{
  restaurantsCreated: number
  reviewsCreated: number
  menuItemsCreated: number
  listsCreated: number
  listItemsCreated: number
}> {
  const existing = await count('restaurants', [])
  if (existing > 0) {
    return {
      restaurantsCreated: 0,
      reviewsCreated: 0,
      menuItemsCreated: 0,
      listsCreated: 0,
      listItemsCreated: 0,
    }
  }

  let restaurantsCreated = 0
  let reviewsCreated = 0
  let menuItemsCreated = 0
  let listsCreated = 0
  let listItemsCreated = 0
  const createdRestaurantIds: string[] = []

  // The owner UUID we seed restaurants/lists/reviews under. Real users
  // who later POST will have their session userId; this owner_id is just
  // a stable placeholder so PUT/DELETE on seeded rows fails ownership
  // checks (preventing accidental mutation of seed content).
  const seedOwner = `${PLACEHOLDER_USER_PREFIX}000000000001`

  for (const r of RESTAURANTS) {
    const result = await create<SeededRestaurant>('restaurants', {
      name: r.name,
      slug: r.slug,
      cuisine: r.cuisine,
      neighborhood: r.neighborhood,
      city: r.city,
      address: r.address,
      description: r.description,
      price_level: r.price_level,
      thumbnail_url: r.thumbnail_url,
      gallery: JSON.stringify(r.gallery),
      badges: JSON.stringify(r.badges),
      tags: JSON.stringify(r.tags),
      hours: JSON.stringify(r.hours),
      latitude: r.latitude,
      longitude: r.longitude,
      rating: r.rating,
      review_count: r.review_count,
      status: 'active',
      owner_id: seedOwner,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const restaurant = (result.data ?? result) as SeededRestaurant
    createdRestaurantIds.push(restaurant.id)
    restaurantsCreated++

    for (const m of r.menu) {
      await create('menu_items', {
        restaurant_id: restaurant.id,
        name: m.name,
        description: m.description,
        price_cents: m.price_cents,
        currency: 'USD',
        category: m.category,
        available: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      menuItemsCreated++
    }

    for (let i = 0; i < r.seedReviews.length; i++) {
      const rv = r.seedReviews[i]
      // Each seed review needs a distinct placeholder owner_id so the
      // UNIQUE(restaurant_id, owner_id) constraint is satisfied.
      const placeholderOwner = `${PLACEHOLDER_USER_PREFIX}${String(restaurantsCreated * 100 + i).padStart(12, '0')}`
      try {
        await create('restaurant_reviews', {
          restaurant_id: restaurant.id,
          owner_id: placeholderOwner,
          title: rv!.title,
          rating: rv!.rating,
          body: rv!.body,
          photos: JSON.stringify(rv!.photos),
          helpful_count: Math.floor(20 + Math.random() * 100),
          created_at: new Date(Date.now() - (i + 1) * 86_400_000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        reviewsCreated++
      } catch (_error) {
        // skip duplicate placeholder collisions — UNIQUE constraint violations are expected during re-seeding
      }
    }
  }

  for (let li = 0; li < DEMO_LISTS.length; li++) {
    const list = DEMO_LISTS[li]!
    const result = await create<{ id: string }>('lists', {
      owner_id: seedOwner,
      name: list.name,
      description: list.description,
      cover_url: list.cover_url,
      visibility: list.visibility,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    listsCreated++
    const createdList = (result.data ?? result) as { id: string }

    // Attach a curated handful of the seeded restaurants so the list
    // detail view + "N spots" counts render real content on first boot.
    let position = 0
    for (const idx of DEMO_LIST_ITEM_INDICES[li] ?? []) {
      const restaurantId = createdRestaurantIds[idx]
      if (!restaurantId) continue
      try {
        await create('list_items', {
          list_id: createdList.id,
          restaurant_id: restaurantId,
          position: position++,
          note: '',
          added_at: new Date().toISOString(),
        })
        listItemsCreated++
      } catch (_error) {
        // skip duplicate (list_id, restaurant_id) collisions on re-seed
      }
    }
  }

  return { restaurantsCreated, reviewsCreated, menuItemsCreated, listsCreated, listItemsCreated }
}

/**
 * Seed a freshly signed-up user with welcome notifications. Idempotent
 * on owner_id: if any notification already exists for the user, we skip.
 */
export async function seedDemoForUser(userId: string): Promise<{
  notificationsCreated: number
}> {
  if (!userId) return { notificationsCreated: 0 }

  const existing = await count('notifications', [
    { field: 'owner_id', operator: '=', value: userId },
  ])
  if (existing > 0) return { notificationsCreated: 0 }

  const someRestaurants = await findMany<{ id: string; name: string; cuisine: string }>(
    'restaurants',
    {
      orderBy: [{ field: 'rating', direction: 'desc' }],
      limit: 3,
    },
  )

  const welcome: Array<{
    type: string
    title: string
    body: string
    href: string | null
    offsetMinutes: number
  }> = [
    {
      type: 'restaurant_update',
      title: 'Welcome to Morsel',
      body: 'Bookmark places you loved, write tasting notes that actually help your friends, and follow tastemakers in your neighborhood.',
      href: '/discover',
      offsetMinutes: 1,
    },
  ]
  if (someRestaurants[0]) {
    welcome.push({
      type: 'restaurant_update',
      title: `${someRestaurants[0].name} just got an editor pick`,
      body: `Tonight's pick in ${someRestaurants[0].cuisine}. Worth the calendar block.`,
      href: `/restaurants/${someRestaurants[0].id}`,
      offsetMinutes: 60,
    })
  }
  if (someRestaurants[1]) {
    welcome.push({
      type: 'restaurant_update',
      title: 'A spot worth the trek',
      body: `${someRestaurants[1].name} is trending in your feed.`,
      href: `/restaurants/${someRestaurants[1].id}`,
      offsetMinutes: 6 * 60,
    })
  }

  let notificationsCreated = 0
  for (const n of welcome) {
    // Find an existing identical notification (in case of races) before
    // inserting; the table has no unique constraint that would catch this.
    const dup = await findOne('notifications', [
      { field: 'owner_id', operator: '=', value: userId },
      { field: 'title', operator: '=', value: n.title },
    ])
    if (dup) continue
    await create('notifications', {
      owner_id: userId,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      read: false,
      created_at: new Date(Date.now() - n.offsetMinutes * 60 * 1000).toISOString(),
    })
    notificationsCreated++
  }

  return { notificationsCreated }
}
