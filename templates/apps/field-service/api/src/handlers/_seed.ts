/**
 * field-service — per-user demo seeding.
 *
 * On the first authenticated request from a new user this module checks
 * whether the user has any customers yet. If not, it seeds a realistic
 * field-service snapshot (crew, address book, quotes with line items,
 * scheduled jobs with checklists and notes, invoices, notifications)
 * derived from the JSON fixtures in api/fixtures/. Every row is owned
 * by the caller's user_id, so it stays scoped per-user even though the
 * fixture content is shared.
 *
 * All money is integer cents. Timestamps use `__T±<offset>` tokens that
 * resolve relative to seed time, so the demo always shows "today's
 * jobs" today and this week's revenue this week.
 *
 * The seed is gated on count(customers). Once a user has customers,
 * subsequent calls become a no-op. Concurrent calls are guarded with
 * an in-memory `seedingInFlight` map to avoid double-seeding when a
 * fresh signup hits multiple endpoints simultaneously.
 */

import { count, create } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

const seededUsers = new Set<string>()
const seedingInFlight = new Map<string, Promise<void>>()

interface CustomerFixture {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string
  notes: string
}

interface TechnicianFixture {
  id: string
  name: string
  trade: string
  phone: string
  email: string
  skills: string[]
  active: boolean
}

interface ItemFixture {
  description: string
  qty: number
  unit: string
  rate_cents: number
}

interface QuoteFixture {
  id: string
  customer: string
  title: string
  status: 'draft' | 'sent' | 'accepted' | 'declined'
  valid_until: string
  notes: string
  items: ItemFixture[]
  sent_at?: string
  accepted_at?: string
  declined_at?: string
  created_at: string
}

interface ChecklistFixture {
  label: string
  done: boolean
  done_at?: string
}

interface NoteFixture {
  author: string
  body: string
  at: string
}

interface JobFixture {
  id: string
  customer: string
  quote?: string
  title: string
  description: string
  scheduled_start: string | null
  scheduled_end: string | null
  status: 'scheduled' | 'en_route' | 'in_progress' | 'completed' | 'cancelled'
  technician?: string
  completed_at?: string
  checklist: ChecklistFixture[]
  notes: NoteFixture[]
  created_at: string
}

interface InvoiceFixture {
  id: string
  job: string
  customer: string
  number: string
  status: 'draft' | 'sent' | 'paid'
  items: ItemFixture[]
  issued_at?: string
  sent_at?: string
  paid_at?: string
  created_at: string
}

interface NotificationFixture {
  id: string
  type: string
  title: string
  body: string
  href: string
  created_at: string
  unread: boolean
}

const CUSTOMERS: CustomerFixture[] = [
  {
    id: 'cus_001',
    name: 'Halberd Bakery',
    email: 'ops@halberdbakery.com',
    phone: '(555) 210-4417',
    address: '214 Grand St, Hoboken, NJ 07030',
    notes: 'Rooftop units; loading-dock access after 6am. Ask for Dorota.',
  },
  {
    id: 'cus_002',
    name: 'Cedar & Vine Dental',
    email: 'front@cedarandvine.dental',
    phone: '(555) 322-8890',
    address: '89 Cedar Ln, Montclair, NJ 07042',
    notes: 'After-hours work only — patients in the building weekdays.',
  },
  {
    id: 'cus_003',
    name: 'Jodie Marlowe',
    email: 'j.marlowe@homemail.com',
    phone: '(555) 441-9021',
    address: '7 Fern Way, Maplewood, NJ 07040',
    notes: '',
  },
  {
    id: 'cus_004',
    name: 'Northside Laundromat',
    email: 'manager@northsidelaundry.com',
    phone: '(555) 518-3344',
    address: '1330 Northside Ave, Newark, NJ 07107',
    notes: 'Coin-op store; call the manager before touching the dryers.',
  },
  {
    id: 'cus_005',
    name: 'Brookfield Property Group',
    email: 'facilities@brookfieldpg.com',
    phone: '(555) 627-7781',
    address: '400 Brookfield Plaza, Jersey City, NJ 07302',
    notes: 'Property manager for 6 units — always bill the unit, not the plaza office.',
  },
  {
    id: 'cus_006',
    name: 'Fern Hollow Cafe',
    email: 'hello@fernhollow.cafe',
    phone: '(555) 733-1290',
    address: '12 Fern Hollow Rd, South Orange, NJ 07079',
    notes: 'Service before 8am or after 3pm to miss the rush.',
  },
  {
    id: 'cus_007',
    name: 'Luis & Carmen Ortiz',
    email: 'l.ortiz@homemail.com',
    phone: '(555) 819-4402',
    address: '58 Lakeview Ter, Bloomfield, NJ 07003',
    notes: 'Two dogs — call ahead so they can crate them.',
  },
  {
    id: 'cus_008',
    name: 'Summit Gym',
    email: 'ops@summitgym.fit',
    phone: '(555) 902-6633',
    address: '9 Summit Plaza, Paterson, NJ 07501',
    notes: '',
  },
]

const TECHNICIANS: TechnicianFixture[] = [
  {
    id: 'tec_001',
    name: 'Ray Delgado',
    trade: 'hvac',
    phone: '(555) 101-2233',
    email: 'ray@toolbelt.test',
    skills: ['EPA 608 Universal', 'Heat pump cert'],
    active: true,
  },
  {
    id: 'tec_002',
    name: 'Priya Nair',
    trade: 'plumbing',
    phone: '(555) 102-3344',
    email: 'priya@toolbelt.test',
    skills: ['Backflow prevention'],
    active: true,
  },
  {
    id: 'tec_003',
    name: 'Marcus Webb',
    trade: 'electrical',
    phone: '(555) 103-4455',
    email: 'marcus@toolbelt.test',
    skills: ['Master electrician', 'OSHA 30'],
    active: true,
  },
  {
    id: 'tec_004',
    name: 'Dana Kowalski',
    trade: 'general',
    phone: '(555) 104-5566',
    email: 'dana@toolbelt.test',
    skills: ['Appliance repair'],
    active: true,
  },
  {
    id: 'tec_005',
    name: 'Tomás Rivera',
    trade: 'hvac',
    phone: '(555) 105-6677',
    email: 'tomas@toolbelt.test',
    skills: ['EPA 608 Universal'],
    active: true,
  },
  {
    id: 'tec_006',
    name: 'Grace Liu',
    trade: 'plumbing',
    phone: '(555) 106-7788',
    email: 'grace@toolbelt.test',
    skills: [],
    active: false,
  },
]

const QUOTES: QuoteFixture[] = [
  {
    id: 'quo_001',
    customer: 'cus_001',
    title: 'Rooftop A/C tune-up (2 units)',
    status: 'accepted',
    valid_until: '__T+9d',
    notes: 'Spring startup for both rooftop package units.',
    items: [
      { description: 'Seasonal tune-up — package unit', qty: 2, unit: 'each', rate_cents: 12900 },
      { description: 'Refrigerant top-up (R-410A)', qty: 1, unit: 'each', rate_cents: 18500 },
      { description: 'Belt + filter kit', qty: 2, unit: 'each', rate_cents: 4250 },
    ],
    sent_at: '__T-8d',
    accepted_at: '__T-6d',
    created_at: '__T-9d',
  },
  {
    id: 'quo_002',
    customer: 'cus_002',
    title: 'Water heater replacement',
    status: 'sent',
    valid_until: '__T+12d',
    notes: 'Heat pump unit sized for 4 operatory loads.',
    items: [
      { description: '50-gal heat pump water heater', qty: 1, unit: 'each', rate_cents: 189900 },
      { description: 'Removal & haul-away', qty: 1, unit: 'each', rate_cents: 12500 },
      { description: 'Expansion tank', qty: 1, unit: 'each', rate_cents: 8900 },
      { description: 'Supply line retrofit', qty: 1, unit: 'each', rate_cents: 14500 },
    ],
    sent_at: '__T-2d',
    created_at: '__T-3d',
  },
  {
    id: 'quo_003',
    customer: 'cus_004',
    title: 'Dryer vent deep clean (8 machines)',
    status: 'draft',
    valid_until: '__T+21d',
    notes: 'Lint buildup flagged on last inspection.',
    items: [
      { description: 'Vent line deep clean', qty: 8, unit: 'machine', rate_cents: 6500 },
      { description: 'Lint housing inspection', qty: 1, unit: 'each', rate_cents: 4500 },
    ],
    created_at: '__T-1d',
  },
  {
    id: 'quo_004',
    customer: 'cus_003',
    title: 'Sump pump replacement',
    status: 'declined',
    valid_until: '__T+4d',
    notes: '',
    items: [
      { description: '1/2 HP submersible sump pump', qty: 1, unit: 'each', rate_cents: 27900 },
      { description: 'Check valve', qty: 1, unit: 'each', rate_cents: 3200 },
      { description: 'Install labor', qty: 3, unit: 'hour', rate_cents: 9500 },
    ],
    declined_at: '__T-4d',
    created_at: '__T-7d',
  },
  {
    id: 'quo_005',
    customer: 'cus_008',
    title: 'Quarterly HVAC maintenance plan',
    status: 'accepted',
    valid_until: '__T+15d',
    notes: 'Four visits across the year, filters included.',
    items: [
      { description: 'Quarterly maintenance visit', qty: 4, unit: 'visit', rate_cents: 14900 },
      { description: 'Merv-11 filter set', qty: 4, unit: 'set', rate_cents: 5900 },
    ],
    sent_at: '__T-4d',
    accepted_at: '__T-3d',
    created_at: '__T-5d',
  },
  {
    id: 'quo_006',
    customer: 'cus_005',
    title: 'Unit 4B bathroom rough-in',
    status: 'sent',
    valid_until: '__T+10d',
    notes: 'Unit 4B is vacant — work any weekday 8am–5pm.',
    items: [
      { description: 'Copper repipe labor', qty: 8, unit: 'hour', rate_cents: 10500 },
      { description: 'Fixture set (lav + WC)', qty: 1, unit: 'each', rate_cents: 42500 },
      { description: 'Drywall patch & prep', qty: 1, unit: 'each', rate_cents: 7500 },
    ],
    sent_at: '__T-5h',
    created_at: '__T-1d5h',
  },
  {
    id: 'quo_007',
    customer: 'cus_006',
    title: 'Espresso machine descale + grinder service',
    status: 'draft',
    valid_until: '__T+18d',
    notes: '',
    items: [
      { description: 'Full descale service', qty: 2, unit: 'machine', rate_cents: 8500 },
      { description: 'Grinder burr replacement', qty: 1, unit: 'each', rate_cents: 11900 },
      { description: 'Water filtration kit', qty: 1, unit: 'each', rate_cents: 6400 },
    ],
    created_at: '__T-8h',
  },
]

const JOBS: JobFixture[] = [
  {
    id: 'job_001',
    customer: 'cus_001',
    quote: 'quo_001',
    title: 'Rooftop A/C tune-up (2 units)',
    description: 'Spring startup for both rooftop package units per accepted quote.',
    scheduled_start: '__T-2d2h',
    scheduled_end: '__T-2d5h',
    status: 'completed',
    technician: 'tec_001',
    completed_at: '__T-2d4h',
    checklist: [
      { label: 'Lockout/tagout rooftop disconnect', done: true, done_at: '__T-2d2h10m' },
      { label: 'Coil clean both units', done: true, done_at: '__T-2d3h' },
      { label: 'Check refrigerant pressures', done: true, done_at: '__T-2d3h40m' },
      { label: 'Replace belts + filters', done: true, done_at: '__T-2d4h' },
    ],
    notes: [
      {
        author: 'Ray Delgado',
        body: 'Unit 2 contactor was chattering — dressed the contacts, order a spare.',
        at: '__T-2d3h20m',
      },
      {
        author: 'Office',
        body: 'Customer asked to bundle the invoice with the reach-in cooler visit.',
        at: '__T-2d1h',
      },
    ],
    created_at: '__T-6d',
  },
  {
    id: 'job_002',
    customer: 'cus_003',
    title: 'Furnace no-heat call',
    description: 'No heat reported overnight; igniter suspected.',
    scheduled_start: '__T-1d6h',
    scheduled_end: '__T-1d4h',
    status: 'completed',
    technician: 'tec_003',
    completed_at: '__T-1d4h30m',
    checklist: [
      { label: 'Confirm fault code', done: true, done_at: '__T-1d5h50m' },
      { label: 'Replace hot-surface igniter', done: true, done_at: '__T-1d5h' },
      { label: 'Cycle test 3× and verify temps', done: true, done_at: '__T-1d4h40m' },
    ],
    notes: [
      {
        author: 'Marcus Webb',
        body: 'Igniter was cracked across the carrier. All good after swap.',
        at: '__T-1d5h10m',
      },
    ],
    created_at: '__T-1d8h',
  },
  {
    id: 'job_003',
    customer: 'cus_008',
    quote: 'quo_005',
    title: 'Q1 HVAC maintenance visit',
    description: 'First quarterly visit under the maintenance plan.',
    scheduled_start: '__T+3h',
    scheduled_end: '__T+5h',
    status: 'scheduled',
    technician: 'tec_005',
    checklist: [
      { label: 'Filter change — both air handlers', done: false },
      { label: 'Condenser coil rinse', done: false },
      { label: 'Thermostat program review', done: false },
    ],
    notes: [
      { author: 'Office', body: 'Front desk will let you in through the side door.', at: '__T-1d' },
    ],
    created_at: '__T-3d',
  },
  {
    id: 'job_004',
    customer: 'cus_004',
    title: 'Dryer #3 not heating',
    description: 'Gas dryer tumbles but produces no heat.',
    scheduled_start: '__T-1h30m',
    scheduled_end: '__T+30m',
    status: 'in_progress',
    technician: 'tec_004',
    checklist: [
      { label: 'Verify gas supply + valve', done: true, done_at: '__T-1h10m' },
      { label: 'Test thermal fuse', done: true, done_at: '__T-50m' },
      { label: 'Replace igniter if open', done: false },
      { label: 'Full heat cycle test', done: false },
    ],
    notes: [
      {
        author: 'Dana Kowalski',
        body: 'Thermal fuse is fine — coil reads open. Part van stock #44.',
        at: '__T-45m',
      },
    ],
    created_at: '__T-2d',
  },
  {
    id: 'job_005',
    customer: 'cus_002',
    title: 'Compressor noise inspection',
    description: 'Loud knocking from the rooftop compressor reported by building manager.',
    scheduled_start: '__T+30m',
    scheduled_end: '__T+2h30m',
    status: 'en_route',
    technician: 'tec_001',
    checklist: [
      { label: 'Record suction/discharge pressures', done: false },
      { label: 'Inspect mounting + isolators', done: false },
    ],
    notes: [],
    created_at: '__T-1d2h',
  },
  {
    id: 'job_006',
    customer: 'cus_006',
    title: 'Walk-in cooler gasket',
    description: 'Torn door gasket letting temps drift overnight.',
    scheduled_start: '__T+6h',
    scheduled_end: '__T+7h30m',
    status: 'scheduled',
    checklist: [
      { label: 'Measure gasket channel', done: false },
      { label: 'Fit replacement gasket', done: false },
    ],
    notes: [],
    created_at: '__T-10h',
  },
  {
    id: 'job_007',
    customer: 'cus_007',
    title: 'Ceiling fan install',
    description: 'Replace bedroom light fixture with ceiling fan; box rated for fans already.',
    scheduled_start: '__T+1d2h',
    scheduled_end: '__T+1d4h',
    status: 'scheduled',
    technician: 'tec_002',
    checklist: [
      { label: 'Kill breaker + verify', done: false },
      { label: 'Mount fan rated box', done: false },
      { label: 'Balance blades', done: false },
    ],
    notes: [
      { author: 'Office', body: 'Customer will crate the dogs before arrival.', at: '__T-4h' },
    ],
    created_at: '__T-2d',
  },
  {
    id: 'job_008',
    customer: 'cus_005',
    quote: 'quo_006',
    title: 'Unit 2A faucet leak',
    description: 'Kitchen faucet dripping; cartridge replacement expected.',
    scheduled_start: '__T+2d1h',
    scheduled_end: '__T+2d2h30m',
    status: 'scheduled',
    technician: 'tec_002',
    checklist: [
      { label: 'Shut-off under sink', done: false },
      { label: 'Replace cartridge', done: false },
      { label: 'Leak check 10 min', done: false },
    ],
    notes: [],
    created_at: '__T-1d3h',
  },
  {
    id: 'job_009',
    customer: 'cus_001',
    title: 'Reach-in cooler running warm',
    description: 'Ambient +14°F over setpoint since yesterday.',
    scheduled_start: '__T+3d4h',
    scheduled_end: '__T+3d6h',
    status: 'scheduled',
    checklist: [
      { label: 'Check condenser coil for dust', done: false },
      { label: 'Verify door seal + gasket', done: false },
      { label: 'Log pressures', done: false },
    ],
    notes: [],
    created_at: '__T-6h',
  },
  {
    id: 'job_010',
    customer: 'cus_004',
    title: 'Boiler annual inspection',
    description: 'Annual low-water cutoff + safety valve inspection.',
    scheduled_start: '__T-3d2h',
    scheduled_end: '__T-3d5h',
    status: 'completed',
    technician: 'tec_003',
    completed_at: '__T-3d4h',
    checklist: [
      { label: 'Low-water cutoff flush', done: true, done_at: '__T-3d3h' },
      { label: 'Safety valve pop test', done: true, done_at: '__T-3d4h' },
      { label: 'Flue gas reading', done: true, done_at: '__T-3d4h20m' },
    ],
    notes: [
      { author: 'Marcus Webb', body: 'Passed. Recommend descaling next season.', at: '__T-3d4h' },
    ],
    created_at: '__T-6d',
  },
  {
    id: 'job_011',
    customer: 'cus_008',
    title: 'Treadmill electrical fault',
    description: 'Treadmill 4 trips the GFCI on startup.',
    scheduled_start: '__T-2d1h',
    scheduled_end: '__T-2d3h',
    status: 'cancelled',
    technician: 'tec_004',
    checklist: [],
    notes: [
      {
        author: 'Office',
        body: 'Customer cancelled — equipment under maker warranty.',
        at: '__T-2d2h',
      },
    ],
    created_at: '__T-3d',
  },
  {
    id: 'job_012',
    customer: 'cus_006',
    title: 'Grease trap pump-out',
    description: 'Quarterly pump-out per health department schedule.',
    scheduled_start: '__T-5d2h',
    scheduled_end: '__T-5d4h',
    status: 'completed',
    technician: 'tec_004',
    completed_at: '__T-5d3h30m',
    checklist: [
      { label: 'Pump trap to grease line', done: true, done_at: '__T-5d3h' },
      { label: 'Scrape baffles', done: true, done_at: '__T-5d3h30m' },
    ],
    notes: [],
    created_at: '__T-8d',
  },
  {
    id: 'job_013',
    customer: 'cus_005',
    title: 'Hallway lighting retrofit',
    description: 'Swap 12 troffers to LED across floors 1–3 common areas.',
    scheduled_start: '__T-6d1h',
    scheduled_end: '__T-6d7h',
    status: 'completed',
    technician: 'tec_003',
    completed_at: '__T-6d6h30m',
    checklist: [
      { label: 'Kill hallway circuits per floor', done: true, done_at: '__T-6d1h10m' },
      { label: 'Swap 12 troffers', done: true, done_at: '__T-6d5h' },
      { label: 'Illumination spot check', done: true, done_at: '__T-6d6h' },
    ],
    notes: [],
    created_at: '__T-9d',
  },
]

const INVOICES: InvoiceFixture[] = [
  {
    id: 'inv_001',
    job: 'job_001',
    customer: 'cus_001',
    number: 'INV-1041',
    status: 'paid',
    items: [
      { description: 'Seasonal tune-up — package unit', qty: 2, unit: 'each', rate_cents: 12900 },
      { description: 'Refrigerant top-up (R-410A)', qty: 1, unit: 'each', rate_cents: 18500 },
      { description: 'Belt + filter kit', qty: 2, unit: 'each', rate_cents: 4250 },
    ],
    issued_at: '__T-2d3h',
    sent_at: '__T-2d3h',
    paid_at: '__T-1d2h',
    created_at: '__T-2d3h',
  },
  {
    id: 'inv_002',
    job: 'job_002',
    customer: 'cus_003',
    number: 'INV-1042',
    status: 'paid',
    items: [
      { description: 'Diagnostic visit', qty: 1, unit: 'each', rate_cents: 8900 },
      { description: 'Hot-surface igniter assembly', qty: 1, unit: 'each', rate_cents: 14200 },
      { description: 'Install labor', qty: 1.5, unit: 'hour', rate_cents: 9500 },
    ],
    issued_at: '__T-1d4h',
    sent_at: '__T-1d4h',
    paid_at: '__T-20h',
    created_at: '__T-1d4h',
  },
  {
    id: 'inv_003',
    job: 'job_010',
    customer: 'cus_004',
    number: 'INV-1043',
    status: 'sent',
    items: [
      { description: 'Boiler annual inspection', qty: 1, unit: 'each', rate_cents: 19900 },
      { description: 'Gasket set', qty: 1, unit: 'each', rate_cents: 3600 },
      { description: 'Labor', qty: 2, unit: 'hour', rate_cents: 9500 },
    ],
    issued_at: '__T-1d3h',
    sent_at: '__T-1d3h',
    created_at: '__T-1d3h',
  },
  {
    id: 'inv_004',
    job: 'job_012',
    customer: 'cus_006',
    number: 'INV-1040',
    status: 'paid',
    items: [
      { description: 'Grease trap pump-out', qty: 1, unit: 'each', rate_cents: 22500 },
      { description: 'Haul-away & disposal', qty: 1, unit: 'each', rate_cents: 6500 },
    ],
    issued_at: '__T-5d4h',
    sent_at: '__T-5d4h',
    paid_at: '__T-3d',
    created_at: '__T-5d4h',
  },
  {
    id: 'inv_005',
    job: 'job_013',
    customer: 'cus_005',
    number: 'INV-1044',
    status: 'draft',
    items: [
      { description: 'LED troffer 4000K', qty: 12, unit: 'each', rate_cents: 8900 },
      { description: 'Retrofit labor', qty: 6, unit: 'hour', rate_cents: 10500 },
    ],
    created_at: '__T-6d7h',
  },
]

const NOTIFICATIONS: NotificationFixture[] = [
  {
    id: 'ntf_001',
    type: 'quote_accepted',
    title: 'Quote accepted — Summit Gym',
    body: 'Quarterly HVAC maintenance plan ($832.00). Ready to schedule the first visit.',
    href: '/quotes',
    created_at: '__T-3d',
    unread: true,
  },
  {
    id: 'ntf_002',
    type: 'job_unassigned',
    title: '2 jobs need a technician',
    body: 'Walk-in cooler gasket and Reach-in cooler running warm have no tech assigned.',
    href: '/dispatch',
    created_at: '__T-1h',
    unread: true,
  },
  {
    id: 'ntf_003',
    type: 'invoice_paid',
    title: 'Payment received — INV-1042',
    body: 'Jodie Marlowe paid $373.50. Thank-you note queued.',
    href: '/invoices',
    created_at: '__T-20h',
    unread: true,
  },
  {
    id: 'ntf_004',
    type: 'job_completed',
    title: 'Job completed — Furnace no-heat call',
    body: 'Marcus Webb closed the job. Draft invoice ready to send.',
    href: '/jobs',
    created_at: '__T-1d4h',
    unread: false,
  },
  {
    id: 'ntf_005',
    type: 'system_message',
    title: 'Welcome to Toolbelt',
    body: 'Add a customer, write a quote, and dispatch your first job.',
    href: '/dashboard',
    created_at: '__T-2d',
    unread: false,
  },
]

/** Resolve `__T-3h12m`, `__T+4d`, `__T-30s` into ISO strings relative to now. */
function tStamp(token: string, now: number): string {
  if (!token.startsWith('__T')) return token
  const m = /__T([+-])(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(token)
  if (!m) return new Date(now).toISOString()
  const sign = m[1] === '-' ? -1 : 1
  const days = Number(m[2] ?? 0)
  const hours = Number(m[3] ?? 0)
  const mins = Number(m[4] ?? 0)
  const secs = Number(m[5] ?? 0)
  const offset = sign * (days * 86_400_000 + hours * 3_600_000 + mins * 60_000 + secs * 1000)
  return new Date(now + offset).toISOString()
}

const lineTotalCents = (items: readonly ItemFixture[]): number =>
  items.reduce((sum, it) => sum + Math.round(it.qty * it.rate_cents), 0)

/**
 * Seed demo content for a single user, idempotently.
 *
 * Returns immediately if the user is already seeded.
 */
export async function seedDemoForUser(userId: string): Promise<void> {
  if (seededUsers.has(userId)) return
  const inFlight = seedingInFlight.get(userId)
  if (inFlight) return inFlight

  const promise = (async () => {
    const existing = await count('customers', [{ field: 'owner_id', operator: '=', value: userId }])
    if (existing > 0) {
      seededUsers.add(userId)
      return
    }

    const now = Date.now()
    const customerMap = new Map<string, string>()
    const technicianMap = new Map<string, string>()
    const quoteMap = new Map<string, string>()
    const jobMap = new Map<string, string>()

    for (const c of CUSTOMERS) {
      const r = await create('customers', {
        owner_id: userId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        notes: c.notes,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      })
      const dbId = (r.data as { id?: string } | null)?.id
      if (dbId) customerMap.set(c.id, dbId)
    }

    for (const t of TECHNICIANS) {
      const r = await create('technicians', {
        owner_id: userId,
        name: t.name,
        trade: t.trade,
        phone: t.phone,
        email: t.email,
        skills: t.skills,
        active: t.active,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      })
      const dbId = (r.data as { id?: string } | null)?.id
      if (dbId) technicianMap.set(t.id, dbId)
    }

    for (const q of QUOTES) {
      const customerDbId = customerMap.get(q.customer)
      if (!customerDbId) continue
      const totalCents = lineTotalCents(q.items)
      const r = await create('quotes', {
        owner_id: userId,
        customer_id: customerDbId,
        title: q.title,
        status: q.status,
        valid_until: tStamp(q.valid_until, now),
        total_cents: totalCents,
        notes: q.notes,
        sent_at: q.sent_at ? tStamp(q.sent_at, now) : null,
        accepted_at: q.accepted_at ? tStamp(q.accepted_at, now) : null,
        declined_at: q.declined_at ? tStamp(q.declined_at, now) : null,
        created_at: tStamp(q.created_at, now),
        updated_at: new Date(now).toISOString(),
      })
      const dbId = (r.data as { id?: string } | null)?.id
      if (dbId) {
        quoteMap.set(q.id, dbId)
        let position = 1
        for (const it of q.items) {
          await create('quote_items', {
            quote_id: dbId,
            description: it.description,
            qty: it.qty,
            unit: it.unit,
            rate_cents: it.rate_cents,
            position: position++,
            created_at: tStamp(q.created_at, now),
          })
        }
      }
    }

    for (const j of JOBS) {
      const customerDbId = customerMap.get(j.customer)
      if (!customerDbId) continue
      const quoteDbId = j.quote ? (quoteMap.get(j.quote) ?? null) : null
      const sourceCustomer = CUSTOMERS.find((c) => c.id === j.customer)
      const technicianDbId = j.technician ? (technicianMap.get(j.technician) ?? null) : null
      const r = await create('jobs', {
        owner_id: userId,
        customer_id: customerDbId,
        quote_id: quoteDbId,
        title: j.title,
        description: j.description,
        address: sourceCustomer?.address ?? '',
        scheduled_start: j.scheduled_start ? tStamp(j.scheduled_start, now) : null,
        scheduled_end: j.scheduled_end ? tStamp(j.scheduled_end, now) : null,
        status: j.status,
        technician_id: technicianDbId,
        completed_at: j.completed_at ? tStamp(j.completed_at, now) : null,
        cancelled_at: j.status === 'cancelled' ? tStamp(j.created_at, now) : null,
        created_at: tStamp(j.created_at, now),
        updated_at: new Date(now).toISOString(),
      })
      const dbId = (r.data as { id?: string } | null)?.id
      if (!dbId) continue
      jobMap.set(j.id, dbId)
      for (const cl of j.checklist) {
        await create('job_checklist', {
          job_id: dbId,
          label: cl.label,
          done: cl.done,
          done_at: cl.done_at ? tStamp(cl.done_at, now) : null,
          created_at: tStamp(j.created_at, now),
        })
      }
      for (const n of j.notes) {
        await create('job_notes', {
          job_id: dbId,
          author: n.author,
          body: n.body,
          created_at: tStamp(n.at, now),
        })
      }
    }

    for (const i of INVOICES) {
      const jobDbId = jobMap.get(i.job)
      const customerDbId = customerMap.get(i.customer)
      if (!jobDbId || !customerDbId) continue
      const totalCents = lineTotalCents(i.items)
      const r = await create('invoices', {
        owner_id: userId,
        job_id: jobDbId,
        customer_id: customerDbId,
        number: i.number,
        status: i.status,
        total_cents: totalCents,
        issued_at: i.issued_at ? tStamp(i.issued_at, now) : null,
        sent_at: i.sent_at ? tStamp(i.sent_at, now) : null,
        paid_at: i.paid_at ? tStamp(i.paid_at, now) : null,
        notes: '',
        created_at: tStamp(i.created_at, now),
        updated_at: new Date(now).toISOString(),
      })
      const dbId = (r.data as { id?: string } | null)?.id
      if (dbId) {
        let position = 1
        for (const it of i.items) {
          await create('invoice_items', {
            invoice_id: dbId,
            description: it.description,
            qty: it.qty,
            unit: it.unit,
            rate_cents: it.rate_cents,
            position: position++,
            created_at: tStamp(i.created_at, now),
          })
        }
      }
    }

    for (const n of NOTIFICATIONS) {
      const created = tStamp(n.created_at, now)
      await create('notifications', {
        user_id: userId,
        kind: n.type,
        title: n.title,
        body: n.body,
        link: n.href,
        payload: null,
        read_at: n.unread ? null : created,
        created_at: created,
      })
    }

    seededUsers.add(userId)
  })()

  seedingInFlight.set(userId, promise)
  try {
    await promise
  } catch (err) {
    logger.error('[field-service/_seed] Failed to seed demo data:', err)
    throw err
  } finally {
    seedingInFlight.delete(userId)
  }
}
