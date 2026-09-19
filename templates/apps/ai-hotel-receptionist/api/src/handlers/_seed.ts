/**
 * Demo seed for ai-hotel-receptionist.
 *
 * Single layer: **globals** — the demo property's room types, rooms, rate
 * plans, guests, voice agents, a handful of reservations across the
 * lifecycle (anchored to TODAY so the dashboard always has arrivals and
 * departures) and two completed sample calls with transcripts + tool
 * actions. Idempotent: skipped as soon as any room type row exists.
 *
 * There is no per-user seed: the PMS tables are property-scoped and every
 * authenticated staff user sees the same property.
 *
 * @module
 */

import { count, create } from '@molecule/api-database'

import { generateConfirmationCode, isoPlusDays } from '../lib/pms.js'

interface Seeded {
  id: string
}

const ROOM_TYPES: ReadonlyArray<{
  key: string
  name: string
  description: string
  occupancy: number
  base_rate_cents: number
  amenities: string[]
  rooms: ReadonlyArray<{ number: string; floor: number; status: string }>
}> = [
  {
    key: 'standard',
    name: 'Standard Queen',
    description: 'Cozy 24 m² room with a queen bed, writing desk, and garden-side window.',
    occupancy: 2,
    base_rate_cents: 12900,
    amenities: ['Wi-Fi', 'Smart TV', 'Coffee maker', 'Rain shower'],
    rooms: [
      { number: '101', floor: 1, status: 'vacant_clean' },
      { number: '102', floor: 1, status: 'occupied' },
      { number: '103', floor: 1, status: 'cleaning' },
      { number: '104', floor: 1, status: 'vacant_clean' },
      { number: '201', floor: 2, status: 'occupied' },
      { number: '202', floor: 2, status: 'vacant_clean' },
      { number: '203', floor: 2, status: 'vacant_clean' },
    ],
  },
  {
    key: 'deluxe',
    name: 'Deluxe King',
    description: '32 m² king room with a reading nook, city view, and marble bathroom.',
    occupancy: 3,
    base_rate_cents: 18900,
    amenities: ['Wi-Fi', 'Smart TV', 'Nespresso', 'Bathtub', 'City view'],
    rooms: [
      { number: '204', floor: 2, status: 'occupied' },
      { number: '205', floor: 2, status: 'vacant_clean' },
      { number: '301', floor: 3, status: 'vacant_clean' },
      { number: '302', floor: 3, status: 'out_of_order' },
    ],
  },
  {
    key: 'suite',
    name: 'Junior Suite',
    description: '48 m² corner suite with a separate lounge, sofa bed, and terrace access.',
    occupancy: 4,
    base_rate_cents: 27900,
    amenities: ['Wi-Fi', 'Lounge', 'Terrace', 'Nespresso', 'Soaking tub'],
    rooms: [
      { number: '303', floor: 3, status: 'occupied' },
      { number: '304', floor: 3, status: 'cleaning' },
    ],
  },
  {
    key: 'family',
    name: 'Family Room',
    description: 'Two connected doubles sleeping up to five, with a play corner for kids.',
    occupancy: 5,
    base_rate_cents: 23900,
    amenities: ['Wi-Fi', 'Two bedrooms', 'Play corner', 'Mini fridge'],
    rooms: [
      { number: '401', floor: 4, status: 'vacant_clean' },
      { number: '402', floor: 4, status: 'occupied' },
    ],
  },
]

const GUESTS: ReadonlyArray<{
  name: string
  email: string
  phone: string
  preferred_language: string
  notes: string
  stay_count: number
}> = [
  {
    name: 'Amelie Fontaine',
    email: 'amelie.fontaine@example.com',
    phone: '+33 6 12 34 56 78',
    preferred_language: 'fr',
    notes: 'Prefers a high floor; allergic to feather pillows.',
    stay_count: 6,
  },
  {
    name: 'Diego Ramírez',
    email: 'diego.ramirez@example.com',
    phone: '+34 611 22 33 44',
    preferred_language: 'es',
    notes: 'Repeat guest — always asks for late checkout.',
    stay_count: 4,
  },
  {
    name: 'Hannah Weber',
    email: 'hannah.weber@example.com',
    phone: '+49 151 2345 6789',
    preferred_language: 'de',
    notes: 'Business traveler; needs a desk and quiet room.',
    stay_count: 2,
  },
  {
    name: 'Chen Wei',
    email: 'chen.wei@example.com',
    phone: '+86 138 0013 8000',
    preferred_language: 'zh',
    notes: 'Vegetarian breakfast.',
    stay_count: 1,
  },
  {
    name: 'Oliver Grant',
    email: 'oliver.grant@example.com',
    phone: '+1 415 555 0132',
    preferred_language: 'en',
    notes: 'Anniversary stay — add a welcome note.',
    stay_count: 3,
  },
  {
    name: 'Sakura Tanaka',
    email: 'sakura.tanaka@example.com',
    phone: '+81 90 1234 5678',
    preferred_language: 'ja',
    notes: 'Arriving late (~23:00).',
    stay_count: 0,
  },
]

const VOICE_AGENTS: ReadonlyArray<{
  name: string
  phone_number: string
  languages: string[]
  upsell_enabled: boolean
  max_discount_percent: number
  transfer_to_human_on: string[]
  after_hours_message: string | null
}> = [
  {
    name: 'Front Desk — Multilingual',
    phone_number: '+1 555 0100',
    languages: ['en', 'es', 'fr', 'de', 'zh', 'ja'],
    upsell_enabled: true,
    max_discount_percent: 10,
    transfer_to_human_on: ['explicit_request', 'complaint', 'payment_issue'],
    after_hours_message: null,
  },
  {
    name: 'Night Line',
    phone_number: '+1 555 0199',
    languages: ['en', 'es', 'fr'],
    upsell_enabled: false,
    max_discount_percent: 0,
    transfer_to_human_on: ['explicit_request', 'complaint', 'payment_issue', 'group_booking'],
    after_hours_message:
      'Thank you for calling. The front desk is closed for the night — I can still check availability and book a room for you.',
  },
]

/**
 * Seed the demo property if the `room_types` table is empty. Idempotent.
 */
export async function seedGlobalPmsIfEmpty(): Promise<{
  roomTypesCreated: number
  roomsCreated: number
  ratePlansCreated: number
  guestsCreated: number
  voiceAgentsCreated: number
  reservationsCreated: number
  callsCreated: number
}> {
  const existing = await count('room_types', [])
  if (existing > 0) {
    return {
      roomTypesCreated: 0,
      roomsCreated: 0,
      ratePlansCreated: 0,
      guestsCreated: 0,
      voiceAgentsCreated: 0,
      reservationsCreated: 0,
      callsCreated: 0,
    }
  }

  const roomTypeIdByKey = new Map<string, string>()
  let roomsCreated = 0
  let ratePlansCreated = 0

  for (const rt of ROOM_TYPES) {
    const row = await create<Seeded>('room_types', {
      name: rt.name,
      description: rt.description,
      occupancy: rt.occupancy,
      base_rate_cents: rt.base_rate_cents,
      amenities: JSON.stringify(rt.amenities),
    })
    roomTypeIdByKey.set(rt.key, ((row.data ?? row) as Seeded).id)

    for (const room of rt.rooms) {
      await create('rooms', {
        number: room.number,
        floor: room.floor,
        room_type_id: ((row.data ?? row) as Seeded).id,
        status: room.status,
        notes: null,
      })
      roomsCreated++
    }

    // One flexible plan per type: flat weekdays, +15% weekends; the suite
    // also carries a date-bounded seasonal override around the demo dates.
    const seasonalStart = isoPlusDays(-14)
    const seasonalEnd = isoPlusDays(60)
    await create('rate_plans', {
      name: `${rt.name} Flex`,
      room_type_id: ((row.data ?? row) as Seeded).id,
      weekday_adjustment_percent: 0,
      weekend_adjustment_percent: 15,
      seasonal_override_cents: rt.key === 'suite' ? 25900 : null,
      seasonal_start: rt.key === 'suite' ? seasonalStart : null,
      seasonal_end: rt.key === 'suite' ? seasonalEnd : null,
      active: true,
    })
    ratePlansCreated++
  }

  const guestIdByName = new Map<string, string>()
  for (const g of GUESTS) {
    const row = await create<Seeded>('guests', {
      name: g.name,
      email: g.email,
      phone: g.phone,
      preferred_language: g.preferred_language,
      notes: g.notes,
      stay_count: g.stay_count,
    })
    guestIdByName.set(g.name, ((row.data ?? row) as Seeded).id)
  }

  const agentIdByName = new Map<string, string>()
  for (const a of VOICE_AGENTS) {
    const row = await create<Seeded>('voice_agents', {
      name: a.name,
      phone_number: a.phone_number,
      languages: JSON.stringify(a.languages),
      voice_by_language: JSON.stringify({}),
      upsell_enabled: a.upsell_enabled,
      max_discount_percent: a.max_discount_percent,
      transfer_to_human_on: JSON.stringify(a.transfer_to_human_on),
      after_hours_message: a.after_hours_message,
      active: true,
    })
    agentIdByName.set(a.name, ((row.data ?? row) as Seeded).id)
  }

  // Reservations across the lifecycle, anchored to today so the dashboard
  // always shows arrivals + departures. Kept light so next-weekend stays
  // bookable for the simulated-call demo (2 units max per type).
  const reservations: ReadonlyArray<{
    guest: string
    roomType: string
    checkIn: number
    checkOut: number
    guests: number
    status: string
    source: string
    total: number
  }> = [
    // In-house today (arrival yesterday, leaving tomorrow).
    {
      guest: 'Hannah Weber',
      roomType: 'deluxe',
      checkIn: -1,
      checkOut: 1,
      guests: 1,
      status: 'checked_in',
      source: 'online',
      total: 37800,
    },
    {
      guest: 'Chen Wei',
      roomType: 'suite',
      checkIn: -1,
      checkOut: 2,
      guests: 3,
      status: 'checked_in',
      source: 'front_desk',
      total: 83700,
    },
    // Departing today.
    {
      guest: 'Diego Ramírez',
      roomType: 'standard',
      checkIn: -3,
      checkOut: 0,
      guests: 2,
      status: 'checked_in',
      source: 'phone',
      total: 38700,
    },
    // Arriving today.
    {
      guest: 'Oliver Grant',
      roomType: 'deluxe',
      checkIn: 0,
      checkOut: 2,
      guests: 2,
      status: 'confirmed',
      source: 'online',
      total: 43470,
    },
    {
      guest: 'Sakura Tanaka',
      roomType: 'standard',
      checkIn: 0,
      checkOut: 3,
      guests: 1,
      status: 'held',
      source: 'phone',
      total: 38700,
    },
    // Past stay, already checked out.
    {
      guest: 'Amelie Fontaine',
      roomType: 'suite',
      checkIn: -10,
      checkOut: -7,
      guests: 2,
      status: 'checked_out',
      source: 'front_desk',
      total: 77700,
    },
    // Upcoming, one far enough out that it never blocks next weekend.
    {
      guest: 'Diego Ramírez',
      roomType: 'family',
      checkIn: 45,
      checkOut: 48,
      guests: 4,
      status: 'confirmed',
      source: 'online',
      total: 82354,
    },
    // The stay the sample booked-call created (matches its call_action).
    {
      guest: 'Lucía Herrera',
      roomType: 'standard',
      checkIn: 1,
      checkOut: 3,
      guests: 2,
      status: 'confirmed',
      source: 'phone',
      total: 29670,
    },
    {
      guest: 'Oliver Grant',
      roomType: 'standard',
      checkIn: -20,
      checkOut: -18,
      guests: 1,
      status: 'cancelled',
      source: 'phone',
      total: 25800,
    },
  ]

  let reservationsCreated = 0
  for (const r of reservations) {
    await create('reservations', {
      guest_id: guestIdByName.get(r.guest) ?? null,
      guest_name: r.guest,
      guest_contact: null,
      room_type_id: roomTypeIdByKey.get(r.roomType)!,
      room_id: null,
      check_in: isoPlusDays(r.checkIn),
      check_out: isoPlusDays(r.checkOut),
      guests: r.guests,
      nights: r.checkOut - r.checkIn,
      total_cents: r.total,
      status: r.status,
      source: r.source,
      confirmation_code: generateConfirmationCode(),
      notes: null,
      created_by: null,
    })
    reservationsCreated++
  }

  // Two completed sample calls with transcript + tool timeline so the
  // Calls list and CallDetail render real content from first boot.
  let callsCreated = 0
  const mainAgentId = agentIdByName.get('Front Desk — Multilingual')!

  const bookedCall = (
    await create<Seeded>('calls', {
      voice_agent_id: mainAgentId,
      user_id: null,
      direction: 'inbound',
      detected_language: 'es',
      started_at: new Date(Date.now() - 26 * 60 * 60 * 1000),
      ended_at: new Date(Date.now() - 26 * 60 * 60 * 1000 + 154_000),
      duration_seconds: 154,
      outcome: 'booked',
      summary: 'Caller booked a Standard Queen for the weekend for two guests.',
      recording_url: null,
      mode: 'llm',
    })
  ).data as Seeded
  callsCreated++

  for (const m of [
    {
      role: 'agent',
      text: 'Gracias por llamar. Le atiende recepción — ¿en qué puedo ayudarle?',
      language: 'es',
    },
    {
      role: 'caller',
      text: 'Hola, buenas noches. ¿Tienen habitaciones libres para este fin de semana, para dos personas?',
      language: 'es',
    },
    {
      role: 'agent',
      text: 'Sí, señora. Para el fin de semana queda la Standard Queen a 129 dólares por noche. ¿Desea que se la reserve?',
      language: 'es',
    },
    {
      role: 'caller',
      text: 'Sí, la primera, por favor. A nombre de Lucía Herrera.',
      language: 'es',
    },
    {
      role: 'agent',
      text: 'Perfecto, todo está listo. Su código de confirmación es K7PW2MFX. Estaremos encantados de recibirla.',
      language: 'es',
    },
  ]) {
    await create('call_messages', {
      call_id: bookedCall.id,
      role: m.role,
      text: m.text,
      language: m.language,
    })
  }
  for (const a of [
    {
      tool: 'search_availability',
      args: { check_in: isoPlusDays(1), check_out: isoPlusDays(3), guests: 2 },
      result: { available: true, options: [{ name: 'Standard Queen', total_cents: 29670 }] },
    },
    {
      tool: 'create_reservation',
      args: { room_type: 'Standard Queen', guest_name: 'Lucía Herrera', guests: 2 },
      result: { confirmation_code: 'K7PW2MFX', total_cents: 29670 },
    },
  ]) {
    await create('call_actions', {
      call_id: bookedCall.id,
      tool: a.tool,
      arguments: JSON.stringify(a.args),
      result: JSON.stringify(a.result),
    })
  }

  const infoCall = (
    await create<Seeded>('calls', {
      voice_agent_id: mainAgentId,
      user_id: null,
      direction: 'inbound',
      detected_language: 'fr',
      started_at: new Date(Date.now() - 5 * 60 * 60 * 1000),
      ended_at: new Date(Date.now() - 5 * 60 * 60 * 1000 + 61_000),
      duration_seconds: 61,
      outcome: 'info',
      summary: 'Callant a demandé l’heure du petit-déjeuner et du late checkout.',
      recording_url: null,
      mode: 'llm',
    })
  ).data as Seeded
  callsCreated++

  for (const m of [
    {
      role: 'agent',
      text: 'Merci de votre appel. Ici la réception — comment puis-je vous aider ?',
      language: 'fr',
    },
    { role: 'caller', text: 'Bonjour, à quelle heure sert-on le petit-déjeuner ?', language: 'fr' },
    {
      role: 'agent',
      text: 'Le petit-déjeuner est servi de 6 h 30 à 10 h 30 en semaine, et jusqu’à 11 h le week-end. Autre chose ?',
      language: 'fr',
    },
    { role: 'caller', text: 'Non merci, c’est parfait.', language: 'fr' },
  ]) {
    await create('call_messages', {
      call_id: infoCall.id,
      role: m.role,
      text: m.text,
      language: m.language,
    })
  }
  await create('call_actions', {
    call_id: infoCall.id,
    tool: 'search_availability',
    arguments: JSON.stringify({ check_in: isoPlusDays(7), check_out: isoPlusDays(8), guests: 1 }),
    result: JSON.stringify({ available: true, options: [] }),
  })

  return {
    roomTypesCreated: ROOM_TYPES.length,
    roomsCreated,
    ratePlansCreated,
    guestsCreated: GUESTS.length,
    voiceAgentsCreated: VOICE_AGENTS.length,
    reservationsCreated,
    callsCreated,
  }
}
