/**
 * Demo seed for rental-marketplace (Roost).
 *
 * Two layers:
 *
 * 1. **Globals** (`seedGlobalCatalogIfEmpty`) — three demo "host"
 *    users and 8 polished listings owned across them so /search and
 *    /listing/:id render real data with usable IDs. Idempotent: skipped
 *    if any listings row already exists.
 *
 * 2. **Per-user** (`seedDemoForUser`) — a small starter set of
 *    bookmarks, notifications, and a sample message thread so a
 *    freshly signed-up user lands on /wishlist, /notifications, and
 *    /messages with meaningful content. Idempotent on user_id.
 *
 * @module
 */

import { count, create, findMany, findOne } from '@molecule/api-database'

interface SeededRow {
  id: string
}

interface SeededListing extends SeededRow {
  title: string
  city: string
  price_per_night: number | string
}

const HOST_USERS: ReadonlyArray<{
  id: string
  email: string
  name: string
  username: string
}> = [
  {
    id: '00000000-0000-0000-0000-000000000a01',
    email: 'amelia@roost.demo',
    name: 'Amelia Russo',
    username: 'amelia',
  },
  {
    id: '00000000-0000-0000-0000-000000000a02',
    email: 'kenji@roost.demo',
    name: 'Kenji Tanaka',
    username: 'kenji',
  },
  {
    id: '00000000-0000-0000-0000-000000000a03',
    email: 'sofia@roost.demo',
    name: 'Sofia Mendes',
    username: 'sofia',
  },
]

const LISTINGS: ReadonlyArray<{
  host_index: number
  title: string
  description: string
  property_type: 'apartment' | 'house' | 'condo' | 'cabin' | 'villa' | 'loft' | 'room' | 'other'
  city: string
  state: string
  country: string
  address: string
  postal_code: string
  latitude: number
  longitude: number
  max_guests: number
  bedrooms: number
  beds: number
  bathrooms: number
  price_per_night: number
  cleaning_fee: number
  service_fee_rate?: number
  currency: string
  images: string[]
  amenities: string[]
  rating: number
  reviews_count: number
  total_bookings: number
  house_rules: string
  instant_book: boolean
  badges: string[]
}> = [
  {
    host_index: 0,
    title: 'Sunlit Brooklyn Loft',
    description:
      'A bright Williamsburg loft with original brick, oversized windows, and a quiet bedroom in the back. Steps from the Bedford L stop and an easy walk to McCarren Park.',
    property_type: 'loft',
    city: 'Brooklyn',
    state: 'NY',
    country: 'United States',
    address: '88 N 11th St',
    postal_code: '11211',
    latitude: 40.7218,
    longitude: -73.9579,
    max_guests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    price_per_night: 215,
    cleaning_fee: 65,
    service_fee_rate: 0.15,
    currency: 'USD',
    images: [
      'https://picsum.photos/seed/roost-bk-loft/1200/900',
      'https://picsum.photos/seed/roost-bk-loft-b/1200/900',
      'https://picsum.photos/seed/roost-bk-loft-c/1200/900',
      'https://picsum.photos/seed/roost-bk-loft-d/1200/900',
    ],
    amenities: ['Wifi', 'Kitchen', 'Washer', 'Dryer', 'Heating', 'Air conditioning', 'Workspace'],
    rating: 4.92,
    reviews_count: 184,
    total_bookings: 312,
    house_rules:
      'No smoking. No parties or events. Quiet hours 22:00–08:00. Self check-in via lockbox.',
    instant_book: true,
    badges: ['superhost', 'instant_book'],
  },
  {
    host_index: 1,
    title: 'Tahoe Pine Cabin',
    description:
      'A cozy A-frame cabin tucked into the pines, ten minutes from Heavenly. Hot tub on the back deck, fireplace, and a stocked kitchen for snowy nights in.',
    property_type: 'cabin',
    city: 'South Lake Tahoe',
    state: 'CA',
    country: 'United States',
    address: '1422 Pine Ridge Rd',
    postal_code: '96150',
    latitude: 38.9399,
    longitude: -119.9772,
    max_guests: 6,
    bedrooms: 3,
    beds: 4,
    bathrooms: 2,
    price_per_night: 285,
    cleaning_fee: 95,
    service_fee_rate: 0.1,
    currency: 'USD',
    images: [
      'https://picsum.photos/seed/roost-tahoe-cabin/1200/900',
      'https://picsum.photos/seed/roost-tahoe-cabin-b/1200/900',
      'https://picsum.photos/seed/roost-tahoe-cabin-c/1200/900',
    ],
    amenities: [
      'Wifi',
      'Kitchen',
      'Hot tub',
      'Fireplace',
      'Heating',
      'Free parking',
      'Ski storage',
    ],
    rating: 4.86,
    reviews_count: 142,
    total_bookings: 261,
    house_rules:
      'No smoking. Pets welcome with $40/night fee. Hot-tub cover on when not in use. No glass on the deck.',
    instant_book: true,
    badges: ['superhost', 'instant_book', 'pet_friendly'],
  },
  {
    host_index: 2,
    title: 'Lisbon Tile House',
    description:
      'A bright townhouse in Alfama with original azulejo tiles, a roof terrace, and a quiet courtyard. Near the 28 tram and a short walk to the cathedral.',
    property_type: 'house',
    city: 'Lisbon',
    state: 'Lisboa',
    country: 'Portugal',
    address: 'R. dos Cegos 14',
    postal_code: '1100-160',
    latitude: 38.7128,
    longitude: -9.1294,
    max_guests: 5,
    bedrooms: 2,
    beds: 3,
    bathrooms: 2,
    price_per_night: 165,
    cleaning_fee: 50,
    currency: 'USD',
    images: [
      'https://picsum.photos/seed/roost-lisbon/1200/900',
      'https://picsum.photos/seed/roost-lisbon-b/1200/900',
      'https://picsum.photos/seed/roost-lisbon-c/1200/900',
    ],
    amenities: ['Wifi', 'Kitchen', 'Washer', 'Air conditioning', 'Roof terrace', 'Workspace'],
    rating: 4.78,
    reviews_count: 96,
    total_bookings: 174,
    house_rules:
      'No smoking. No parties. Roof terrace closes 23:00. Original tilework — please be gentle.',
    instant_book: false,
    badges: ['rare_find'],
  },
  {
    host_index: 0,
    title: 'Greenwich Village Studio',
    description:
      'A polished studio in a 1920s walkup with a Murphy bed, marble bath, and a bay window over the village. Five minutes to the West 4th subway.',
    property_type: 'apartment',
    city: 'New York',
    state: 'NY',
    country: 'United States',
    address: '67 W 4th St',
    postal_code: '10012',
    latitude: 40.7299,
    longitude: -74.0,
    max_guests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    price_per_night: 195,
    cleaning_fee: 55,
    currency: 'USD',
    images: [
      'https://picsum.photos/seed/roost-village/1200/900',
      'https://picsum.photos/seed/roost-village-b/1200/900',
    ],
    amenities: ['Wifi', 'Kitchen', 'Air conditioning', 'Heating', 'Workspace', 'Doorman'],
    rating: 4.81,
    reviews_count: 67,
    total_bookings: 138,
    house_rules: 'No smoking. No pets. No parties. Walkup — please be kind to neighbors.',
    instant_book: true,
    badges: ['instant_book'],
  },
  {
    host_index: 1,
    title: 'Kyoto Garden Machiya',
    description:
      'A restored 1890s machiya with tatami rooms, a stone garden, and an ofuro tub. In Higashiyama, three blocks from Yasaka shrine.',
    property_type: 'house',
    city: 'Kyoto',
    state: 'Kyoto',
    country: 'Japan',
    address: '14 Yasaka-jinja Higashi-iru',
    postal_code: '605-0073',
    latitude: 35.0036,
    longitude: 135.7782,
    max_guests: 4,
    bedrooms: 2,
    beds: 4,
    bathrooms: 1,
    price_per_night: 240,
    cleaning_fee: 80,
    currency: 'USD',
    images: [
      'https://picsum.photos/seed/roost-kyoto/1200/900',
      'https://picsum.photos/seed/roost-kyoto-b/1200/900',
      'https://picsum.photos/seed/roost-kyoto-c/1200/900',
      'https://picsum.photos/seed/roost-kyoto-d/1200/900',
    ],
    amenities: ['Wifi', 'Kitchen', 'Garden', 'Tatami room', 'Ofuro', 'Air conditioning'],
    rating: 4.94,
    reviews_count: 211,
    total_bookings: 312,
    house_rules:
      'No shoes inside. Slippers provided. No smoking anywhere. Quiet after 21:00. Tatami care: no luggage on mats.',
    instant_book: false,
    badges: ['superhost', 'rare_find'],
  },
  {
    host_index: 2,
    title: 'Marfa Desert Casita',
    description:
      'A minimalist concrete casita with a private courtyard, plunge pool, and 360° desert views. Walking distance to the Chinati Foundation.',
    property_type: 'house',
    city: 'Marfa',
    state: 'TX',
    country: 'United States',
    address: '210 W El Paso St',
    postal_code: '79843',
    latitude: 30.3098,
    longitude: -104.0203,
    max_guests: 3,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    price_per_night: 320,
    cleaning_fee: 100,
    currency: 'USD',
    images: [
      'https://picsum.photos/seed/roost-marfa/1200/900',
      'https://picsum.photos/seed/roost-marfa-b/1200/900',
      'https://picsum.photos/seed/roost-marfa-c/1200/900',
    ],
    amenities: ['Wifi', 'Kitchen', 'Plunge pool', 'Air conditioning', 'Outdoor shower', 'Bicycles'],
    rating: 4.89,
    reviews_count: 88,
    total_bookings: 152,
    house_rules:
      'No smoking. No pets. No parties. Conserve water — desert climate. Pool open dawn to dusk.',
    instant_book: true,
    badges: ['editor_pick', 'instant_book'],
  },
  {
    host_index: 0,
    title: 'Mountainview Aspen Condo',
    description:
      'A sunlit two-bedroom condo at the base of Aspen Highlands. Boot warmers, hot tub access, and a chef-grade kitchen for après nights in.',
    property_type: 'condo',
    city: 'Aspen',
    state: 'CO',
    country: 'United States',
    address: '199 Maroon Creek Rd',
    postal_code: '81611',
    latitude: 39.1845,
    longitude: -106.8483,
    max_guests: 6,
    bedrooms: 2,
    beds: 3,
    bathrooms: 2,
    price_per_night: 425,
    cleaning_fee: 120,
    currency: 'USD',
    images: [
      'https://picsum.photos/seed/roost-aspen/1200/900',
      'https://picsum.photos/seed/roost-aspen-b/1200/900',
      'https://picsum.photos/seed/roost-aspen-c/1200/900',
    ],
    amenities: ['Wifi', 'Kitchen', 'Hot tub', 'Ski-in/ski-out', 'Heating', 'Boot warmers'],
    rating: 4.83,
    reviews_count: 124,
    total_bookings: 217,
    house_rules:
      'No smoking. No pets. No parties. Ski boots in mudroom only. Quiet hours 22:00–07:00.',
    instant_book: true,
    badges: ['superhost', 'instant_book'],
  },
  {
    host_index: 1,
    title: 'Oaxaca Rooftop Villa',
    description:
      'A bright two-floor villa with a rooftop hammock, plunge pool, and a tiled cooking patio. In Centro near the Templo de Santo Domingo.',
    property_type: 'villa',
    city: 'Oaxaca',
    state: 'Oaxaca',
    country: 'Mexico',
    address: 'Calle Reforma 314',
    postal_code: '68000',
    latitude: 17.0667,
    longitude: -96.7203,
    max_guests: 5,
    bedrooms: 2,
    beds: 3,
    bathrooms: 2,
    price_per_night: 175,
    cleaning_fee: 60,
    currency: 'USD',
    images: [
      'https://picsum.photos/seed/roost-oaxaca/1200/900',
      'https://picsum.photos/seed/roost-oaxaca-b/1200/900',
      'https://picsum.photos/seed/roost-oaxaca-c/1200/900',
    ],
    amenities: ['Wifi', 'Kitchen', 'Plunge pool', 'Roof terrace', 'Hammocks', 'Air conditioning'],
    rating: 4.9,
    reviews_count: 156,
    total_bookings: 248,
    house_rules:
      'No smoking inside. Music off rooftop by 22:00. Pool closes at sunset. Conserve water.',
    instant_book: false,
    badges: ['superhost'],
  },
]

const REVIEW_FRAGMENTS: ReadonlyArray<{
  rating: number
  title: string
  body: string
}> = [
  {
    rating: 5,
    title: 'Better than the photos',
    body: 'Even more lovely in person. The host left thoughtful welcome notes, and check-in was effortless. Would absolutely book again.',
  },
  {
    rating: 5,
    title: 'A perfect long weekend',
    body: 'Quiet, comfortable, and laid out exactly the way the listing described. We never wanted to leave.',
  },
  {
    rating: 4,
    title: 'Lovely stay, minor street noise',
    body: 'The space itself is gorgeous and very comfortable. Some street noise on the first night but it was fine after we closed the windows.',
  },
  {
    rating: 5,
    title: 'Hands-down our best stay this year',
    body: 'Every detail was thoughtful — coffee was great, beds slept like clouds, the bathroom was spa-like. The host responded in minutes any time we had a question.',
  },
  {
    rating: 5,
    title: 'A real gem in a great neighborhood',
    body: 'We loved walking out and finding cafes and a park five minutes away. The host gave us a small map of favorite spots that we used every day.',
  },
]

/**
 * Demo "guest reviewer" users that back seeded reviews so reviewer
 * names + avatars resolve via the canonical user lookup. Deterministic
 * UUIDs (and unique emails) so multiple fresh DBs reproduce the same
 * fixture.
 */
const GUEST_REVIEWERS: ReadonlyArray<{
  id: string
  email: string
  name: string
}> = [
  // Order matters: the seeded reviews pick reviewers via
  // `(listingsCreated * 2 + i)` with `placeholderUserId` style ids
  // `...01<X><Y>` where X is `listingsCreated` and Y is i (0/1).
  // We mirror that mapping here so the existing review rows align with
  // these user records.
  { id: '00000000-0000-0000-0000-000000000110', email: 'noah-r@roost.demo', name: 'Noah Reyes' },
  { id: '00000000-0000-0000-0000-000000000111', email: 'maya-c@roost.demo', name: 'Maya Carter' },
  { id: '00000000-0000-0000-0000-000000000120', email: 'liam-p@roost.demo', name: 'Liam Park' },
  { id: '00000000-0000-0000-0000-000000000121', email: 'sara-d@roost.demo', name: 'Sara Diaz' },
  { id: '00000000-0000-0000-0000-000000000130', email: 'ben-f@roost.demo', name: 'Ben Friedman' },
  { id: '00000000-0000-0000-0000-000000000131', email: 'iris-w@roost.demo', name: 'Iris Wei' },
  { id: '00000000-0000-0000-0000-000000000140', email: 'theo-h@roost.demo', name: 'Theo Hall' },
  { id: '00000000-0000-0000-0000-000000000141', email: 'elena-m@roost.demo', name: 'Elena Marin' },
  {
    id: '00000000-0000-0000-0000-000000000150',
    email: 'jude-t@roost.demo',
    name: 'Jude Takahashi',
  },
  { id: '00000000-0000-0000-0000-000000000151', email: 'zara-l@roost.demo', name: 'Zara Laurent' },
  {
    id: '00000000-0000-0000-0000-000000000160',
    email: 'caleb-o@roost.demo',
    name: "Caleb O'Connor",
  },
  { id: '00000000-0000-0000-0000-000000000161', email: 'naomi-k@roost.demo', name: 'Naomi Klein' },
  { id: '00000000-0000-0000-0000-000000000170', email: 'rio-s@roost.demo', name: 'Rio Souza' },
  { id: '00000000-0000-0000-0000-000000000171', email: 'lena-b@roost.demo', name: 'Lena Bauer' },
  { id: '00000000-0000-0000-0000-000000000180', email: 'kai-w@roost.demo', name: 'Kai Williams' },
  { id: '00000000-0000-0000-0000-000000000181', email: 'amaya-r@roost.demo', name: 'Amaya Rosas' },
]

/**
 * Seed the listings catalog (3 host users + 8 listings + a few reviews)
 * if the `listings` table is empty. Idempotent.
 */
export async function seedGlobalCatalogIfEmpty(): Promise<{
  hostsCreated: number
  listingsCreated: number
  reviewsCreated: number
}> {
  const existing = await count('listings', [])
  if (existing > 0) {
    return { hostsCreated: 0, listingsCreated: 0, reviewsCreated: 0 }
  }

  // Create demo hosts iff missing. Deterministic UUIDs so every fresh DB
  // has the same host ids (useful for fixtures + tests).
  let hostsCreated = 0
  for (const h of HOST_USERS) {
    const existingHost = await findOne<Record<string, unknown>>('users', [
      { field: 'id', operator: '=', value: h.id },
    ])
    if (existingHost) continue
    await create('users', {
      id: h.id,
      email: h.email,
      name: h.name,
      username: h.username,
      planKey: 'free',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    hostsCreated++
  }

  // Demo "guest reviewer" users back seeded reviews so guest_name/photo
  // resolve via the canonical user table. Idempotent on id.
  for (const g of GUEST_REVIEWERS) {
    const existing = await findOne<Record<string, unknown>>('users', [
      { field: 'id', operator: '=', value: g.id },
    ])
    if (existing) continue
    try {
      await create('users', {
        id: g.id,
        email: g.email,
        name: g.name,
        planKey: 'free',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    } catch (_error) {
      // best-effort; if a unique constraint collides it's already seeded
    }
  }

  let listingsCreated = 0
  let reviewsCreated = 0

  for (const l of LISTINGS) {
    const host = HOST_USERS[l.host_index]
    const result = await create<SeededListing>('listings', {
      host_id: host.id,
      user_id: host.id,
      title: l.title,
      description: l.description,
      property_type: l.property_type,
      address: l.address,
      city: l.city,
      state: l.state,
      country: l.country,
      postal_code: l.postal_code,
      latitude: l.latitude,
      longitude: l.longitude,
      max_guests: l.max_guests,
      bedrooms: l.bedrooms,
      beds: l.beds,
      bathrooms: l.bathrooms,
      price_per_night: l.price_per_night,
      cleaning_fee: l.cleaning_fee,
      service_fee_rate: l.service_fee_rate ?? 0.12,
      currency: l.currency,
      images: JSON.stringify(l.images),
      thumbnails: JSON.stringify(l.images.slice(0, 1)),
      amenities: JSON.stringify(l.amenities),
      rating: l.rating,
      reviews_count: l.reviews_count,
      total_bookings: l.total_bookings,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    })
    const listing = (result.data ?? result) as SeededListing
    listingsCreated++

    // Two seed reviews per listing — pick reviewer pairs from the
    // GUEST_REVIEWERS pool deterministically. The (resourceType,
    // resourceId, userId) unique constraint guarantees we don't double
    // up; offsetting the pair by listingsCreated walks through pairs.
    for (let i = 0; i < 2; i++) {
      const fragment = REVIEW_FRAGMENTS[(listingsCreated + i) % REVIEW_FRAGMENTS.length]
      const reviewer = GUEST_REVIEWERS[(listingsCreated * 2 + i) % GUEST_REVIEWERS.length]
      try {
        await create('reviews', {
          resourceType: 'listing',
          resourceId: listing.id,
          userId: reviewer.id,
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

  return { hostsCreated, listingsCreated, reviewsCreated }
}

/**
 * Seed a freshly signed-up user with starter bookmarks, welcome
 * notifications, and a sample message thread so /wishlist,
 * /notifications, and /messages all render with meaningful content.
 * Idempotent on user_id.
 */
export async function seedDemoForUser(userId: string): Promise<{
  bookmarksCreated: number
  notificationsCreated: number
  threadCreated: boolean
}> {
  if (!userId) {
    return { bookmarksCreated: 0, notificationsCreated: 0, threadCreated: false }
  }

  // Ensure listings exist before any per-user seeding can reference them.
  const listings = await findMany<{
    id: string
    title: string
    city: string
    host_id: string
  }>('listings', {
    orderBy: [{ field: 'rating', direction: 'desc' }],
    limit: 8,
  })
  if (listings.length === 0) {
    return { bookmarksCreated: 0, notificationsCreated: 0, threadCreated: false }
  }

  // Skip everything below if the user already has demo content.
  const existingBookmarks = await count('bookmarks', [
    { field: 'userId', operator: '=', value: userId },
  ])
  const existingNotifications = await count('notifications', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existingBookmarks > 0 && existingNotifications > 0) {
    return { bookmarksCreated: 0, notificationsCreated: 0, threadCreated: false }
  }

  let bookmarksCreated = 0
  if (existingBookmarks === 0) {
    for (const l of listings.slice(0, 2)) {
      try {
        await create('bookmarks', {
          userId,
          resourceType: 'listing',
          resourceId: l.id,
          folder: 'Wishlist',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        bookmarksCreated++
      } catch (_error) {
        // Unique (userId, resourceType, resourceId) collision — already saved.
      }
    }
  }

  let notificationsCreated = 0
  if (existingNotifications === 0) {
    const welcome: Array<{
      type: string
      payload: Record<string, unknown>
      offsetMinutes: number
      read?: boolean
    }> = [
      {
        type: 'welcome',
        payload: {
          title: 'Welcome to Roost',
          body: 'Save listings you love and message hosts directly to plan your next trip.',
          icon: 'auto_awesome',
          href: '/search',
        },
        offsetMinutes: 1,
      },
      {
        type: 'price_drop',
        payload: {
          title: `${listings[0].title} dropped its weeknight rate`,
          body: `Your saved stay in ${listings[0].city} is offering a weeknight discount this season.`,
          icon: 'trending_down',
          listing_id: listings[0].id,
          listing_title: listings[0].title,
          href: `/listing/${listings[0].id}`,
        },
        offsetMinutes: 60,
        read: false,
      },
    ]
    if (listings[1]) {
      welcome.push({
        type: 'editor_pick',
        payload: {
          title: `Editor pick: ${listings[1].title}`,
          body: 'Hand-picked by the Roost editorial team this month.',
          icon: 'star',
          listing_id: listings[1].id,
          listing_title: listings[1].title,
          href: `/listing/${listings[1].id}`,
        },
        offsetMinutes: 6 * 60,
        read: true,
      })
    }
    for (const n of welcome) {
      await create('notifications', {
        user_id: userId,
        type: n.type,
        payload: JSON.stringify(n.payload),
        read_at: n.read ? new Date(Date.now() - n.offsetMinutes * 60 * 1000) : null,
        created_at: new Date(Date.now() - n.offsetMinutes * 60 * 1000),
      })
      notificationsCreated++
    }
  }

  // Sample message thread between the new user and the host of their
  // first bookmarked listing. Skip if the user already has a thread.
  let threadCreated = false
  if (bookmarksCreated > 0) {
    const allThreads = await findMany<Record<string, unknown>>('message_threads', {
      where: [{ field: 'participant_a_id', operator: '=', value: userId }],
      limit: 50,
    })
    const allThreadsB = await findMany<Record<string, unknown>>('message_threads', {
      where: [{ field: 'participant_b_id', operator: '=', value: userId }],
      limit: 50,
    })
    if (allThreads.length === 0 && allThreadsB.length === 0) {
      const l = listings[0]
      const [pa, pb] = [userId, l.host_id].sort()
      const threadResult = await create<Record<string, unknown>>('message_threads', {
        participant_a_id: pa,
        participant_b_id: pb,
        participant_id: userId,
        user_id: userId,
        listing_id: l.id,
        last_message_at: new Date(),
        last_message_preview: `Hey — thanks for saving ${l.title}.`,
        created_at: new Date(),
      })
      const thread = (threadResult.data ?? threadResult) as Record<string, unknown>
      const threadId = String(thread.id)
      // Welcome message from the host.
      await create('messages', {
        thread_id: threadId,
        sender_id: l.host_id,
        user_id: l.host_id,
        body: `Hey — thanks for saving ${l.title}. Let me know if you have questions; I'm in ${l.city} most weeks.`,
        created_at: new Date(Date.now() - 30 * 60 * 1000),
      })
      threadCreated = true
    }
  }

  return { bookmarksCreated, notificationsCreated, threadCreated }
}

export const SEED_HOST_USER_IDS = HOST_USERS.map((h) => h.id)
