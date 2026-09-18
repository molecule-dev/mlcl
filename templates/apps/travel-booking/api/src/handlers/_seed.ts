/**
 * Demo seed for travel-booking (Sojourn).
 *
 * Seeds the public catalog (destinations, properties, room_types, reviews)
 * if the `properties` table is empty. Idempotent: skipped once any property
 * row exists, so safe to re-run on every boot. Listing endpoints
 * (`/search`, `/property/:id`, `/booking/:id`) need rows to render real
 * data for the demo UI and e2e tests.
 *
 * @module
 */

import { count, create } from '@molecule/api-database'

interface SeedDestination {
  id: string
  slug: string
  name: string
  country: string
  region?: string | null
  blurb?: string | null
  hero_image_url?: string | null
  latitude?: number | null
  longitude?: number | null
  popularity_score?: number
  featured?: boolean
}

interface SeedProperty {
  id: string
  destination_id: string
  slug: string
  name: string
  kind: string
  city: string
  country: string
  address: string
  latitude: number
  longitude: number
  description: string
  rating: number
  review_count: number
  price_per_night_cents: number
  thumbnail_url: string
  gallery: string[]
  amenities: string[]
  badges: string[]
}

interface SeedRoomType {
  id: string
  property_id: string
  name: string
  description: string
  capacity: number
  price_per_night_cents: number
  thumbnail_url: string
  total_rooms: number
}

interface SeedReview {
  property_id: string
  user_pseudonym: string
  rating: number
  title: string
  body: string
}

const DESTINATIONS: SeedDestination[] = [
  {
    id: '11111111-1111-4111-8111-000000000001',
    slug: 'oaxaca',
    name: 'Oaxaca',
    country: 'Mexico',
    region: 'Oaxaca',
    blurb: 'Mezcal villages, cloud forests, and craft markets.',
    hero_image_url: 'https://picsum.photos/seed/sojourn-dest-oaxaca/1200/800',
    latitude: 17.0732,
    longitude: -96.7266,
    popularity_score: 90,
    featured: true,
  },
  {
    id: '11111111-1111-4111-8111-000000000002',
    slug: 'tuscany',
    name: 'Tuscany',
    country: 'Italy',
    region: 'Toscana',
    blurb: 'Hilltop villages, vineyard cellars, and golden hours.',
    hero_image_url: 'https://picsum.photos/seed/sojourn-dest-tuscany/1200/800',
    latitude: 43.7711,
    longitude: 11.2486,
    popularity_score: 95,
    featured: true,
  },
  {
    id: '11111111-1111-4111-8111-000000000003',
    slug: 'faroe-islands',
    name: 'Faroe Islands',
    country: 'Faroe Islands',
    region: null,
    blurb: 'Sea cliffs, grass-roofed lodges, and storm-watching season.',
    hero_image_url: 'https://picsum.photos/seed/sojourn-dest-faroe/1200/800',
    latitude: 62.0079,
    longitude: -6.79,
    popularity_score: 70,
    featured: true,
  },
  {
    id: '11111111-1111-4111-8111-000000000004',
    slug: 'banff',
    name: 'Banff',
    country: 'Canada',
    region: 'Alberta',
    blurb: 'Glacier basins, wildlife corridors, and quiet trail towns.',
    hero_image_url: 'https://picsum.photos/seed/sojourn-dest-banff/1200/800',
    latitude: 51.4968,
    longitude: -115.9281,
    popularity_score: 85,
    featured: true,
  },
  {
    id: '11111111-1111-4111-8111-000000000005',
    slug: 'yufuin',
    name: 'Yufuin',
    country: 'Japan',
    region: 'Oita',
    blurb: 'Onsen valleys, ryokan rituals, and mountain breakfasts.',
    hero_image_url: 'https://picsum.photos/seed/sojourn-dest-yufuin/1200/800',
    latitude: 33.2667,
    longitude: 131.35,
    popularity_score: 80,
    featured: false,
  },
  {
    id: '11111111-1111-4111-8111-000000000006',
    slug: 'mendoza',
    name: 'Mendoza',
    country: 'Argentina',
    region: 'Cuyo',
    blurb: 'High-altitude vineyards under Andes shadow.',
    hero_image_url: 'https://picsum.photos/seed/sojourn-dest-mendoza/1200/800',
    latitude: -32.8908,
    longitude: -68.8272,
    popularity_score: 65,
    featured: false,
  },
  {
    id: '11111111-1111-4111-8111-000000000007',
    slug: 'cinque-terre',
    name: 'Cinque Terre',
    country: 'Italy',
    region: 'Liguria',
    blurb: 'Cliffside villages strung above the Ligurian Sea.',
    hero_image_url: 'https://picsum.photos/seed/sojourn-dest-cinque/1200/800',
    latitude: 44.1265,
    longitude: 9.71,
    popularity_score: 88,
    featured: true,
  },
  {
    id: '11111111-1111-4111-8111-000000000008',
    slug: 'lofoten',
    name: 'Lofoten',
    country: 'Norway',
    region: 'Nordland',
    blurb: 'Aurora skies, fjord crossings, and red rorbu cabins.',
    hero_image_url: 'https://picsum.photos/seed/sojourn-dest-lofoten/1200/800',
    latitude: 68.1102,
    longitude: 13.6839,
    popularity_score: 75,
    featured: false,
  },
]

const PROPERTIES: SeedProperty[] = [
  {
    id: '22222222-2222-4222-8222-000000000001',
    destination_id: DESTINATIONS[0].id,
    slug: 'casa-mirador-oaxaca',
    name: 'Casa Mirador Oaxaca',
    kind: 'villa',
    city: 'Oaxaca',
    country: 'Mexico',
    address: 'Camino al Mirador 21, San Felipe, Oaxaca',
    latitude: 17.1059,
    longitude: -96.725,
    description:
      'A four-bedroom hillside villa with three terraces, a mezcal cellar, and panoramic city views.',
    rating: 4.9,
    review_count: 348,
    price_per_night_cents: 26900,
    thumbnail_url: 'https://picsum.photos/seed/sojourn-tb-p1/800/600',
    gallery: [
      'https://picsum.photos/seed/sojourn-tb-p1-a/1600/1000',
      'https://picsum.photos/seed/sojourn-tb-p1-b/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p1-c/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p1-d/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p1-e/1200/800',
    ],
    amenities: ['Pool', 'Mezcal cellar', 'Garden', 'Free Wi-Fi', 'Concierge', 'Pet friendly'],
    badges: ['Sojourn-verified', 'Host favorite'],
  },
  {
    id: '22222222-2222-4222-8222-000000000002',
    destination_id: DESTINATIONS[1].id,
    slug: 'la-tenuta-bellavista',
    name: 'La Tenuta Bellavista',
    kind: 'agriturismo',
    city: 'Montalcino',
    country: 'Italy',
    address: 'Strada di Bellavista 7, Montalcino, Tuscany',
    latitude: 43.0567,
    longitude: 11.4906,
    description:
      'A working agriturismo on 14 hectares of Sangiovese vines. Stone-floored suites with copper tubs.',
    rating: 4.9,
    review_count: 421,
    price_per_night_cents: 31900,
    thumbnail_url: 'https://picsum.photos/seed/sojourn-tb-p2/800/600',
    gallery: [
      'https://picsum.photos/seed/sojourn-tb-p2-a/1600/1000',
      'https://picsum.photos/seed/sojourn-tb-p2-b/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p2-c/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p2-d/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p2-e/1200/800',
    ],
    amenities: ['Pool', 'Wine cellar', 'Restaurant', 'Bicycles', 'Vineyard tours', 'Free Wi-Fi'],
    badges: ['Sojourn-verified', 'Top rated'],
  },
  {
    id: '22222222-2222-4222-8222-000000000003',
    destination_id: DESTINATIONS[2].id,
    slug: 'the-faroe-hideaway',
    name: 'The Faroe Hideaway',
    kind: 'cabin',
    city: 'Tórshavn',
    country: 'Faroe Islands',
    address: 'Heimavegur 12, Tórshavn',
    latitude: 62.0078,
    longitude: -6.79,
    description: 'A grass-roofed two-bedroom cabin perched above Tórshavn harbor.',
    rating: 4.9,
    review_count: 142,
    price_per_night_cents: 41200,
    thumbnail_url: 'https://picsum.photos/seed/sojourn-tb-p3/800/600',
    gallery: [
      'https://picsum.photos/seed/sojourn-tb-p3-a/1600/1000',
      'https://picsum.photos/seed/sojourn-tb-p3-b/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p3-c/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p3-d/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p3-e/1200/800',
    ],
    amenities: ['Hot tub', 'Sauna', 'Sea access', 'Fireplace', 'Free Wi-Fi'],
    badges: ['Storm-season special', 'Sojourn-verified'],
  },
  {
    id: '22222222-2222-4222-8222-000000000004',
    destination_id: DESTINATIONS[3].id,
    slug: 'whitecap-wilderness-camp',
    name: 'Whitecap Wilderness Camp',
    kind: 'lodge',
    city: 'Banff',
    country: 'Canada',
    address: '1900 Sundance Road, Banff National Park',
    latitude: 51.165,
    longitude: -115.5708,
    description: 'A four-cabin alpine lodge inside Banff National Park.',
    rating: 4.8,
    review_count: 263,
    price_per_night_cents: 36400,
    thumbnail_url: 'https://picsum.photos/seed/sojourn-tb-p4/800/600',
    gallery: [
      'https://picsum.photos/seed/sojourn-tb-p4-a/1600/1000',
      'https://picsum.photos/seed/sojourn-tb-p4-b/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p4-c/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p4-d/1200/800',
    ],
    amenities: ['Plunge pool', 'Hiking trails', 'Wildlife tours', 'Fireplace', 'Stargazing'],
    badges: ['Adventure-ready', 'Sojourn-verified'],
  },
  {
    id: '22222222-2222-4222-8222-000000000005',
    destination_id: DESTINATIONS[4].id,
    slug: 'ryokan-yufuin',
    name: 'Ryokan Yufuin',
    kind: 'ryokan',
    city: 'Yufuin',
    country: 'Japan',
    address: '4 Yufuin Onsen, Oita 879-5102',
    latitude: 33.268,
    longitude: 131.3614,
    description: 'A traditional eight-room ryokan with private onsen baths and kaiseki dinner.',
    rating: 4.9,
    review_count: 218,
    price_per_night_cents: 51800,
    thumbnail_url: 'https://picsum.photos/seed/sojourn-tb-p5/800/600',
    gallery: [
      'https://picsum.photos/seed/sojourn-tb-p5-a/1600/1000',
      'https://picsum.photos/seed/sojourn-tb-p5-b/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p5-c/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p5-d/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p5-e/1200/800',
    ],
    amenities: ['Onsen', 'Kaiseki dining', 'Garden', 'Tea house', 'Free Wi-Fi'],
    badges: ['Sojourn-verified', 'Member-only rate'],
  },
  {
    id: '22222222-2222-4222-8222-000000000006',
    destination_id: DESTINATIONS[5].id,
    slug: 'finca-altavista-mendoza',
    name: 'Finca Altavista Mendoza',
    kind: 'finca',
    city: 'Luján de Cuyo',
    country: 'Argentina',
    address: 'RP15 Km 4, Luján de Cuyo, Mendoza',
    latitude: -33.018,
    longitude: -68.91,
    description: 'A high-altitude Malbec finca with horseback rides between vine rows.',
    rating: 4.7,
    review_count: 189,
    price_per_night_cents: 22500,
    thumbnail_url: 'https://picsum.photos/seed/sojourn-tb-p6/800/600',
    gallery: [
      'https://picsum.photos/seed/sojourn-tb-p6-a/1600/1000',
      'https://picsum.photos/seed/sojourn-tb-p6-b/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p6-c/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p6-d/1200/800',
    ],
    amenities: ['Pool', 'Horseback riding', 'Wine cellar', 'Vineyard tours', 'All-inclusive'],
    badges: ['Sojourn-verified'],
  },
  {
    id: '22222222-2222-4222-8222-000000000007',
    destination_id: DESTINATIONS[6].id,
    slug: 'lighthouse-suites-cinque-terre',
    name: 'Lighthouse Suites Cinque Terre',
    kind: 'boutique-hotel',
    city: 'Vernazza',
    country: 'Italy',
    address: 'Via del Faro 1, Vernazza, Liguria',
    latitude: 44.1359,
    longitude: 9.6852,
    description: 'A six-suite boutique hotel inside a restored 18th-century lighthouse.',
    rating: 4.8,
    review_count: 305,
    price_per_night_cents: 38900,
    thumbnail_url: 'https://picsum.photos/seed/sojourn-tb-p7/800/600',
    gallery: [
      'https://picsum.photos/seed/sojourn-tb-p7-a/1600/1000',
      'https://picsum.photos/seed/sojourn-tb-p7-b/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p7-c/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p7-d/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p7-e/1200/800',
    ],
    amenities: [
      'Rooftop terrace',
      'Sea kayaks',
      'Restaurant',
      'Sea access',
      'Air conditioning',
      'Free Wi-Fi',
    ],
    badges: ['Sojourn-verified', 'Top rated'],
  },
  {
    id: '22222222-2222-4222-8222-000000000008',
    destination_id: DESTINATIONS[7].id,
    slug: 'aurora-rorbu-lofoten',
    name: 'Aurora Rorbu Lofoten',
    kind: 'cabin',
    city: 'Reine',
    country: 'Norway',
    address: 'Rorbuvegen 9, Reine, Lofoten',
    latitude: 67.9333,
    longitude: 13.0833,
    description:
      'A traditional red rorbu cabin on stilts above the fjord. Aurora viewing from the hot tub.',
    rating: 4.8,
    review_count: 197,
    price_per_night_cents: 33700,
    thumbnail_url: 'https://picsum.photos/seed/sojourn-tb-p8/800/600',
    gallery: [
      'https://picsum.photos/seed/sojourn-tb-p8-a/1600/1000',
      'https://picsum.photos/seed/sojourn-tb-p8-b/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p8-c/1200/800',
      'https://picsum.photos/seed/sojourn-tb-p8-d/1200/800',
    ],
    amenities: ['Hot tub', 'Sauna', 'Aurora viewing', 'Sea access', 'Fireplace'],
    badges: ['Aurora season', 'Sojourn-verified'],
  },
]

const ROOM_TYPES: SeedRoomType[] = PROPERTIES.flatMap((p, idx) => {
  // Two distinct UUIDs per property: ...8333-0000000000N1 and ...0000000000N2
  const tail = String(idx + 1).padStart(11, '0')
  return [
    {
      id: `33333333-3333-4333-8333-${tail}1`,
      property_id: p.id,
      name: 'Standard suite',
      description: 'Sleeps 2 in a king bed with private bath. Garden or city view.',
      capacity: 2,
      price_per_night_cents: p.price_per_night_cents,
      thumbnail_url: p.gallery[1] ?? p.thumbnail_url,
      total_rooms: 4,
    },
    {
      id: `33333333-3333-4333-8333-${tail}2`,
      property_id: p.id,
      name: 'Premium suite',
      description: 'Sleeps 4 with a king bed plus a sofa-bed and private terrace.',
      capacity: 4,
      price_per_night_cents: Math.round(p.price_per_night_cents * 1.45),
      thumbnail_url: p.gallery[2] ?? p.thumbnail_url,
      total_rooms: 2,
    },
  ]
})

const REVIEWS: SeedReview[] = [
  {
    property_id: PROPERTIES[0].id,
    user_pseudonym: 'Maya K.',
    rating: 5,
    title: 'Sunset hour from the highest terrace',
    body: 'Watching the sunset from the highest terrace was the most memorable hour of our trip.',
  },
  {
    property_id: PROPERTIES[0].id,
    user_pseudonym: 'Tomás S.',
    rating: 5,
    title: 'Cloud-forest hide-out',
    body: 'Tucked into the cloud forest. The mezcal cellar evening alone was worth the trip.',
  },
  {
    property_id: PROPERTIES[1].id,
    user_pseudonym: 'Amelia R.',
    rating: 5,
    title: 'Vineyard afternoons',
    body: 'We spent every afternoon riding bicycles between the vineyards.',
  },
  {
    property_id: PROPERTIES[1].id,
    user_pseudonym: 'Pietro M.',
    rating: 4,
    title: 'Quietly perfect',
    body: 'Stone-floored suites stayed cool in the afternoons.',
  },
  {
    property_id: PROPERTIES[2].id,
    user_pseudonym: 'Henrik L.',
    rating: 5,
    title: 'Aurora wake-up at 02:14',
    body: 'Aurora wake-up at 02:14. We watched it from the hot tub for an hour.',
  },
  {
    property_id: PROPERTIES[2].id,
    user_pseudonym: 'Eira J.',
    rating: 5,
    title: 'Storm-watching season magic',
    body: 'Five days of high winds and wild seas, all watched from the wood-stove window.',
  },
  {
    property_id: PROPERTIES[3].id,
    user_pseudonym: 'Owen W.',
    rating: 5,
    title: 'Wildlife corridor breakfasts',
    body: 'Watched a moose family at sunrise from the breakfast porch.',
  },
  {
    property_id: PROPERTIES[4].id,
    user_pseudonym: 'Hana A.',
    rating: 5,
    title: 'Slow mornings, careful service',
    body: 'Every kaiseki course was thoughtful.',
  },
  {
    property_id: PROPERTIES[5].id,
    user_pseudonym: 'Lucía F.',
    rating: 4,
    title: 'Rooftop stargazing under the Andes',
    body: 'Open-fire asado, then rooftop stargazing.',
  },
  {
    property_id: PROPERTIES[6].id,
    user_pseudonym: 'Chiara V.',
    rating: 5,
    title: 'Sunrise rowing from the lighthouse',
    body: 'Took a sea kayak out at sunrise from below the lighthouse.',
  },
  {
    property_id: PROPERTIES[6].id,
    user_pseudonym: 'Marco T.',
    rating: 5,
    title: 'Rooftop terrace at golden hour',
    body: 'Cliffside, candlelit, with the sea below.',
  },
  {
    property_id: PROPERTIES[7].id,
    user_pseudonym: 'Inga K.',
    rating: 5,
    title: 'Aurora season delivered',
    body: 'Aurora three of five nights. Sauna, hot tub, fjord.',
  },
]

/**
 * Seed the public catalog (destinations, properties, room_types, reviews)
 * if the `properties` table is empty. Idempotent.
 */
export async function seedGlobalCatalogIfEmpty(): Promise<{
  destinationsCreated: number
  propertiesCreated: number
  roomTypesCreated: number
  reviewsCreated: number
}> {
  const existing = await count('properties', [])
  if (existing > 0) {
    return { destinationsCreated: 0, propertiesCreated: 0, roomTypesCreated: 0, reviewsCreated: 0 }
  }

  let destinationsCreated = 0
  for (const d of DESTINATIONS) {
    try {
      await create('destinations', {
        id: d.id,
        slug: d.slug,
        name: d.name,
        country: d.country,
        region: d.region ?? null,
        blurb: d.blurb ?? null,
        hero_image_url: d.hero_image_url ?? null,
        latitude: d.latitude ?? null,
        longitude: d.longitude ?? null,
        popularity_score: d.popularity_score ?? 0,
        featured: d.featured ?? false,
      })
      destinationsCreated++
    } catch (_error) {
      // Unique constraint collision — skip.
    }
  }

  let propertiesCreated = 0
  for (const p of PROPERTIES) {
    try {
      await create('properties', {
        id: p.id,
        destination_id: p.destination_id,
        slug: p.slug,
        name: p.name,
        kind: p.kind,
        city: p.city,
        country: p.country,
        address: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        description: p.description,
        rating: p.rating,
        review_count: p.review_count,
        price_per_night_cents: p.price_per_night_cents,
        thumbnail_url: p.thumbnail_url,
        gallery: JSON.stringify(p.gallery),
        amenities: JSON.stringify(p.amenities),
        badges: JSON.stringify(p.badges),
        status: 'active',
      })
      propertiesCreated++
    } catch (_error) {
      // Unique / pk collision — skip.
    }
  }

  let roomTypesCreated = 0
  for (const rt of ROOM_TYPES) {
    try {
      await create('room_types', {
        id: rt.id,
        property_id: rt.property_id,
        name: rt.name,
        description: rt.description,
        capacity: rt.capacity,
        price_per_night_cents: rt.price_per_night_cents,
        thumbnail_url: rt.thumbnail_url,
        total_rooms: rt.total_rooms,
        status: 'available',
      })
      roomTypesCreated++
    } catch (_error) {
      // Collision — skip.
    }
  }

  let reviewsCreated = 0
  for (const [idx, r] of REVIEWS.entries()) {
    const fakeUserId = `55555555-5555-4555-8555-${String(idx + 1).padStart(12, '0')}`
    try {
      await create('reviews', {
        resourceType: 'property',
        resourceId: r.property_id,
        userId: fakeUserId,
        rating: r.rating,
        title: r.title,
        body: `${r.user_pseudonym}: ${r.body}`,
      })
      reviewsCreated++
    } catch (_error) {
      // Unique (resourceType, resourceId, userId) collision — skip.
    }
  }

  return { destinationsCreated, propertiesCreated, roomTypesCreated, reviewsCreated }
}
