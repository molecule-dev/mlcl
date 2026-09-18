/**
 * Demo seed for venue-booking (Alcove).
 *
 * Two layers:
 *
 * 1. **Globals** (`seedGlobalCatalogIfEmpty`) — a demo "host" user and
 *    6 polished venue listings owned by that host so /search and
 *    /venue/:id render real data with usable IDs. Idempotent: skipped
 *    if any venue row already exists.
 *
 * 2. **Per-user** (`seedDemoForUser`) — a small starter set of
 *    favorites, notifications, and a sample message thread so a
 *    freshly signed-up user lands on /favorites, /notifications, and
 *    /messages with meaningful content. Idempotent on user_id.
 *
 * @module
 */

import { count, create, findMany, findOne } from '@molecule/api-database'

interface SeededRow {
  id: string
}

interface SeededVenue extends SeededRow {
  title: string
  city: string
  hourly_rate: number | string
}

const HOST_USER_ID = '00000000-0000-0000-0000-000000000a01'
const DEMO_HOST_EMAIL = 'maya@alcove.demo'

const VENUES: ReadonlyArray<{
  title: string
  description: string
  category: string
  venue_type: string
  city: string
  region: string
  country: string
  address: string
  latitude: number
  longitude: number
  capacity: number
  square_feet: number
  hourly_rate: number
  hourly_rate_cents: number
  daily_rate_cents: number
  currency: string
  photos: string[]
  amenities: string[]
  badges: string[]
  rating: number
  reviews_count: number
  house_rules: string
}> = [
  {
    title: 'The Aerie Loft',
    description:
      'A skylit Williamsburg loft with hardwood floors, a freight elevator, and a catering kitchen. Quiet enough to record audio, bright enough to shoot stills until dusk.',
    category: 'studio',
    venue_type: 'loft',
    city: 'Brooklyn',
    region: 'NY',
    country: 'United States',
    address: '88 N 11th St, Brooklyn, NY',
    latitude: 40.7218,
    longitude: -73.9579,
    capacity: 60,
    square_feet: 2400,
    hourly_rate: 175,
    hourly_rate_cents: 17500,
    daily_rate_cents: 140000,
    currency: 'USD',
    photos: [
      'https://picsum.photos/seed/alcove-aerie/1200/900',
      'https://picsum.photos/seed/alcove-aerie-b/1200/900',
      'https://picsum.photos/seed/alcove-aerie-c/1200/900',
    ],
    amenities: ['Skylights', 'Hardwood floors', 'Catering kitchen', 'Freight elevator'],
    badges: ['editor_pick', 'instant_book'],
    rating: 4.9,
    reviews_count: 312,
    house_rules: 'No smoking. Music off by 22:00. Loading via the freight elevator only.',
  },
  {
    title: 'Hillstead Garden',
    description:
      'A walled Hudson Valley garden with a willow canopy, vintage string-lighting, and a converted carriage house for catering. Best for weddings and outdoor dinners.',
    category: 'garden',
    venue_type: 'garden',
    city: 'Hudson',
    region: 'NY',
    country: 'United States',
    address: '110 Warren St, Hudson, NY',
    latitude: 42.2528,
    longitude: -73.7866,
    capacity: 140,
    square_feet: 9500,
    hourly_rate: 280,
    hourly_rate_cents: 28000,
    daily_rate_cents: 240000,
    currency: 'USD',
    photos: [
      'https://picsum.photos/seed/alcove-garden/1200/900',
      'https://picsum.photos/seed/alcove-garden-b/1200/900',
    ],
    amenities: ['Outdoor power', 'String lights', 'Restrooms', 'Carriage-house kitchen'],
    badges: ['rare_find'],
    rating: 4.8,
    reviews_count: 87,
    house_rules: 'Amplified sound off by 23:00. Tents permitted with prior approval.',
  },
  {
    title: 'Casa Sun Studio',
    description:
      'A daylight studio with a 14ft cyclorama wall, full lighting kit, and a private green room. Five blocks from the LA River.',
    category: 'studio',
    venue_type: 'studio',
    city: 'Los Angeles',
    region: 'CA',
    country: 'United States',
    address: '2611 Casitas Ave, Los Angeles, CA',
    latitude: 34.1024,
    longitude: -118.2563,
    capacity: 30,
    square_feet: 1800,
    hourly_rate: 145,
    hourly_rate_cents: 14500,
    daily_rate_cents: 116000,
    currency: 'USD',
    photos: [
      'https://picsum.photos/seed/alcove-studio/1200/900',
      'https://picsum.photos/seed/alcove-studio-b/1200/900',
    ],
    amenities: ['Cyclorama wall', 'Strobes + speedlights', 'Green room', 'Coffee bar'],
    badges: ['instant_book'],
    rating: 4.7,
    reviews_count: 156,
    house_rules: 'Cyc cleanup billed at $80/hr if not done. Strobes provided.',
  },
  {
    title: 'Lantern Rooftop',
    description:
      'A retractable-awning rooftop with a built-in bar and a panoramic skyline view of the Loop. Wired for sound, with a dedicated event manager on every booking.',
    category: 'rooftop',
    venue_type: 'rooftop',
    city: 'Chicago',
    region: 'IL',
    country: 'United States',
    address: '15 W Hubbard St, Chicago, IL',
    latitude: 41.8896,
    longitude: -87.6312,
    capacity: 90,
    square_feet: 3200,
    hourly_rate: 225,
    hourly_rate_cents: 22500,
    daily_rate_cents: 180000,
    currency: 'USD',
    photos: [
      'https://picsum.photos/seed/alcove-rooftop/1200/900',
      'https://picsum.photos/seed/alcove-rooftop-b/1200/900',
    ],
    amenities: ['Bar', 'Retractable awning', 'PA system', 'Skyline views'],
    badges: ['editor_pick'],
    rating: 4.9,
    reviews_count: 204,
    house_rules: 'No outside catering on weekends. Bar staff included in rate.',
  },
  {
    title: 'The Verdant Hall',
    description:
      "A restored New Orleans banquet hall with a stage, caterer's kitchen, and a bridal suite. Stained glass throughout.",
    category: 'banquet',
    venue_type: 'banquet',
    city: 'New Orleans',
    region: 'LA',
    country: 'United States',
    address: '722 St Charles Ave, New Orleans, LA',
    latitude: 29.9484,
    longitude: -90.0763,
    capacity: 220,
    square_feet: 6800,
    hourly_rate: 380,
    hourly_rate_cents: 38000,
    daily_rate_cents: 380000,
    currency: 'USD',
    photos: [
      'https://picsum.photos/seed/alcove-verdant/1200/900',
      'https://picsum.photos/seed/alcove-verdant-b/1200/900',
    ],
    amenities: ['Stage', "Caterer's kitchen", 'Bridal suite', 'Stained glass'],
    badges: ['editor_pick', 'rare_find'],
    rating: 4.9,
    reviews_count: 142,
    house_rules: 'Confetti and sparklers prohibited. Live music until 23:30.',
  },
  {
    title: 'Midnight Workshop',
    description:
      'An industrial workshop with a 20ft mezzanine, full tooling stations, and roll-up doors for vehicles. Used for product launches and art installations.',
    category: 'workshop',
    venue_type: 'workshop',
    city: 'Oakland',
    region: 'CA',
    country: 'United States',
    address: '1331 7th St, Oakland, CA',
    latitude: 37.8044,
    longitude: -122.2712,
    capacity: 75,
    square_feet: 4500,
    hourly_rate: 165,
    hourly_rate_cents: 16500,
    daily_rate_cents: 132000,
    currency: 'USD',
    photos: [
      'https://picsum.photos/seed/alcove-workshop/1200/900',
      'https://picsum.photos/seed/alcove-workshop-b/1200/900',
    ],
    amenities: ['Mezzanine', 'Tool stations', 'Roll-up doors', 'High ceilings'],
    badges: ['instant_book'],
    rating: 4.6,
    reviews_count: 64,
    house_rules: 'Tools must be returned to wall before checkout. Use eye protection.',
  },
]

const REVIEW_FRAGMENTS = [
  {
    rating: 5,
    title: 'A perfect afternoon',
    body: 'The light at 4pm is unreal. The host had everything set up before we arrived and stayed out of our way once we started shooting.',
  },
  {
    rating: 5,
    title: 'Even better than the photos',
    body: "Way more space than the gallery captured. Catering kitchen was clean. Will book again the next time we're in town.",
  },
  {
    rating: 4,
    title: 'Lovely venue, parking is tight',
    body: "Space itself is gorgeous, sound carries beautifully. Had a small parking issue with our caterer's truck but the host helped us figure it out.",
  },
  {
    rating: 5,
    title: 'Magic for our wedding',
    body: 'Could not have asked for a more thoughtful host. Every guest commented on the venue. Worth every penny.',
  },
]

/**
 * Seed the venue catalog (host user + 6 venues + a few reviews) if the
 * `venues` table is empty. Idempotent.
 */
export async function seedGlobalCatalogIfEmpty(): Promise<{
  hostCreated: boolean
  venuesCreated: number
  reviewsCreated: number
}> {
  const existing = await count('venues', [])
  if (existing > 0) {
    return { hostCreated: false, venuesCreated: 0, reviewsCreated: 0 }
  }

  // Create the demo host user iff missing. We use a deterministic UUID
  // so every fresh DB has the same host id (useful for fixtures).
  let hostCreated = false
  const existingHost = await findOne<Record<string, unknown>>('users', [
    { field: 'id', operator: '=', value: HOST_USER_ID },
  ])
  if (!existingHost) {
    await create('users', {
      id: HOST_USER_ID,
      email: DEMO_HOST_EMAIL,
      name: 'Maya Sosa',
      username: 'maya',
      planKey: 'free',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    hostCreated = true
  }

  let venuesCreated = 0
  let reviewsCreated = 0

  for (const v of VENUES) {
    const result = await create<SeededVenue>('venues', {
      host_user_id: HOST_USER_ID,
      owner_id: HOST_USER_ID,
      title: v.title,
      description: v.description,
      category: v.category,
      venue_type: v.venue_type,
      address: v.address,
      city: v.city,
      region: v.region,
      country: v.country,
      latitude: v.latitude,
      longitude: v.longitude,
      capacity: v.capacity,
      square_feet: v.square_feet,
      hourly_rate: v.hourly_rate,
      hourly_rate_cents: v.hourly_rate_cents,
      daily_rate_cents: v.daily_rate_cents,
      currency: v.currency,
      photos: JSON.stringify(v.photos),
      amenities: JSON.stringify(v.amenities),
      house_rules: v.house_rules,
      rating: v.rating,
      reviews_count: v.reviews_count,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    })
    const venue = (result.data ?? result) as SeededVenue
    venuesCreated++

    // Two seed reviews per venue. Use placeholder UUIDs so the (resourceType,
    // resourceId, userId) unique constraint never collides.
    for (let i = 0; i < 2; i++) {
      const fragment = REVIEW_FRAGMENTS[(venuesCreated + i) % REVIEW_FRAGMENTS.length]
      const placeholderUserId = `00000000-0000-0000-0000-${String(venuesCreated * 10 + i + 100).padStart(12, '0')}`
      try {
        await create('reviews', {
          resourceType: 'venue',
          resourceId: venue.id,
          userId: placeholderUserId,
          rating: fragment.rating,
          title: fragment.title,
          body: fragment.body,
        })
        reviewsCreated++
      } catch (_error) {
        // Unique constraint collision — skip.
      }
    }
  }

  return { hostCreated, venuesCreated, reviewsCreated }
}

/**
 * Seed a freshly signed-up user with starter favorites, welcome
 * notifications, and a sample message thread so /favorites,
 * /notifications, and /messages all render with meaningful content.
 * Idempotent on user_id.
 */
export async function seedDemoForUser(userId: string): Promise<{
  favoritesCreated: number
  notificationsCreated: number
  threadCreated: boolean
}> {
  if (!userId) return { favoritesCreated: 0, notificationsCreated: 0, threadCreated: false }

  // Make sure the venue catalog has rows we can reference.
  const venues = await findMany<{ id: string; title: string; city: string }>('venues', {
    orderBy: [{ field: 'rating', direction: 'desc' }],
    limit: 6,
  })
  if (venues.length === 0) {
    return { favoritesCreated: 0, notificationsCreated: 0, threadCreated: false }
  }

  // Skip everything below if the user already has demo content.
  const existingFavorites = await count('favorites', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  const existingNotifications = await count('notifications', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existingFavorites > 0 && existingNotifications > 0) {
    return { favoritesCreated: 0, notificationsCreated: 0, threadCreated: false }
  }

  let favoritesCreated = 0
  if (existingFavorites === 0) {
    for (const v of venues.slice(0, 2)) {
      try {
        await create('favorites', {
          user_id: userId,
          venue_id: v.id,
          created_at: new Date(),
        })
        favoritesCreated++
      } catch (_error) {
        // Unique (user_id, venue_id) collision — already favorited.
      }
    }
  }

  let notificationsCreated = 0
  if (existingNotifications === 0) {
    const welcome: Array<{
      kind: string
      payload: Record<string, unknown>
      offsetMinutes: number
      read?: boolean
    }> = [
      {
        kind: 'welcome',
        payload: {
          title: 'Welcome to Alcove',
          body: 'Save spaces you love and message hosts directly to plan your next event.',
          icon: 'auto_awesome',
          href: '/search',
        },
        offsetMinutes: 1,
      },
      {
        kind: 'price_drop',
        payload: {
          title: `${venues[0].title} dropped its weekday rate`,
          body: `Your favorite in ${venues[0].city} is offering a weekday discount this season.`,
          icon: 'trending_down',
          venue_id: venues[0].id,
          venue_name: venues[0].title,
          href: `/venue/${venues[0].id}`,
        },
        offsetMinutes: 60,
        read: false,
      },
    ]
    if (venues[1]) {
      welcome.push({
        kind: 'editor_pick',
        payload: {
          title: `Editor pick: ${venues[1].title}`,
          body: 'Hand-picked by the Alcove editorial team this month.',
          icon: 'star',
          venue_id: venues[1].id,
          venue_name: venues[1].title,
          href: `/venue/${venues[1].id}`,
        },
        offsetMinutes: 6 * 60,
        read: true,
      })
    }
    for (const n of welcome) {
      await create('notifications', {
        user_id: userId,
        kind: n.kind,
        payload: JSON.stringify(n.payload),
        read_at: n.read ? new Date(Date.now() - n.offsetMinutes * 60 * 1000) : null,
        created_at: new Date(Date.now() - n.offsetMinutes * 60 * 1000),
      })
      notificationsCreated++
    }
  }

  // Sample message thread between the new user and the demo host on
  // their first favorite venue. Skip if the user already has a thread
  // (guards against double-seeding when called from multiple paths).
  let threadCreated = false
  const existingThreads = await count('message_threads', [])
  // We can't easily filter by participant in count() without a where on
  // jsonb, so we just skip if threads already exist for this user via
  // findMany + filter. Cheap to do.
  if (existingThreads >= 0 && favoritesCreated > 0) {
    const allThreads = await findMany<Record<string, unknown>>('message_threads', { limit: 200 })
    const userThreads = allThreads.filter((t) => {
      const parts = t.participants
      const arr = Array.isArray(parts)
        ? parts
        : typeof parts === 'string'
          ? (() => {
              try {
                return JSON.parse(parts)
              } catch (_error) {
                // Non-JSON participants string — return empty array as fallback.
                return []
              }
            })()
          : []
      return Array.isArray(arr) && arr.includes(userId)
    })
    if (userThreads.length === 0) {
      const v = venues[0]
      const threadResult = await create<Record<string, unknown>>('message_threads', {
        booking_id: null,
        venue_id: v.id,
        participants: JSON.stringify([userId, HOST_USER_ID]),
        last_message_at: new Date(),
        created_at: new Date(),
      })
      const thread = (threadResult.data ?? threadResult) as Record<string, unknown>
      const threadId = String(thread.id)
      // Welcome message from the host.
      await create('messages', {
        thread_id: threadId,
        sender_user_id: HOST_USER_ID,
        body: `Hey — thanks for saving ${v.title}. Let me know if you want a walk-through; I'm in ${v.city} most weekdays.`,
        attachments: JSON.stringify([]),
        read_by: JSON.stringify([HOST_USER_ID]),
        created_at: new Date(Date.now() - 30 * 60 * 1000),
      })
      threadCreated = true
    }
  }

  return { favoritesCreated, notificationsCreated, threadCreated }
}

export const SEED_HOST_USER_ID = HOST_USER_ID
