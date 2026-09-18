import type { MenuItem } from '../components/MenuItemCard.js'
import type { OrderStatus, OrderTicket } from '../components/OrderTicketCard.js'
import type { TableStatus, TableTileData } from '../components/TableTile.js'

/**
 * Curated sample data for the Hearth flagship template.
 *
 * These shapes mirror what the API will return once the
 * `restaurant-ordering` resource bonds are wired. The polish pipeline
 * uses them for screenshot fixtures and as a fallback when fetches
 * return empty/empty in dev.
 */

export const SAMPLE_ORDER_TICKETS: ReadonlyArray<OrderTicket> = [
  {
    id: '1042',
    number: '1042',
    table: 'Table 7',
    placedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    elapsedMinutes: 4,
    status: 'new' as OrderStatus,
    rush: true,
    totalCents: 5840,
    items: [
      { qty: 2, name: 'Margherita pizza' },
      { qty: 1, name: 'Caesar salad', note: 'no anchovies' },
      { qty: 2, name: 'Sparkling water' },
    ],
  },
  {
    id: '1041',
    number: '1041',
    table: 'Table 12',
    placedAt: new Date(Date.now() - 8 * 60_000).toISOString(),
    elapsedMinutes: 8,
    status: 'preparing' as OrderStatus,
    totalCents: 8420,
    items: [
      { qty: 1, name: 'Bistecca alla fiorentina', note: 'medium rare' },
      { qty: 1, name: 'Roasted root vegetables' },
      { qty: 2, name: 'House Chianti, glass' },
    ],
  },
  {
    id: '1040',
    number: '1040',
    table: 'Table 3',
    placedAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    elapsedMinutes: 12,
    status: 'preparing' as OrderStatus,
    totalCents: 4250,
    items: [
      { qty: 2, name: 'Spaghetti carbonara' },
      { qty: 1, name: 'Garlic bread' },
    ],
  },
  {
    id: '1039',
    number: '1039',
    table: 'Pickup',
    placedAt: new Date(Date.now() - 14 * 60_000).toISOString(),
    elapsedMinutes: 14,
    status: 'ready' as OrderStatus,
    totalCents: 3520,
    items: [
      { qty: 1, name: 'Chicken parmigiana sandwich' },
      { qty: 1, name: 'Side salad' },
      { qty: 1, name: 'Lemonade' },
    ],
  },
  {
    id: '1038',
    number: '1038',
    table: 'Table 5',
    placedAt: new Date(Date.now() - 22 * 60_000).toISOString(),
    elapsedMinutes: 22,
    status: 'ready' as OrderStatus,
    totalCents: 9620,
    items: [
      { qty: 1, name: 'Tasting menu (4-course)' },
      { qty: 1, name: 'Wine pairing' },
    ],
  },
  {
    id: '1037',
    number: '1037',
    table: 'Table 9',
    placedAt: new Date(Date.now() - 38 * 60_000).toISOString(),
    elapsedMinutes: 38,
    status: 'served' as OrderStatus,
    totalCents: 6280,
    items: [
      { qty: 2, name: 'Linguine alle vongole' },
      { qty: 1, name: 'Tiramisu' },
      { qty: 2, name: 'Espresso' },
    ],
  },
  {
    id: '1036',
    number: '1036',
    table: 'Table 14',
    placedAt: new Date(Date.now() - 51 * 60_000).toISOString(),
    elapsedMinutes: 51,
    status: 'served' as OrderStatus,
    totalCents: 4180,
    items: [
      { qty: 1, name: 'Risotto ai funghi' },
      { qty: 1, name: 'Panna cotta' },
    ],
  },
]

export const SAMPLE_TABLES: ReadonlyArray<TableTileData> = [
  { id: '1', label: '1', seats: 2, guests: 0, status: 'available' as TableStatus },
  {
    id: '2',
    label: '2',
    seats: 2,
    guests: 2,
    status: 'occupied' as TableStatus,
    server: 'Mira',
    ticketMinutes: 24,
  },
  {
    id: '3',
    label: '3',
    seats: 4,
    guests: 3,
    status: 'occupied' as TableStatus,
    server: 'Tomás',
    ticketMinutes: 12,
  },
  { id: '4', label: '4', seats: 4, guests: 0, status: 'reserved' as TableStatus, server: 'Kiya' },
  {
    id: '5',
    label: '5',
    seats: 6,
    guests: 4,
    status: 'occupied' as TableStatus,
    server: 'Mira',
    ticketMinutes: 22,
  },
  { id: '6', label: '6', seats: 2, guests: 0, status: 'dirty' as TableStatus },
  {
    id: '7',
    label: '7',
    seats: 6,
    guests: 6,
    status: 'occupied' as TableStatus,
    server: 'Linh',
    ticketMinutes: 4,
  },
  { id: '8', label: '8', seats: 2, guests: 0, status: 'available' as TableStatus },
  {
    id: '9',
    label: '9',
    seats: 4,
    guests: 4,
    status: 'occupied' as TableStatus,
    server: 'Tomás',
    ticketMinutes: 38,
  },
  { id: '10', label: '10', seats: 4, guests: 0, status: 'reserved' as TableStatus, server: 'Kiya' },
  { id: '11', label: '11', seats: 8, guests: 0, status: 'available' as TableStatus },
  {
    id: '12',
    label: '12',
    seats: 4,
    guests: 2,
    status: 'occupied' as TableStatus,
    server: 'Linh',
    ticketMinutes: 8,
  },
  {
    id: '14',
    label: '14',
    seats: 6,
    guests: 5,
    status: 'occupied' as TableStatus,
    server: 'Mira',
    ticketMinutes: 51,
  },
  { id: '15', label: '15', seats: 2, guests: 0, status: 'available' as TableStatus },
]

export const SAMPLE_MENU_ITEMS: ReadonlyArray<MenuItem> = [
  {
    id: 'i01',
    name: 'Margherita pizza',
    category: 'Mains',
    priceCents: 1600,
    description: 'Wood-fired naples-style with San Marzano tomato, fresh mozzarella, and basil.',
    dietary: ['vegetarian'],
  },
  {
    id: 'i02',
    name: 'Bistecca alla fiorentina',
    category: 'Mains',
    priceCents: 5400,
    description: 'Dry-aged porterhouse, grilled rare over coals, with rosemary and lemon.',
  },
  {
    id: 'i03',
    name: 'Linguine alle vongole',
    category: 'Pasta',
    priceCents: 2800,
    description: 'Hand-rolled linguine with manila clams, white wine, and garlic.',
  },
  {
    id: 'i04',
    name: 'Spaghetti carbonara',
    category: 'Pasta',
    priceCents: 2200,
    description: 'Egg yolk, guanciale, pecorino, black pepper. No cream — ever.',
    dietary: ['allergen'],
  },
  {
    id: 'i05',
    name: 'Caesar salad',
    category: 'Starters',
    priceCents: 1400,
    description: 'Little gem hearts, parmigiano, anchovy dressing, sourdough croutons.',
    dietary: ['vegetarian', 'allergen'],
  },
  {
    id: 'i06',
    name: 'Risotto ai funghi',
    category: 'Pasta',
    priceCents: 2600,
    description: 'Creamy carnaroli rice with porcini, chanterelles, and truffle oil.',
    dietary: ['vegetarian', 'gluten_free'],
  },
  {
    id: 'i07',
    name: 'Tiramisu',
    category: 'Desserts',
    priceCents: 1100,
    description: 'Espresso-soaked savoiardi, mascarpone cream, dusted with cocoa.',
    dietary: ['vegetarian', 'allergen'],
  },
  {
    id: 'i08',
    name: 'Panna cotta',
    category: 'Desserts',
    priceCents: 1000,
    discountCents: 800,
    description: 'Vanilla bean cream with seasonal berry compote.',
    dietary: ['vegetarian', 'gluten_free'],
  },
  {
    id: 'i09',
    name: 'Garden salad',
    category: 'Starters',
    priceCents: 1200,
    description: 'Mixed greens, heirloom tomato, cucumber, lemon vinaigrette.',
    dietary: ['vegan', 'gluten_free'],
  },
  {
    id: 'i10',
    name: 'Chicken parmigiana sandwich',
    category: 'Mains',
    priceCents: 1800,
    description: 'Buttermilk fried chicken, marinara, mozzarella, on a brioche roll.',
    dietary: ['spicy'],
  },
  {
    id: 'i11',
    name: 'Diavola pizza',
    category: 'Mains',
    priceCents: 1900,
    description: "Spicy 'nduja, calabrian chili, mozzarella, pickled chili.",
    dietary: ['spicy'],
  },
  {
    id: 'i12',
    name: 'Cacio e pepe',
    category: 'Pasta',
    priceCents: 2400,
    description: 'Tonnarelli, pecorino romano, freshly cracked black pepper.',
    dietary: ['vegetarian'],
  },
]

export const SAMPLE_HOURLY_REVENUE: ReadonlyArray<{ hour: string; cents: number }> = [
  { hour: '11', cents: 18000 },
  { hour: '12', cents: 42000 },
  { hour: '13', cents: 56000 },
  { hour: '14', cents: 38000 },
  { hour: '15', cents: 22000 },
  { hour: '16', cents: 19000 },
  { hour: '17', cents: 28000 },
  { hour: '18', cents: 64000 },
  { hour: '19', cents: 92000 },
  { hour: '20', cents: 108000 },
  { hour: '21', cents: 71000 },
  { hour: '22', cents: 39000 },
]

export const SAMPLE_TODAY_REVENUE_CENTS = SAMPLE_HOURLY_REVENUE.reduce((s, p) => s + p.cents, 0)
export const SAMPLE_YESTERDAY_REVENUE_CENTS = Math.round(SAMPLE_TODAY_REVENUE_CENTS * 0.92)
export const SAMPLE_REVENUE_CHANGE_CENTS =
  SAMPLE_TODAY_REVENUE_CENTS - SAMPLE_YESTERDAY_REVENUE_CENTS

export interface CustomerSummary {
  id: string
  name: string
  email: string
  phone?: string
  visits: number
  lifetimeCents: number
  lastVisit: string
  preferredSeating?: string
  vip?: boolean
}

export const SAMPLE_CUSTOMERS: ReadonlyArray<CustomerSummary> = [
  {
    id: 'c01',
    name: 'Amelia Howe',
    email: 'amelia@example.com',
    phone: '+1 (212) 555-0184',
    visits: 14,
    lifetimeCents: 184000,
    lastVisit: '2026-04-29',
    preferredSeating: 'Booth',
    vip: true,
  },
  {
    id: 'c02',
    name: 'Benjamin Otieno',
    email: 'ben.o@example.com',
    phone: '+1 (212) 555-0102',
    visits: 8,
    lifetimeCents: 96000,
    lastVisit: '2026-04-26',
    preferredSeating: 'Window',
  },
  {
    id: 'c03',
    name: 'Camille Reyes',
    email: 'cam@example.com',
    phone: '+1 (212) 555-0166',
    visits: 5,
    lifetimeCents: 51000,
    lastVisit: '2026-04-22',
  },
  {
    id: 'c04',
    name: 'Devon Park',
    email: 'devon@example.com',
    visits: 22,
    lifetimeCents: 312000,
    lastVisit: '2026-04-30',
    vip: true,
    preferredSeating: 'Bar',
  },
  {
    id: 'c05',
    name: 'Emiliano Costa',
    email: 'em@example.com',
    visits: 3,
    lifetimeCents: 28000,
    lastVisit: '2026-04-12',
  },
  {
    id: 'c06',
    name: 'Fenna Visser',
    email: 'fenna@example.com',
    visits: 11,
    lifetimeCents: 142000,
    lastVisit: '2026-04-28',
    preferredSeating: 'Patio',
  },
]

export interface ReservationRow {
  id: string
  partyName: string
  partySize: number
  isoTime: string
  table?: string
  status: 'confirmed' | 'seated' | 'waitlist' | 'cancelled'
  notes?: string
}

export const SAMPLE_RESERVATIONS: ReadonlyArray<ReservationRow> = [
  {
    id: 'r01',
    partyName: 'Howe',
    partySize: 2,
    isoTime: '2026-04-30T18:00:00Z',
    table: '4',
    status: 'confirmed',
  },
  {
    id: 'r02',
    partyName: 'Reyes',
    partySize: 4,
    isoTime: '2026-04-30T18:30:00Z',
    table: '10',
    status: 'confirmed',
    notes: 'Birthday — bring candle',
  },
  {
    id: 'r03',
    partyName: 'Park',
    partySize: 6,
    isoTime: '2026-04-30T19:00:00Z',
    table: '11',
    status: 'confirmed',
  },
  {
    id: 'r04',
    partyName: 'Visser',
    partySize: 3,
    isoTime: '2026-04-30T19:15:00Z',
    status: 'waitlist',
    notes: 'Patio if available',
  },
  {
    id: 'r05',
    partyName: 'Costa',
    partySize: 2,
    isoTime: '2026-04-30T19:30:00Z',
    table: '8',
    status: 'confirmed',
  },
  {
    id: 'r06',
    partyName: 'Otieno',
    partySize: 5,
    isoTime: '2026-04-30T20:00:00Z',
    table: '14',
    status: 'confirmed',
  },
  {
    id: 'r07',
    partyName: 'Singh',
    partySize: 2,
    isoTime: '2026-04-30T20:30:00Z',
    status: 'waitlist',
  },
  {
    id: 'r08',
    partyName: 'Aleko',
    partySize: 4,
    isoTime: '2026-04-30T17:30:00Z',
    table: '5',
    status: 'seated',
  },
]

export interface NotificationRow {
  id: string
  kind: 'kitchen_alert' | 'order_ready' | 'rush' | 'mention' | 'reservation' | 'low_stock'
  title: string
  body: string
  isoTime: string
  read?: boolean
}

export const SAMPLE_NOTIFICATIONS: ReadonlyArray<NotificationRow> = [
  {
    id: 'n01',
    kind: 'rush',
    title: 'Rush flagged: Table 7',
    body: 'Server pressed Rush — Margherita + Caesar are first up.',
    isoTime: '2026-04-30T17:45:00Z',
  },
  {
    id: 'n02',
    kind: 'order_ready',
    title: 'Order #1039 ready for pickup',
    body: 'Chicken parm sandwich + side salad. Bell rung 2 min ago.',
    isoTime: '2026-04-30T17:42:00Z',
  },
  {
    id: 'n03',
    kind: 'kitchen_alert',
    title: 'Bistecca, Table 12',
    body: 'Steak hit 12-min hold; expedite suggested.',
    isoTime: '2026-04-30T17:38:00Z',
  },
  {
    id: 'n04',
    kind: 'low_stock',
    title: 'Low stock: Caesar dressing',
    body: '3 portions remaining. Restock before dinner service.',
    isoTime: '2026-04-30T17:25:00Z',
    read: true,
  },
  {
    id: 'n05',
    kind: 'mention',
    title: 'Mira mentioned you in a note',
    body: '"Save the Park reservation, Devon is a regular."',
    isoTime: '2026-04-30T17:10:00Z',
    read: true,
  },
  {
    id: 'n06',
    kind: 'reservation',
    title: 'Howe (2) seated at Table 4',
    body: 'Confirmed reservation seated 6 min ago.',
    isoTime: '2026-04-30T17:00:00Z',
    read: true,
  },
]
