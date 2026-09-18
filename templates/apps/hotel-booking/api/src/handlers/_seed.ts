/**
 * Demo seed for hotel-booking.
 *
 * Two layers:
 *
 * 1. **Globals** (`seedGlobalCatalogIfEmpty`) — hotels, rooms, and a
 *    handful of reviews so /search and /property/:id render real data.
 *    Idempotent: skipped if any hotel row already exists.
 *
 * 2. **Per-user** (`seedDemoForUser`) — a starter loyalty row + a couple
 *    of notifications so a freshly signed-up user lands on /account and
 *    /notifications with content. Idempotent on user_id.
 *
 * @module
 */

import { count, create, findMany, findOne } from '@molecule/api-database'

interface SeededHotel {
  id: string
  city: string
}

interface SeededRoom {
  id: string
  hotel_id: string
  rate: number
}

const HOTELS: ReadonlyArray<{
  name: string
  slug: string
  city: string
  country: string
  address: string
  latitude: number
  longitude: number
  description: string
  rating: number
  review_count: number
  stars: number
  min_rate: number
  thumbnail_url: string
  gallery: string[]
  amenities: string[]
  badges: string[]
  rooms: ReadonlyArray<{
    name: string
    description: string
    capacity: number
    rate: number
    resort_fee: number
    thumbnail_url: string
    total_rooms: number
  }>
}> = [
  {
    name: 'The Aoyama Garden',
    slug: 'aoyama-garden-tokyo',
    city: 'Tokyo',
    country: 'Japan',
    address: '5-1 Aoyama, Minato, Tokyo 107-0061',
    latitude: 35.6663,
    longitude: 139.7174,
    description:
      'A boutique 24-room ryokan tucked behind Aoyama’s back streets. Cedar onsen, kaiseki dinners, and a quiet inner garden you can hear at night.',
    rating: 4.9,
    review_count: 412,
    stars: 5,
    min_rate: 38900,
    thumbnail_url: 'https://picsum.photos/seed/sojourn-h1/1200/900',
    gallery: [
      'https://picsum.photos/seed/sojourn-h1a/1600/1000',
      'https://picsum.photos/seed/sojourn-h1b/1200/900',
      'https://picsum.photos/seed/sojourn-h1c/1200/900',
      'https://picsum.photos/seed/sojourn-h1d/1200/900',
      'https://picsum.photos/seed/sojourn-h1e/1200/900',
    ],
    amenities: ['Onsen', 'Kaiseki dining', 'Concierge', 'Free Wi-Fi', 'Spa'],
    badges: ['editor_pick', 'rare_find'],
    rooms: [
      {
        name: 'Garden Tatami Suite',
        description: 'Tatami-floored suite with a private engawa overlooking the inner garden.',
        capacity: 2,
        rate: 38900,
        resort_fee: 1500,
        thumbnail_url: 'https://picsum.photos/seed/sojourn-h1-r1/800/600',
        total_rooms: 4,
      },
      {
        name: 'Cedar Onsen Loft',
        description: 'Loft suite with a private cedar soaking tub and city skyline view.',
        capacity: 2,
        rate: 52900,
        resort_fee: 1500,
        thumbnail_url: 'https://picsum.photos/seed/sojourn-h1-r2/800/600',
        total_rooms: 2,
      },
    ],
  },
  {
    name: 'Casa Pastel Lisboa',
    slug: 'casa-pastel-lisboa',
    city: 'Lisbon',
    country: 'Portugal',
    address: 'R. das Flores 22, 1200-194 Lisboa',
    latitude: 38.7115,
    longitude: -9.1418,
    description:
      'A pastel-tiled townhouse in Bairro Alto, restored room by room. Rooftop pool, a six-seat bakery counter, and morning pastéis warm to the touch.',
    rating: 4.7,
    review_count: 318,
    stars: 4,
    min_rate: 22900,
    thumbnail_url: 'https://picsum.photos/seed/sojourn-h2/1200/900',
    gallery: [
      'https://picsum.photos/seed/sojourn-h2a/1600/1000',
      'https://picsum.photos/seed/sojourn-h2b/1200/900',
      'https://picsum.photos/seed/sojourn-h2c/1200/900',
      'https://picsum.photos/seed/sojourn-h2d/1200/900',
      'https://picsum.photos/seed/sojourn-h2e/1200/900',
    ],
    amenities: ['Pool', 'Restaurant', 'Free Wi-Fi', 'Concierge', 'Pet friendly'],
    badges: ['trending'],
    rooms: [
      {
        name: 'Tiled Atelier',
        description: 'Studio with hand-glazed tile bath and french doors to the morning sun.',
        capacity: 2,
        rate: 22900,
        resort_fee: 0,
        thumbnail_url: 'https://picsum.photos/seed/sojourn-h2-r1/800/600',
        total_rooms: 6,
      },
      {
        name: 'Rooftop Garden Suite',
        description: 'One-bedroom suite with private rooftop terrace and outdoor shower.',
        capacity: 4,
        rate: 41900,
        resort_fee: 0,
        thumbnail_url: 'https://picsum.photos/seed/sojourn-h2-r2/800/600',
        total_rooms: 2,
      },
    ],
  },
  {
    name: 'Villa Lago Como',
    slug: 'villa-lago-como',
    city: 'Bellagio',
    country: 'Italy',
    address: 'Via Roma 8, 22021 Bellagio CO',
    latitude: 45.987,
    longitude: 9.2615,
    description:
      'A 19th-century lakefront villa with private dock, terraced gardens, and a wood-fired breakfast room that opens onto the water at dawn.',
    rating: 4.9,
    review_count: 156,
    stars: 5,
    min_rate: 78900,
    thumbnail_url: 'https://picsum.photos/seed/sojourn-h3/1200/900',
    gallery: [
      'https://picsum.photos/seed/sojourn-h3a/1600/1000',
      'https://picsum.photos/seed/sojourn-h3b/1200/900',
      'https://picsum.photos/seed/sojourn-h3c/1200/900',
      'https://picsum.photos/seed/sojourn-h3d/1200/900',
      'https://picsum.photos/seed/sojourn-h3e/1200/900',
    ],
    amenities: ['Lake access', 'Private dock', 'Gardens', 'Restaurant', 'Concierge'],
    badges: ['editor_pick'],
    rooms: [
      {
        name: 'Lake Suite',
        description: 'Corner suite with floor-to-ceiling windows over Lake Como.',
        capacity: 2,
        rate: 78900,
        resort_fee: 3500,
        thumbnail_url: 'https://picsum.photos/seed/sojourn-h3-r1/800/600',
        total_rooms: 3,
      },
      {
        name: 'Dock-house Hideaway',
        description: 'Private one-bedroom dock-house with its own boat slip.',
        capacity: 2,
        rate: 119000,
        resort_fee: 3500,
        thumbnail_url: 'https://picsum.photos/seed/sojourn-h3-r2/800/600',
        total_rooms: 1,
      },
    ],
  },
  {
    name: 'Riad Marrakech',
    slug: 'riad-marrakech',
    city: 'Marrakech',
    country: 'Morocco',
    address: '17 Derb Sidi Bouloukat, Marrakech 40000',
    latitude: 31.6258,
    longitude: -7.9892,
    description:
      'A nine-suite riad inside the medina walls. Hammam, a citrus courtyard, and a rooftop where dinner is served with the call to prayer.',
    rating: 4.7,
    review_count: 523,
    stars: 4,
    min_rate: 18900,
    thumbnail_url: 'https://picsum.photos/seed/sojourn-h4/1200/900',
    gallery: [
      'https://picsum.photos/seed/sojourn-h4a/1600/1000',
      'https://picsum.photos/seed/sojourn-h4b/1200/900',
      'https://picsum.photos/seed/sojourn-h4c/1200/900',
      'https://picsum.photos/seed/sojourn-h4d/1200/900',
      'https://picsum.photos/seed/sojourn-h4e/1200/900',
    ],
    amenities: ['Hammam', 'Rooftop terrace', 'Restaurant', 'Free Wi-Fi'],
    badges: ['new'],
    rooms: [
      {
        name: 'Courtyard Room',
        description: 'Tadelakt-walled room overlooking the citrus courtyard.',
        capacity: 2,
        rate: 18900,
        resort_fee: 0,
        thumbnail_url: 'https://picsum.photos/seed/sojourn-h4-r1/800/600',
        total_rooms: 5,
      },
      {
        name: 'Rooftop Suite',
        description: 'Two-room suite with a private rooftop terrace and plunge pool.',
        capacity: 3,
        rate: 31900,
        resort_fee: 0,
        thumbnail_url: 'https://picsum.photos/seed/sojourn-h4-r2/800/600',
        total_rooms: 2,
      },
    ],
  },
  {
    name: 'Mountain House Banff',
    slug: 'mountain-house-banff',
    city: 'Banff',
    country: 'Canada',
    address: '404 Tunnel Mountain Rd, Banff, AB T1L 1J3',
    latitude: 51.1879,
    longitude: -115.5547,
    description:
      'A timber lodge above the Bow Valley with hot tubs cut into the deck and a wood-fire breakfast served at the long table.',
    rating: 4.8,
    review_count: 274,
    stars: 4,
    min_rate: 32400,
    thumbnail_url: 'https://picsum.photos/seed/sojourn-h5/1200/900',
    gallery: [
      'https://picsum.photos/seed/sojourn-h5a/1600/1000',
      'https://picsum.photos/seed/sojourn-h5b/1200/900',
      'https://picsum.photos/seed/sojourn-h5c/1200/900',
      'https://picsum.photos/seed/sojourn-h5d/1200/900',
      'https://picsum.photos/seed/sojourn-h5e/1200/900',
    ],
    amenities: ['Sauna', 'Hiking trails', 'Fireplace', 'Free Wi-Fi', 'Breakfast included'],
    badges: ['trending'],
    rooms: [
      {
        name: 'Valley View King',
        description: 'Corner king with floor-to-ceiling windows over the Bow Valley.',
        capacity: 2,
        rate: 32400,
        resort_fee: 1200,
        thumbnail_url: 'https://picsum.photos/seed/sojourn-h5-r1/800/600',
        total_rooms: 6,
      },
      {
        name: 'Larch Family Suite',
        description: 'Two-bedroom suite sleeping four with private wood-stove and deck.',
        capacity: 4,
        rate: 49800,
        resort_fee: 1200,
        thumbnail_url: 'https://picsum.photos/seed/sojourn-h5-r2/800/600',
        total_rooms: 3,
      },
    ],
  },
  {
    name: 'Old Town Reykjavík',
    slug: 'old-town-reykjavik',
    city: 'Reykjavík',
    country: 'Iceland',
    address: 'Aðalstræti 12, 101 Reykjavík',
    latitude: 64.1466,
    longitude: -21.9426,
    description:
      'A small hotel inside one of the oldest houses in Reykjavík: heated stone floors, a basement geothermal pool, and a chef who does only one tasting menu a night.',
    rating: 4.6,
    review_count: 198,
    stars: 4,
    min_rate: 27800,
    thumbnail_url: 'https://picsum.photos/seed/sojourn-h6/1200/900',
    gallery: [
      'https://picsum.photos/seed/sojourn-h6a/1600/1000',
      'https://picsum.photos/seed/sojourn-h6b/1200/900',
      'https://picsum.photos/seed/sojourn-h6c/1200/900',
      'https://picsum.photos/seed/sojourn-h6d/1200/900',
      'https://picsum.photos/seed/sojourn-h6e/1200/900',
    ],
    amenities: ['Pool', 'Restaurant', 'Spa', 'Free Wi-Fi', 'Concierge'],
    badges: ['editor_pick'],
    rooms: [
      {
        name: 'Geothermal Studio',
        description: 'Studio with private dressing room and access to the geothermal pool.',
        capacity: 2,
        rate: 27800,
        resort_fee: 1800,
        thumbnail_url: 'https://picsum.photos/seed/sojourn-h6-r1/800/600',
        total_rooms: 5,
      },
    ],
  },
]

const REVIEW_FRAGMENTS = [
  {
    rating: 5,
    title: 'Perfect long weekend',
    body: 'Quiet, beautifully restored, the staff remembered my name by the second morning. Already booking the off-season return.',
  },
  {
    rating: 5,
    title: 'Better than the photos',
    body: 'The thing the gallery doesn’t capture is how peaceful the inner courtyard is at sunrise. Worth every cent.',
  },
  {
    rating: 4,
    title: 'Lovely stay, a few quirks',
    body: 'Walls were a little thin between rooms, but the breakfast and the location more than made up for it. Would absolutely return.',
  },
  {
    rating: 5,
    title: 'Romantic and slow',
    body: 'Spent four nights and never wanted to leave the property. The kitchen will plate a private dinner anywhere — we ate on the dock at sunset two nights running.',
  },
]

/**
 * Seed the hotel catalog (hotels + rooms + a few reviews) if the
 * `hotels` table is empty. Idempotent.
 */
export async function seedGlobalCatalogIfEmpty(): Promise<{
  hotelsCreated: number
  roomsCreated: number
  reviewsCreated: number
}> {
  const existing = await count('hotels', [])
  if (existing > 0) {
    return { hotelsCreated: 0, roomsCreated: 0, reviewsCreated: 0 }
  }

  let hotelsCreated = 0
  let roomsCreated = 0
  let reviewsCreated = 0

  for (const h of HOTELS) {
    const hotelRow = await create<SeededHotel>('hotels', {
      name: h.name,
      slug: h.slug,
      city: h.city,
      country: h.country,
      address: h.address,
      latitude: h.latitude,
      longitude: h.longitude,
      description: h.description,
      rating: h.rating,
      review_count: h.review_count,
      stars: h.stars,
      min_rate: h.min_rate,
      thumbnail_url: h.thumbnail_url,
      gallery: JSON.stringify(h.gallery),
      amenities: JSON.stringify(h.amenities),
      badges: JSON.stringify(h.badges),
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    })
    const hotel = (hotelRow.data ?? hotelRow) as SeededHotel
    hotelsCreated++

    for (const r of h.rooms) {
      await create<SeededRoom>('rooms', {
        hotel_id: hotel.id,
        name: r.name,
        description: r.description,
        capacity: r.capacity,
        rate: r.rate,
        resort_fee: r.resort_fee,
        thumbnail_url: r.thumbnail_url,
        total_rooms: r.total_rooms,
        status: 'available',
        created_at: new Date(),
        updated_at: new Date(),
      })
      roomsCreated++
    }

    // Two seed reviews per hotel — anonymous resourceType=hotel rows. The
    // userId we use is a stable placeholder UUID; per-user review POSTs
    // bind to the real session userId so duplicate-check is unaffected.
    for (let i = 0; i < 2; i++) {
      const fragment = REVIEW_FRAGMENTS[(hotelsCreated + i) % REVIEW_FRAGMENTS.length]
      const placeholderUserId = `00000000-0000-0000-0000-${String(hotelsCreated * 10 + i).padStart(12, '0')}`
      try {
        await create('reviews', {
          resourceType: 'hotel',
          resourceId: hotel.id,
          userId: placeholderUserId,
          rating: fragment.rating,
          title: fragment.title,
          body: fragment.body,
        })
        reviewsCreated++
      } catch (_error) {
        // Unique constraint on (resourceType, resourceId, userId) — skip if
        // we somehow re-seeded with overlapping placeholder IDs.
      }
    }
  }

  return { hotelsCreated, roomsCreated, reviewsCreated }
}

/**
 * Seed a freshly signed-up user with a starter loyalty row + a couple
 * of welcome notifications so /account and /notifications render with
 * meaningful content. Idempotent on user_id.
 */
export async function seedDemoForUser(userId: string): Promise<{
  loyaltyCreated: boolean
  notificationsCreated: number
}> {
  if (!userId) return { loyaltyCreated: false, notificationsCreated: 0 }

  const year = new Date().getFullYear()
  let loyaltyCreated = false
  const existingLoyalty = await findOne<Record<string, unknown>>('loyalty', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'year', operator: '=', value: year },
  ])
  if (!existingLoyalty) {
    await create('loyalty', {
      user_id: userId,
      tier: 'silver',
      points: 4280,
      nights_count: 6,
      year_to_date_spend_cents: 187_500,
      year,
    })
    loyaltyCreated = true
  }

  let notificationsCreated = 0
  const existingNotifications = await count('notifications', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existingNotifications === 0) {
    const someHotels = await findMany<{ id: string; name: string; city: string }>('hotels', {
      orderBy: [{ field: 'rating', direction: 'desc' }],
      limit: 3,
    })
    const welcome: Array<{
      type: string
      title: string
      body: string
      href: string | null
      offsetMinutes: number
    }> = [
      {
        type: 'loyalty_milestone',
        title: 'Welcome to Auberge',
        body: 'Your free Silver loyalty tier is ready. Earn 1 point per dollar on every stay.',
        href: '/account',
        offsetMinutes: 1,
      },
    ]
    if (someHotels[0]) {
      welcome.push({
        type: 'price_drop',
        title: 'Price drop near you',
        body: `${someHotels[0].name} in ${someHotels[0].city} just dropped to a members-only rate.`,
        href: `/property/${someHotels[0].id}`,
        offsetMinutes: 60,
      })
    }
    if (someHotels[1]) {
      welcome.push({
        type: 'trip_reminder',
        title: 'A stay you saved is in season',
        body: `Auberge picks like ${someHotels[1].name} are at their best this month.`,
        href: `/property/${someHotels[1].id}`,
        offsetMinutes: 6 * 60,
      })
    }

    for (const n of welcome) {
      await create('notifications', {
        user_id: userId,
        type: n.type,
        title: n.title,
        body: n.body,
        href: n.href,
        read: false,
        created_at: new Date(Date.now() - n.offsetMinutes * 60 * 1000),
      })
      notificationsCreated++
    }
  }

  return { loyaltyCreated, notificationsCreated }
}
