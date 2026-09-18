/**
 * Seed the public properties / room_types / room_inventory / reviews catalog.
 *
 * Idempotent: every INSERT uses a stable id and ON CONFLICT DO NOTHING, so
 * re-running on a populated DB is a no-op. Called from server.ts after
 * runMigrations() so a fresh boot always has a curated catalog ready for the
 * search / property / booking pages.
 */

import pg from 'pg'

import { deriveSsl } from '@molecule/api-database-postgresql'

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/myapp'

// SSL is verify-by-default via the postgresql bond's shared `deriveSsl` helper:
// local connections skip TLS, remote connections verify the server certificate
// against the system CA store, and verification is relaxed ONLY on an explicit
// operator opt-out (DATABASE_SSL_REJECT_UNAUTHORIZED=false / sslmode=no-verify),
// with PGSSLROOTCERT supported for private-CA managed providers.
const sslConfig = deriveSsl(DATABASE_URL)

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
  id: string
  property_id: string
  user_pseudonym: string
  date_iso: string
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
      'A four-bedroom hillside villa with three terraces, a mezcal cellar, and panoramic city views. Sofía and her family host guests with handmade tortillas at sunrise and a private rooftop dinner on arrival night.',
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
      'A working agriturismo on 14 hectares of Sangiovese vines. Stone-floored suites with copper tubs, a candlelit cellar tasting nightly, and bicycles for vineyard exploring.',
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
    description:
      'A grass-roofed two-bedroom cabin perched above Tórshavn harbor. Wood-burning stove, sauna, and a private hot tub with sea views — perfect for storm-watching season.',
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
    description:
      'A four-cabin alpine lodge inside Banff National Park. Glacier-fed plunge pool, wildlife tours, fireside breakfasts, and trail-side stargazing benches.',
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
    description:
      'A traditional eight-room ryokan with private onsen baths, kaiseki dinner, and tatami-floored gardens. Slow mornings, careful service, and a tea house under cherry trees.',
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
    description:
      'A high-altitude Malbec finca with horseback rides between vine rows, an open-fire asado lunch, and rooftop stargazing nights.',
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
    description:
      'A six-suite boutique hotel inside a restored 18th-century lighthouse on the cliffs above Vernazza harbor. Sea-kayak access, rooftop terrace, and a Michelin-listed restaurant downstairs.',
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
      'A traditional red rorbu cabin on stilts above the fjord. Aurora viewing from the hot tub, fishing tackle, and a sauna under the midnight sun.',
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
  const baseId = `33333333-3333-4333-8333-${String(idx + 1).padStart(12, '0')}`
  return [
    {
      id: baseId.replace(/0$/, '1'),
      property_id: p.id,
      name: 'Standard suite',
      description: 'Sleeps 2 in a king bed with private bath. Garden or city view.',
      capacity: 2,
      price_per_night_cents: p.price_per_night_cents,
      thumbnail_url: p.gallery[1] ?? p.thumbnail_url,
      total_rooms: 4,
    },
    {
      id: baseId.replace(/0$/, '2'),
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

const REVIEW_BODIES: Array<Omit<SeedReview, 'id'>> = [
  {
    property_id: PROPERTIES[0].id,
    user_pseudonym: 'Maya K.',
    date_iso: '2026-03-12T00:00:00Z',
    rating: 5,
    title: 'Sunset hour from the highest terrace',
    body: 'Watching the sunset from the highest terrace was the most memorable hour of our trip. Sofía left fresh tortillas at our door every morning.',
  },
  {
    property_id: PROPERTIES[0].id,
    user_pseudonym: 'Tomás S.',
    date_iso: '2026-02-04T00:00:00Z',
    rating: 5,
    title: 'Cloud-forest hide-out',
    body: 'Tucked into the cloud forest. The mezcal cellar evening alone was worth the trip — we extended by two nights.',
  },
  {
    property_id: PROPERTIES[1].id,
    user_pseudonym: 'Amelia R.',
    date_iso: '2026-04-08T00:00:00Z',
    rating: 5,
    title: 'Vineyard afternoons',
    body: 'We spent every afternoon riding bicycles between the vineyards. Candlelit cellar tasting was the perfect end to each day.',
  },
  {
    property_id: PROPERTIES[1].id,
    user_pseudonym: 'Pietro M.',
    date_iso: '2026-03-30T00:00:00Z',
    rating: 4,
    title: 'Quietly perfect',
    body: 'Stone-floored suites stayed cool in the afternoons. Breakfast in the orchard was a daily highlight.',
  },
  {
    property_id: PROPERTIES[2].id,
    user_pseudonym: 'Henrik L.',
    date_iso: '2026-03-22T00:00:00Z',
    rating: 5,
    title: 'Aurora wake-up at 02:14',
    body: 'Aurora wake-up at 02:14. We watched it from the hot tub for an hour. The hosts brought hot cocoa and didn’t even charge extra.',
  },
  {
    property_id: PROPERTIES[2].id,
    user_pseudonym: 'Eira J.',
    date_iso: '2026-02-18T00:00:00Z',
    rating: 5,
    title: 'Storm-watching season magic',
    body: 'Five days of high winds and wild seas, all watched from the wood-stove window. Bring layers and stay an extra night.',
  },
  {
    property_id: PROPERTIES[3].id,
    user_pseudonym: 'Owen W.',
    date_iso: '2026-04-12T00:00:00Z',
    rating: 5,
    title: 'Wildlife corridor breakfasts',
    body: 'Watched a moose family at sunrise from the breakfast porch. Trails started right at the cabin door.',
  },
  {
    property_id: PROPERTIES[4].id,
    user_pseudonym: 'Hana A.',
    date_iso: '2026-03-02T00:00:00Z',
    rating: 5,
    title: 'Slow mornings, careful service',
    body: 'Every kaiseki course was thoughtful. The tea house under the cherry trees was perfect at twilight.',
  },
  {
    property_id: PROPERTIES[5].id,
    user_pseudonym: 'Lucía F.',
    date_iso: '2026-04-21T00:00:00Z',
    rating: 4,
    title: 'Rooftop stargazing under the Andes',
    body: 'Open-fire asado, then rooftop stargazing. The host stargazed with us until midnight.',
  },
  {
    property_id: PROPERTIES[6].id,
    user_pseudonym: 'Chiara V.',
    date_iso: '2026-04-30T00:00:00Z',
    rating: 5,
    title: 'Sunrise rowing from the lighthouse',
    body: 'Took a sea kayak out at sunrise from below the lighthouse. The terrace dinner above the harbor was unreal.',
  },
  {
    property_id: PROPERTIES[6].id,
    user_pseudonym: 'Marco T.',
    date_iso: '2026-03-15T00:00:00Z',
    rating: 5,
    title: 'Rooftop terrace at golden hour',
    body: 'Cliffside, candlelit, with the sea below. The Michelin-listed restaurant downstairs delivered every night.',
  },
  {
    property_id: PROPERTIES[7].id,
    user_pseudonym: 'Inga K.',
    date_iso: '2026-02-09T00:00:00Z',
    rating: 5,
    title: 'Aurora season delivered',
    body: 'Aurora three of five nights. Sauna, hot tub, fjord. Nothing else needed.',
  },
]

const REVIEWS: SeedReview[] = REVIEW_BODIES.map((r, idx) => ({
  ...r,
  id: `44444444-4444-4444-8444-${String(idx + 1).padStart(12, '0')}`,
}))

export async function seedCatalog(): Promise<void> {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: sslConfig,
  })
  await client.connect()
  try {
    for (const d of DESTINATIONS) {
      await client.query(
        `INSERT INTO destinations (id, slug, name, country, region, blurb, hero_image_url, latitude, longitude, popularity_score, featured)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO NOTHING`,
        [
          d.id,
          d.slug,
          d.name,
          d.country,
          d.region ?? null,
          d.blurb ?? null,
          d.hero_image_url ?? null,
          d.latitude ?? null,
          d.longitude ?? null,
          d.popularity_score ?? 0,
          d.featured ?? false,
        ],
      )
    }

    for (const p of PROPERTIES) {
      await client.query(
        `INSERT INTO properties
         (id, destination_id, slug, name, kind, city, country, address, latitude, longitude,
          description, rating, review_count, price_per_night_cents, thumbnail_url,
          gallery, amenities, badges, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18::jsonb,'active')
         ON CONFLICT (id) DO NOTHING`,
        [
          p.id,
          p.destination_id,
          p.slug,
          p.name,
          p.kind,
          p.city,
          p.country,
          p.address,
          p.latitude,
          p.longitude,
          p.description,
          p.rating,
          p.review_count,
          p.price_per_night_cents,
          p.thumbnail_url,
          JSON.stringify(p.gallery),
          JSON.stringify(p.amenities),
          JSON.stringify(p.badges),
        ],
      )
    }

    for (const rt of ROOM_TYPES) {
      await client.query(
        `INSERT INTO room_types
         (id, property_id, name, description, capacity, price_per_night_cents, thumbnail_url, total_rooms, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'available')
         ON CONFLICT (id) DO NOTHING`,
        [
          rt.id,
          rt.property_id,
          rt.name,
          rt.description,
          rt.capacity,
          rt.price_per_night_cents,
          rt.thumbnail_url,
          rt.total_rooms,
        ],
      )
    }

    for (const [idx, r] of REVIEWS.entries()) {
      const fakeUserId = `55555555-5555-4555-8555-${String(idx + 1).padStart(12, '0')}`
      await client.query(
        `INSERT INTO reviews (id, "resourceType", "resourceId", "userId", rating, title, body)
         VALUES ($1,'property',$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.property_id, fakeUserId, r.rating, r.title, `${r.user_pseudonym}: ${r.body}`],
      )
    }
    console.log(
      `✓ Seeded ${DESTINATIONS.length} destinations, ${PROPERTIES.length} properties, ${ROOM_TYPES.length} room types, ${REVIEWS.length} reviews (idempotent)`,
    )
  } finally {
    await client.end()
  }
}
