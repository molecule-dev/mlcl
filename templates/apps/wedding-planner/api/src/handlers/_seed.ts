/**
 * Demo seed for wedding-planner.
 *
 * Every table here is user-owned (single-wedding app), so there is no global
 * seed — instead `seedDemoForUser(userId)` lazily provisions a starter
 * wedding + guest list + meal options + budget + vendors + tasks + tables
 * the first time the app asks for the wedding (GET /api/wedding), so a
 * freshly signed-up couple lands on a populated planner instead of blank
 * pages. Idempotent per user: skipped once a wedding row exists.
 *
 * @module
 */
import { count, create, findMany, findOne } from '@molecule/api-database'

import { generateRsvpCode } from '../lib/wedding.js'

/** Default partner names until the couple edits the wedding. */
export const DEFAULT_PARTNER_A = 'Partner A'
export const DEFAULT_PARTNER_B = 'Partner B'

/** Wedding date ~10 months out so the countdown is meaningful on first boot. */
function defaultWeddingDate(): Date {
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() + 10)
  d.setUTCDate(12)
  d.setUTCHours(16, 0, 0, 0)
  return d
}

interface SeedGuest {
  name: string
  side: 'partner_a' | 'partner_b' | 'both'
  group_name?: string
  email?: string
  rsvp_status: 'pending' | 'yes' | 'no' | 'maybe'
  meal_choice?: string
  plus_ones?: number
}

const STARTER_GUESTS: readonly SeedGuest[] = [
  {
    name: 'Alice Whitfield',
    side: 'partner_a',
    group_name: 'Whitfield family',
    email: 'alice@example.com',
    rsvp_status: 'yes',
    meal_choice: 'Herb chicken',
    plus_ones: 0,
  },
  {
    name: 'Bernard Whitfield',
    side: 'partner_a',
    group_name: 'Whitfield family',
    rsvp_status: 'yes',
    meal_choice: 'Herb chicken',
  },
  {
    name: 'Clara Whitfield',
    side: 'partner_a',
    group_name: 'Whitfield family',
    rsvp_status: 'pending',
  },
  {
    name: 'Devon Marsh',
    side: 'partner_a',
    group_name: 'College friends',
    rsvp_status: 'yes',
    meal_choice: 'Mushroom risotto',
    plus_ones: 1,
  },
  {
    name: 'Elena Marsh',
    side: 'partner_a',
    group_name: 'College friends',
    rsvp_status: 'yes',
    meal_choice: 'Mushroom risotto',
  },
  {
    name: 'Farid Okafor',
    side: 'partner_b',
    group_name: 'Okafor family',
    rsvp_status: 'yes',
    meal_choice: 'Seared salmon',
  },
  {
    name: 'Grace Okafor',
    side: 'partner_b',
    group_name: 'Okafor family',
    rsvp_status: 'yes',
    meal_choice: 'Seared salmon',
  },
  { name: 'Hana Sato', side: 'partner_b', group_name: 'Work friends', rsvp_status: 'maybe' },
  { name: 'Iris Delacroix', side: 'partner_b', group_name: 'Work friends', rsvp_status: 'pending' },
  { name: 'Jonas Petersen', side: 'both', group_name: 'Neighbours', rsvp_status: 'no' },
]

const STARTER_MEALS: ReadonlyArray<{ name: string; description: string }> = [
  { name: 'Herb chicken', description: 'Roasted half chicken, thyme jus, seasonal vegetables' },
  { name: 'Seared salmon', description: 'Atlantic salmon, lemon beurre blanc, herb rice' },
  {
    name: 'Mushroom risotto',
    description: 'Carnaroli rice, wild mushrooms, parmesan (vegetarian)',
  },
  {
    name: 'Beef tenderloin',
    description: 'Grass-fed tenderloin, red wine reduction, potato gratin',
  },
]

const STARTER_BUDGET: ReadonlyArray<{
  category: string
  label: string
  estimated_cents: number
  actual_cents?: number
}> = [
  {
    category: 'venue',
    label: 'Ceremony + reception venue',
    estimated_cents: 950000,
    actual_cents: 950000,
  },
  { category: 'catering', label: 'Plated dinner (120 guests)', estimated_cents: 720000 },
  { category: 'catering', label: 'Bar package', estimated_cents: 180000 },
  {
    category: 'photography',
    label: 'Photographer (10h)',
    estimated_cents: 320000,
    actual_cents: 295000,
  },
  { category: 'attire', label: 'Wedding attire + alterations', estimated_cents: 240000 },
  { category: 'flowers', label: 'Florals + ceremony arch', estimated_cents: 140000 },
  { category: 'music', label: 'Band + DJ', estimated_cents: 260000 },
  {
    category: 'stationery',
    label: 'Invitations + RSVP cards',
    estimated_cents: 45000,
    actual_cents: 41250,
  },
  { category: 'other', label: 'Hair + makeup', estimated_cents: 60000 },
]

const STARTER_VENDORS: ReadonlyArray<{
  category: string
  name: string
  contact?: string
  status: 'researching' | 'contacted' | 'booked' | 'paid'
}> = [
  {
    category: 'venue',
    name: 'Linden Hall Estate',
    contact: 'events@lindenhall.example',
    status: 'paid',
  },
  {
    category: 'catering',
    name: 'Golden Fig Catering',
    contact: 'hello@goldenfig.example',
    status: 'booked',
  },
  {
    category: 'photography',
    name: 'Alder & Lens Studio',
    contact: 'studio@alderlens.example',
    status: 'booked',
  },
  {
    category: 'flowers',
    name: 'Petal + Stem',
    contact: 'orders@petalstem.example',
    status: 'contacted',
  },
  { category: 'music', name: 'The Nightingale Quartet', status: 'contacted' },
  { category: 'attire', name: 'Maison Blanche Bridal', status: 'researching' },
]

/** Due dates offset in days from today (negative = already due). */
const STARTER_TASKS: ReadonlyArray<{
  title: string
  category: string
  dueInDays: number
  done?: boolean
}> = [
  { title: 'Set the wedding date', category: 'planning', dueInDays: -120, done: true },
  { title: 'Book ceremony + reception venue', category: 'venue', dueInDays: -90, done: true },
  { title: 'Finalize guest list', category: 'guests', dueInDays: -30, done: true },
  { title: 'Send save-the-dates', category: 'stationery', dueInDays: -14, done: true },
  { title: 'Book caterer + menu tasting', category: 'catering', dueInDays: 10 },
  { title: 'Order invitations', category: 'stationery', dueInDays: 24 },
  { title: 'Book photographer', category: 'photography', dueInDays: 35 },
  { title: 'Reserve room block for guests', category: 'logistics', dueInDays: 49 },
  { title: 'Choose and order florals', category: 'flowers', dueInDays: 70 },
  { title: 'Finalize seating chart', category: 'guests', dueInDays: 120 },
  { title: 'Confirm final headcount with caterer', category: 'catering', dueInDays: 150 },
]

const STARTER_TABLES: ReadonlyArray<{ name: string; capacity: number }> = [
  { name: 'Table 1 — Sweetheart', capacity: 2 },
  { name: 'Table 2 — Family', capacity: 10 },
  { name: 'Table 3 — Family', capacity: 10 },
  { name: 'Table 4 — Friends', capacity: 8 },
  { name: 'Table 5 — Friends', capacity: 8 },
]

/**
 * The caller's wedding row, or null. Every handler goes through this so the
 * ownership rule (wedding.user_id === caller) is enforced in one place.
 */
export async function findWeddingForUser(userId: string): Promise<Record<string, unknown> | null> {
  return findOne('weddings', [{ field: 'user_id', operator: '=', value: userId }])
}

/**
 * Create the starter wedding kit for a user who has none. Returns the
 * wedding id (existing or created). No-op once a wedding exists.
 */
export async function seedDemoForUser(userId: string): Promise<string> {
  const existing = await findWeddingForUser(userId)
  if (existing) return String(existing.id)

  // create() returns a MutationResult whose `data` is the inserted row.
  const weddingResult = await create('weddings', {
    user_id: userId,
    partner_a_name: DEFAULT_PARTNER_A,
    partner_b_name: DEFAULT_PARTNER_B,
    wedding_date: defaultWeddingDate().toISOString(),
    venue: 'Linden Hall Estate',
    rsvp_code: generateRsvpCode(),
    plus_ones_allowed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  if (!weddingResult.data) {
    throw new Error('wedding-planner seed: create(weddings) returned no row')
  }
  const weddingId = String(weddingResult.data.id)

  for (let i = 0; i < STARTER_MEALS.length; i++) {
    const meal = STARTER_MEALS[i]
    await create('rsvp_meals', {
      user_id: userId,
      wedding_id: weddingId,
      name: meal.name,
      description: meal.description,
      position: i,
      created_at: new Date().toISOString(),
    })
  }

  for (const guest of STARTER_GUESTS) {
    await create('guests', {
      user_id: userId,
      wedding_id: weddingId,
      name: guest.name,
      side: guest.side,
      group_name: guest.group_name ?? null,
      email: guest.email ?? null,
      rsvp_status: guest.rsvp_status,
      meal_choice: guest.meal_choice ?? null,
      plus_ones: guest.plus_ones ?? 0,
      responded_at: guest.rsvp_status === 'pending' ? null : new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  for (const item of STARTER_BUDGET) {
    await create('budget_items', {
      user_id: userId,
      wedding_id: weddingId,
      category: item.category,
      label: item.label,
      estimated_cents: item.estimated_cents,
      actual_cents: item.actual_cents ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  for (const vendor of STARTER_VENDORS) {
    await create('vendors', {
      user_id: userId,
      wedding_id: weddingId,
      category: vendor.category,
      name: vendor.name,
      contact: vendor.contact ?? null,
      status: vendor.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  const today = new Date()
  for (const task of STARTER_TASKS) {
    const due = new Date(today)
    due.setUTCDate(due.getUTCDate() + task.dueInDays)
    await create('tasks', {
      user_id: userId,
      wedding_id: weddingId,
      title: task.title,
      category: task.category,
      due_date: due.toISOString().slice(0, 10),
      done: task.done ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  const tableIds: string[] = []
  for (const table of STARTER_TABLES) {
    const row = await create('tables', {
      user_id: userId,
      wedding_id: weddingId,
      name: table.name,
      capacity: table.capacity,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    if (row.data) tableIds.push(String(row.data.id))
  }

  // Seat the first "yes" party at Table 2 (family) so the chart has shape.
  const familyTableId = tableIds[1]
  if (familyTableId) {
    const guests = await findMany<{ id: string; group_name: string | null }>('guests', {
      where: [{ field: 'wedding_id', operator: '=', value: weddingId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
      limit: 100,
    })
    for (const guest of guests.filter((g) => g.group_name === 'Whitfield family').slice(0, 3)) {
      await create('table_assignments', {
        user_id: userId,
        wedding_id: weddingId,
        table_id: familyTableId,
        guest_id: guest.id,
        created_at: new Date().toISOString(),
      })
    }
  }

  return weddingId
}

/** True when the user owns any guests rows (used by tests to assert seeding). */
export async function userHasGuests(userId: string): Promise<boolean> {
  return (await count('guests', [{ field: 'user_id', operator: '=', value: userId }])) > 0
}
