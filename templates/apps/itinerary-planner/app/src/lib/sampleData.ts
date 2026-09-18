/**
 * Inline sample data for Waypoint's public marketing surfaces.
 *
 * The authed pages (Dashboard, Trips, Bookings, Expenses, Notifications)
 * hydrate from the real API; only the Landing page renders these arrays,
 * as a signed-out product preview (hero countdown card, trip grid, and
 * destination grid). The shapes mirror the card-component props so the
 * preview matches what a real account looks like.
 */

import type { BudgetSpend } from '../components/BudgetSpendCard.js'
import type { ActivityItem } from '../components/DayTimelineRow.js'
import type { Destination } from '../components/DestinationOrbCard.js'
import type { UpcomingTrip } from '../components/TripCountdownHeroCard.js'
import type { TripSummary } from '../components/TripCoverCard.js'

export const SAMPLE_UPCOMING_TRIP: UpcomingTrip = {
  id: 'tr-2026-iceland',
  destination: 'Reykjavík & the Ring Road',
  country: 'Iceland',
  start_iso: '2026-06-12T08:00:00Z',
  end_iso: '2026-06-22T18:00:00Z',
  cover_url: 'https://picsum.photos/seed/waypoint-iceland/1200/675',
  status: 'confirmed',
  collaborator_count: 4,
  budget_used_cents: 184500,
  budget_total_cents: 420000,
}

export const SAMPLE_TRIPS: TripSummary[] = [
  {
    id: 'tr-2026-iceland',
    destination: 'Reykjavík & the Ring Road',
    country: 'Iceland',
    cover_url: 'https://picsum.photos/seed/waypoint-iceland/1200/675',
    start_iso: '2026-06-12T08:00:00Z',
    end_iso: '2026-06-22T18:00:00Z',
    status: 'confirmed',
    collaborators: [
      { id: 'u1', name: 'Iris Larsen' },
      { id: 'u2', name: 'Jonas Berg' },
      { id: 'u3', name: 'Mira Patel' },
      { id: 'u4', name: 'Theo Marin' },
    ],
    stop_count: 11,
    budget_used_cents: 184500,
    budget_total_cents: 420000,
  },
  {
    id: 'tr-2026-japan',
    destination: 'Kyoto, Naoshima & Tokyo',
    country: 'Japan',
    cover_url: 'https://picsum.photos/seed/waypoint-japan/1200/675',
    start_iso: '2026-09-04T09:00:00Z',
    end_iso: '2026-09-19T20:00:00Z',
    status: 'tentative',
    collaborators: [
      { id: 'u1', name: 'Iris Larsen' },
      { id: 'u2', name: 'Jonas Berg' },
    ],
    stop_count: 14,
    budget_used_cents: 32000,
    budget_total_cents: 580000,
  },
  {
    id: 'tr-2026-portugal',
    destination: 'Lisbon → Porto coastal loop',
    country: 'Portugal',
    cover_url: 'https://picsum.photos/seed/waypoint-portugal/1200/675',
    start_iso: '2026-04-08T10:00:00Z',
    end_iso: '2026-04-18T16:00:00Z',
    status: 'in_progress',
    collaborators: [
      { id: 'u5', name: 'Henrik Olsen' },
      { id: 'u6', name: 'Saoirse Quinn' },
      { id: 'u7', name: 'Aiko Tanaka' },
    ],
    stop_count: 8,
    budget_used_cents: 312000,
    budget_total_cents: 360000,
  },
  {
    id: 'tr-2025-oaxaca',
    destination: 'Oaxaca dia de los muertos',
    country: 'Mexico',
    cover_url: 'https://picsum.photos/seed/waypoint-oaxaca/1200/675',
    start_iso: '2025-10-28T08:00:00Z',
    end_iso: '2025-11-03T22:00:00Z',
    status: 'completed',
    collaborators: [
      { id: 'u1', name: 'Iris Larsen' },
      { id: 'u2', name: 'Jonas Berg' },
    ],
    stop_count: 9,
    budget_used_cents: 248000,
    budget_total_cents: 250000,
  },
  {
    id: 'tr-2024-faroe',
    destination: 'Faroe Islands archipelago',
    country: 'Faroe Islands',
    cover_url: 'https://picsum.photos/seed/waypoint-faroe/1200/675',
    start_iso: '2024-08-12T08:00:00Z',
    end_iso: '2024-08-21T18:00:00Z',
    status: 'completed',
    collaborators: [
      { id: 'u1', name: 'Iris Larsen' },
      { id: 'u2', name: 'Jonas Berg' },
      { id: 'u8', name: 'Lars Nilsen' },
    ],
    stop_count: 7,
    budget_used_cents: 388000,
    budget_total_cents: 400000,
  },
  {
    id: 'tr-2024-cancelled',
    destination: 'Patagonia winter (cancelled)',
    country: 'Argentina',
    cover_url: 'https://picsum.photos/seed/waypoint-patagonia/1200/675',
    start_iso: '2024-07-02T08:00:00Z',
    end_iso: '2024-07-15T18:00:00Z',
    status: 'cancelled',
    collaborators: [{ id: 'u1', name: 'Iris Larsen' }],
    stop_count: 0,
  },
]

export const SAMPLE_DESTINATIONS: Destination[] = [
  {
    id: 'dest-iceland-ring',
    name: 'Reykjavík & the Ring Road',
    region: 'Iceland · North Atlantic',
    blurb:
      'Black-sand beaches, geothermal lagoons, and the open road around an entire country in eight unhurried days.',
    thumbnail: 'https://picsum.photos/seed/waypoint-iceland-orb/1200/900',
    pill: 'Editor pick',
    trip_count: 2,
  },
  {
    id: 'dest-faroe',
    name: 'Faroe Islands',
    region: 'North Atlantic',
    blurb:
      'Turf-roofed villages on basalt cliffs, sea-bird colonies, and remote hikes between fjord-bound hamlets.',
    thumbnail: 'https://picsum.photos/seed/waypoint-faroe-orb/1200/900',
    pill: 'Rare find',
    trip_count: 1,
  },
  {
    id: 'dest-japan',
    name: 'Kyoto & Naoshima',
    region: 'Japan · Kansai',
    blurb: 'Temple gardens, kaiseki dinners, and an art-island side-quest reached by a slow ferry.',
    thumbnail: 'https://picsum.photos/seed/waypoint-japan-orb/1200/900',
    pill: 'Slow travel',
    trip_count: 1,
  },
  {
    id: 'dest-portugal',
    name: 'Lisbon → Porto coastal loop',
    region: 'Portugal · Atlantic',
    blurb:
      'Tiled facades, Douro vineyards, and a rented car for the Atlantic detour through Aveiro and Costa Nova.',
    thumbnail: 'https://picsum.photos/seed/waypoint-portugal-orb/1200/900',
    pill: 'Coastal',
    trip_count: 1,
  },
  {
    id: 'dest-oaxaca',
    name: 'Oaxaca de Juárez',
    region: 'Mexico · Sierra Norte',
    blurb: 'Mole markets, mezcal cellars, and Día de los Muertos parades through Centro Histórico.',
    thumbnail: 'https://picsum.photos/seed/waypoint-oaxaca-orb/1200/900',
    pill: 'Cultural',
  },
  {
    id: 'dest-patagonia',
    name: 'Patagonia trekking',
    region: 'Argentina · South America',
    blurb:
      'Working ranches, glacier hikes, and open-fire dinners under the cleanest skies on earth.',
    thumbnail: 'https://picsum.photos/seed/waypoint-patagonia-orb/1200/900',
    pill: 'Adventure',
  },
  {
    id: 'dest-marrakesh',
    name: 'Marrakesh & the Atlas',
    region: 'Morocco · North Africa',
    blurb: 'Riads off the medina, atlas-mountain treks, and a desert detour to Erg Chebbi.',
    thumbnail: 'https://picsum.photos/seed/waypoint-marrakesh-orb/1200/900',
  },
  {
    id: 'dest-vietnam',
    name: 'Hanoi → Hội An',
    region: 'Vietnam · Southeast Asia',
    blurb:
      'Bún chả mornings, lantern-lit Hội An nights, and an overnight train down the spine of the country.',
    thumbnail: 'https://picsum.photos/seed/waypoint-vietnam-orb/1200/900',
  },
]

export const SAMPLE_DAY_PLAN: { day: number; date_iso: string; activities: ActivityItem[] }[] = [
  {
    day: 1,
    date_iso: '2026-06-12',
    activities: [
      {
        id: 'a1',
        title: 'Reykjavík flight from London Heathrow',
        category: 'transport',
        start_time: '08:25',
        duration_minutes: 195,
        location: 'LHR → KEF',
        transport_mode: 'flight',
        confirmation_code: 'IB-2241',
      },
      {
        id: 'a2',
        title: 'Pickup rental — Toyota RAV4 4WD',
        category: 'transport',
        start_time: '12:50',
        duration_minutes: 45,
        location: 'Keflavík airport · Blue Car Rental',
        transport_mode: 'car',
        confirmation_code: 'BCR-9020',
      },
      {
        id: 'a3',
        title: 'Check in — Reykjavík Loft Apartments',
        category: 'accommodation',
        start_time: '15:00',
        duration_minutes: 30,
        location: 'Bankastræti 7, Reykjavík',
        confirmation_code: 'WP-LOFT-7821',
      },
      {
        id: 'a4',
        title: 'Sundhöllin geothermal pool',
        category: 'activity',
        start_time: '17:00',
        duration_minutes: 90,
        location: 'Barónsstígur 45A, downtown',
      },
      {
        id: 'a5',
        title: 'Dinner at Matur og Drykkur',
        category: 'food',
        start_time: '19:30',
        duration_minutes: 105,
        location: 'Grandagarður 2',
        notes: 'Reservation under Larsen for 4 — chef table.',
      },
    ],
  },
  {
    day: 2,
    date_iso: '2026-06-13',
    activities: [
      {
        id: 'b1',
        title: 'Drive to Þingvellir National Park',
        category: 'transport',
        start_time: '08:15',
        duration_minutes: 50,
        location: 'Reykjavík → Þingvellir',
        transport_mode: 'car',
      },
      {
        id: 'b2',
        title: 'Walk Almannagjá rift valley',
        category: 'sightseeing',
        start_time: '09:30',
        duration_minutes: 120,
        location: 'Þingvellir National Park',
        notes: 'UNESCO site — between the Eurasian and North American plates.',
      },
      {
        id: 'b3',
        title: 'Lunch — Efstidalur II farmhouse',
        category: 'food',
        start_time: '12:30',
        duration_minutes: 75,
        location: 'Bláskógabyggð, by Geysir',
        notes: 'Farm-to-table; ask for the lamb stew.',
      },
      {
        id: 'b4',
        title: 'Geysir & Strokkur eruptions',
        category: 'sightseeing',
        start_time: '14:00',
        duration_minutes: 60,
        location: 'Haukadalur valley',
      },
      {
        id: 'b5',
        title: 'Gullfoss waterfall viewpoint',
        category: 'sightseeing',
        start_time: '15:30',
        duration_minutes: 60,
        location: 'Gullfoss · Hvítá river',
      },
      {
        id: 'b6',
        title: 'Check in — Hotel Rangá',
        category: 'accommodation',
        start_time: '18:30',
        duration_minutes: 30,
        location: 'Hella, south Iceland',
        confirmation_code: 'WP-RANGÁ-1199',
      },
    ],
  },
]

export const SAMPLE_BUDGET_SPENDS: BudgetSpend[] = [
  { category: 'accommodation', spent_cents: 84500, budget_cents: 160000, recent_count: 5 },
  { category: 'food', spent_cents: 51000, budget_cents: 90000, recent_count: 14 },
  { category: 'transport', spent_cents: 36000, budget_cents: 120000, recent_count: 4 },
  { category: 'activity', spent_cents: 9500, budget_cents: 35000, recent_count: 2 },
  { category: 'food', spent_cents: 0, budget_cents: 0, recent_count: 0 },
]

export const SAMPLE_BOOKINGS: Array<{
  id: string
  type: 'flight' | 'hotel' | 'activity' | 'car' | 'train'
  title: string
  detail: string
  start_iso: string
  end_iso?: string
  confirmation_code: string
  trip_id: string
  status: 'confirmed' | 'pending' | 'cancelled'
  cost_cents: number
  vendor: string
}> = [
  {
    id: 'bk-001',
    type: 'flight',
    title: 'British Airways BA-2241 · LHR → KEF',
    detail: 'Economy Plus · 1× checked bag · Iris L., Jonas B., Mira P., Theo M.',
    start_iso: '2026-06-12T08:25:00Z',
    end_iso: '2026-06-12T11:40:00Z',
    confirmation_code: 'BA-XR8L9P',
    trip_id: 'tr-2026-iceland',
    status: 'confirmed',
    cost_cents: 142800,
    vendor: 'British Airways',
  },
  {
    id: 'bk-002',
    type: 'hotel',
    title: 'Reykjavík Loft Apartments · 4 nights',
    detail: 'Two-bedroom suite · Ocean view · Free cancellation until June 5.',
    start_iso: '2026-06-12T15:00:00Z',
    end_iso: '2026-06-16T11:00:00Z',
    confirmation_code: 'WP-LOFT-7821',
    trip_id: 'tr-2026-iceland',
    status: 'confirmed',
    cost_cents: 109600,
    vendor: 'Reykjavík Loft',
  },
  {
    id: 'bk-003',
    type: 'car',
    title: 'Toyota RAV4 4WD · 10 days',
    detail: 'Pickup KEF · Blue Car Rental · Unlimited mileage + zero excess.',
    start_iso: '2026-06-12T12:50:00Z',
    end_iso: '2026-06-22T13:00:00Z',
    confirmation_code: 'BCR-9020',
    trip_id: 'tr-2026-iceland',
    status: 'confirmed',
    cost_cents: 84200,
    vendor: 'Blue Car Rental',
  },
  {
    id: 'bk-004',
    type: 'activity',
    title: 'Sky Lagoon · Sky Pass',
    detail: 'Late-evening entry, June 14 · all four travelers',
    start_iso: '2026-06-14T20:00:00Z',
    confirmation_code: 'SL-44120',
    trip_id: 'tr-2026-iceland',
    status: 'confirmed',
    cost_cents: 24800,
    vendor: 'Sky Lagoon',
  },
  {
    id: 'bk-005',
    type: 'hotel',
    title: 'Pousada do Porto, Portugal',
    detail: 'Junior Suite · Douro view · Late check-in arranged.',
    start_iso: '2026-04-15T16:00:00Z',
    end_iso: '2026-04-18T11:00:00Z',
    confirmation_code: 'WP-DOURO-5520',
    trip_id: 'tr-2026-portugal',
    status: 'pending',
    cost_cents: 67200,
    vendor: 'Pousada do Porto',
  },
  {
    id: 'bk-006',
    type: 'train',
    title: 'Shinkansen Tokyo → Kyoto',
    detail: 'Reserved Green Car · 2 travelers · waiting for Japan Rail Pass.',
    start_iso: '2026-09-08T09:30:00Z',
    end_iso: '2026-09-08T11:45:00Z',
    confirmation_code: 'JR-PENDING',
    trip_id: 'tr-2026-japan',
    status: 'pending',
    cost_cents: 0,
    vendor: 'JR Central',
  },
]

export const SAMPLE_NOTIFICATIONS: Array<{
  id: string
  kind: 'booking' | 'collaborator' | 'price_alert' | 'reminder' | 'system'
  title: string
  body: string
  occurred_iso: string
  read: boolean
  trip_id?: string
}> = [
  {
    id: 'n-01',
    kind: 'booking',
    title: 'Sky Lagoon · entry confirmed',
    body: 'Your Sky Pass for 8 PM on June 14 is confirmed for all four travelers.',
    occurred_iso: '2026-04-29T16:42:00Z',
    read: false,
    trip_id: 'tr-2026-iceland',
  },
  {
    id: 'n-02',
    kind: 'collaborator',
    title: 'Mira Patel commented on Day 4',
    body: '"Should we swap the glacier walk for a Vatnajökull boat tour? I added a link to the notes."',
    occurred_iso: '2026-04-29T11:08:00Z',
    read: false,
    trip_id: 'tr-2026-iceland',
  },
  {
    id: 'n-03',
    kind: 'price_alert',
    title: 'Tokyo → Kyoto fare dropped 18%',
    body: 'JR Central has a Green Car deal on your Sept 8 connection — book by Sunday.',
    occurred_iso: '2026-04-28T22:15:00Z',
    read: false,
    trip_id: 'tr-2026-japan',
  },
  {
    id: 'n-04',
    kind: 'reminder',
    title: 'Iceland trip starts in 44 days',
    body: 'Travel insurance is unconfirmed and 3 collaborators have not added their passport numbers.',
    occurred_iso: '2026-04-28T08:00:00Z',
    read: true,
    trip_id: 'tr-2026-iceland',
  },
  {
    id: 'n-05',
    kind: 'collaborator',
    title: 'Theo Marin joined the Iceland trip',
    body: "Theo accepted Iris's invite — they can edit the day plan and shared budget.",
    occurred_iso: '2026-04-26T13:51:00Z',
    read: true,
    trip_id: 'tr-2026-iceland',
  },
  {
    id: 'n-06',
    kind: 'booking',
    title: 'Pousada do Porto · awaiting deposit',
    body: 'Your reservation needs a 30% deposit by April 30 to stay confirmed.',
    occurred_iso: '2026-04-25T19:30:00Z',
    read: true,
    trip_id: 'tr-2026-portugal',
  },
  {
    id: 'n-07',
    kind: 'system',
    title: 'Waypoint Pro · 2 weeks free trial added',
    body: 'You can invite up to 8 collaborators per trip and export PDFs while on Pro.',
    occurred_iso: '2026-04-24T10:00:00Z',
    read: true,
  },
]
