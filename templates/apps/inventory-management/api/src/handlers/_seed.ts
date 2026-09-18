/**
 * Per-user demo seed for inventory-management.
 *
 * On a freshly-signed-up account this writes a small, realistic op-floor:
 *   - 4 warehouses (Reno, Memphis, Newark, Atlanta)
 *   - 18 products across 5 categories (with cost / sell / threshold)
 *   - stock_levels distributed across warehouses (some healthy, some low)
 *   - ~30 stock_movements (recent inbound/outbound/transfer/adjustment activity)
 *   - 3 alert rules (low_stock + per-warehouse)
 *   - 4 inventory_alerts (active low-stock signals derived from the seeded levels)
 *   - 2 stock transfers (one pending, one completed)
 *   - 4 orders (mix of inbound POs and outbound SOs, with line items)
 *   - 3 system notifications (cycle-count complete, channel paused, monthly report)
 *
 * The seed is idempotent: it checks for existing rows scoped to the user_id
 * before inserting and is safe to call multiple times.
 *
 * The seed is invoked lazily from any read endpoint that drives the
 * dashboard or list views, so a brand-new user immediately sees realistic
 * data instead of the FALLBACK constants the pages used to fall back to.
 *
 * @module
 */

import { count, create, findMany } from '@molecule/api-database'

interface WarehouseSeed {
  name: string
  code: string
  city: string
  country: string
  capacity: number
  contact_name: string
  contact_email: string
}

interface ProductSeed {
  name: string
  sku: string
  category: string
  unit: string
  cost_price: number
  sell_price: number
  description: string
  low_stock_threshold: number
}

interface StockSeed {
  sku: string
  warehouseCode: string
  quantity: number
}

interface MovementSeed {
  sku: string
  warehouseCode: string
  quantity_change: number
  reason: string
  reference?: string
  minutes_ago: number
}

interface NotificationSeed {
  icon: string
  title: string
  body: string
  href?: string
  read: boolean
  hours_ago: number
}

const WAREHOUSE_SEED: WarehouseSeed[] = [
  {
    name: 'Reno DC',
    code: 'RENO-1',
    city: 'Reno',
    country: 'USA',
    capacity: 24000,
    contact_name: 'Aisha Patel',
    contact_email: 'aisha@locus.dev',
  },
  {
    name: 'Memphis Hub',
    code: 'MEM-DC',
    city: 'Memphis',
    country: 'USA',
    capacity: 32000,
    contact_name: 'Marcus Chen',
    contact_email: 'marcus@locus.dev',
  },
  {
    name: 'Newark Crossdock',
    code: 'NWK-XD',
    city: 'Newark',
    country: 'USA',
    capacity: 12000,
    contact_name: 'Lina Soto',
    contact_email: 'lina@locus.dev',
  },
  {
    name: 'Atlanta Yard',
    code: 'ATL-Y',
    city: 'Atlanta',
    country: 'USA',
    capacity: 18000,
    contact_name: 'Demarco Wells',
    contact_email: 'demarco@locus.dev',
  },
]

const PRODUCT_SEED: ProductSeed[] = [
  // Plumbing
  {
    name: 'Azimuth coil-tubing 1/2"',
    sku: 'AZR-104',
    category: 'Plumbing',
    unit: 'each',
    cost_price: 42.5,
    sell_price: 79.0,
    description: 'Annealed copper coil for refrigeration and chilled-water lines.',
    low_stock_threshold: 60,
  },
  {
    name: 'Azimuth coupler kit',
    sku: 'AZR-104A',
    category: 'Plumbing',
    unit: 'kit',
    cost_price: 15.0,
    sell_price: 32.0,
    description: 'Compression couplers for AZR-104.',
    low_stock_threshold: 30,
  },
  {
    name: 'Azimuth tubing cutter',
    sku: 'AZR-205',
    category: 'Plumbing',
    unit: 'each',
    cost_price: 98.0,
    sell_price: 175.0,
    description: 'Heavy-duty tubing cutter, 1/8 to 1-1/8 inch.',
    low_stock_threshold: 8,
  },
  // Lighting
  {
    name: 'Beacon LED driver 60W',
    sku: 'BKN-220',
    category: 'Lighting',
    unit: 'each',
    cost_price: 28.4,
    sell_price: 64.0,
    description: '60W constant-current LED driver, 277V.',
    low_stock_threshold: 20,
  },
  {
    name: 'Beacon LED panel 2x4',
    sku: 'BKN-340',
    category: 'Lighting',
    unit: 'each',
    cost_price: 92.0,
    sell_price: 168.0,
    description: 'Edge-lit 2x4 LED panel, 5000K.',
    low_stock_threshold: 24,
  },
  // Packaging
  {
    name: 'Cedar pallet shrink wrap',
    sku: 'CDR-018',
    category: 'Packaging',
    unit: 'roll',
    cost_price: 18.0,
    sell_price: 39.0,
    description: '20" x 1500ft hand stretch wrap.',
    low_stock_threshold: 30,
  },
  {
    name: 'Cedar pallet bands',
    sku: 'CDR-022',
    category: 'Packaging',
    unit: 'roll',
    cost_price: 24.5,
    sell_price: 52.0,
    description: 'High-tensile poly strapping, 1/2".',
    low_stock_threshold: 16,
  },
  {
    name: 'Echo packing tape 48mm',
    sku: 'EHO-330',
    category: 'Packaging',
    unit: 'roll',
    cost_price: 4.2,
    sell_price: 12.0,
    description: 'Heavy-duty acrylic packing tape, 48mm x 100m.',
    low_stock_threshold: 200,
  },
  // PPE
  {
    name: 'Delta nitrile gloves M',
    sku: 'DLT-007',
    category: 'PPE',
    unit: 'box',
    cost_price: 11.4,
    sell_price: 21.0,
    description: 'Disposable nitrile gloves, medium, box of 100.',
    low_stock_threshold: 60,
  },
  {
    name: 'Delta nitrile gloves L',
    sku: 'DLT-008',
    category: 'PPE',
    unit: 'box',
    cost_price: 11.4,
    sell_price: 21.0,
    description: 'Disposable nitrile gloves, large, box of 100.',
    low_stock_threshold: 60,
  },
  {
    name: 'Isotope safety glasses',
    sku: 'ISO-271',
    category: 'PPE',
    unit: 'each',
    cost_price: 6.8,
    sell_price: 14.0,
    description: 'ANSI Z87.1 polycarbonate safety glasses.',
    low_stock_threshold: 80,
  },
  // Hardware
  {
    name: 'Foxtrot rivet bolt 3/8"',
    sku: 'FRX-101',
    category: 'Hardware',
    unit: 'box',
    cost_price: 38.0,
    sell_price: 68.0,
    description: 'Stainless 304 rivet bolts, 3/8" x 1-1/2", box of 50.',
    low_stock_threshold: 40,
  },
  {
    name: 'Gantry hoist hook XL',
    sku: 'GNT-558',
    category: 'Hardware',
    unit: 'each',
    cost_price: 145.0,
    sell_price: 248.0,
    description: 'Forged steel hoist hook, 2-ton SWL.',
    low_stock_threshold: 6,
  },
  {
    name: 'Horizon nylon rope 12mm',
    sku: 'HRZ-422',
    category: 'Hardware',
    unit: 'spool',
    cost_price: 62.0,
    sell_price: 119.0,
    description: 'Triple-braided nylon rope, 12mm x 600ft.',
    low_stock_threshold: 12,
  },
  {
    name: 'Jet stream coupling kit',
    sku: 'JET-094',
    category: 'Hardware',
    unit: 'kit',
    cost_price: 39.0,
    sell_price: 72.0,
    description: 'Quick-connect coupling kit, NPT 1/2", set of 8.',
    low_stock_threshold: 24,
  },
  // Tools
  {
    name: 'Kestrel cordless drill 18V',
    sku: 'KST-110',
    category: 'Tools',
    unit: 'each',
    cost_price: 124.0,
    sell_price: 219.0,
    description: 'Brushless 18V cordless drill, 0.5-inch chuck.',
    low_stock_threshold: 10,
  },
  {
    name: 'Latitude torque wrench',
    sku: 'LTD-502',
    category: 'Tools',
    unit: 'each',
    cost_price: 89.0,
    sell_price: 159.0,
    description: 'Click-style torque wrench, 1/2" drive, 30-250 ft-lb.',
    low_stock_threshold: 8,
  },
  {
    name: 'Mariner pipe wrench 24"',
    sku: 'MRN-260',
    category: 'Tools',
    unit: 'each',
    cost_price: 54.0,
    sell_price: 98.0,
    description: 'Cast iron pipe wrench, 24" handle.',
    low_stock_threshold: 12,
  },
]

// stock distribution: hand-tuned so the dashboard has a realistic mix of
// healthy / low / out-of-stock items per the thresholds above.
const STOCK_SEED: StockSeed[] = [
  // AZR-104 — low at Reno, healthy elsewhere
  { sku: 'AZR-104', warehouseCode: 'RENO-1', quantity: 4 },
  { sku: 'AZR-104', warehouseCode: 'MEM-DC', quantity: 410 },
  { sku: 'AZR-104', warehouseCode: 'NWK-XD', quantity: 84 },
  { sku: 'AZR-104', warehouseCode: 'ATL-Y', quantity: 12 },
  // AZR-104A — healthy
  { sku: 'AZR-104A', warehouseCode: 'RENO-1', quantity: 92 },
  { sku: 'AZR-104A', warehouseCode: 'MEM-DC', quantity: 78 },
  // AZR-205 — single-warehouse
  { sku: 'AZR-205', warehouseCode: 'RENO-1', quantity: 22 },
  // BKN-220 — out of stock at Memphis (the iconic dashboard alert)
  { sku: 'BKN-220', warehouseCode: 'MEM-DC', quantity: 0 },
  { sku: 'BKN-220', warehouseCode: 'NWK-XD', quantity: 36 },
  { sku: 'BKN-220', warehouseCode: 'ATL-Y', quantity: 18 },
  // BKN-340 — healthy
  { sku: 'BKN-340', warehouseCode: 'MEM-DC', quantity: 112 },
  { sku: 'BKN-340', warehouseCode: 'ATL-Y', quantity: 48 },
  // CDR-018 — low
  { sku: 'CDR-018', warehouseCode: 'RENO-1', quantity: 9 },
  { sku: 'CDR-018', warehouseCode: 'MEM-DC', quantity: 82 },
  // CDR-022 — healthy
  { sku: 'CDR-022', warehouseCode: 'RENO-1', quantity: 38 },
  { sku: 'CDR-022', warehouseCode: 'NWK-XD', quantity: 54 },
  // EHO-330 — flagship product, top mover
  { sku: 'EHO-330', warehouseCode: 'RENO-1', quantity: 480 },
  { sku: 'EHO-330', warehouseCode: 'MEM-DC', quantity: 1450 },
  { sku: 'EHO-330', warehouseCode: 'NWK-XD', quantity: 320 },
  { sku: 'EHO-330', warehouseCode: 'ATL-Y', quantity: 280 },
  // DLT-007 — low at Newark
  { sku: 'DLT-007', warehouseCode: 'RENO-1', quantity: 124 },
  { sku: 'DLT-007', warehouseCode: 'MEM-DC', quantity: 96 },
  { sku: 'DLT-007', warehouseCode: 'NWK-XD', quantity: 22 },
  { sku: 'DLT-007', warehouseCode: 'ATL-Y', quantity: 88 },
  // DLT-008 — healthy
  { sku: 'DLT-008', warehouseCode: 'MEM-DC', quantity: 144 },
  { sku: 'DLT-008', warehouseCode: 'ATL-Y', quantity: 102 },
  // ISO-271 — healthy
  { sku: 'ISO-271', warehouseCode: 'MEM-DC', quantity: 410 },
  { sku: 'ISO-271', warehouseCode: 'RENO-1', quantity: 168 },
  // FRX-101 — healthy
  { sku: 'FRX-101', warehouseCode: 'MEM-DC', quantity: 312 },
  { sku: 'FRX-101', warehouseCode: 'NWK-XD', quantity: 124 },
  // GNT-558 — single
  { sku: 'GNT-558', warehouseCode: 'MEM-DC', quantity: 14 },
  // HRZ-422 — healthy
  { sku: 'HRZ-422', warehouseCode: 'RENO-1', quantity: 28 },
  { sku: 'HRZ-422', warehouseCode: 'ATL-Y', quantity: 22 },
  // JET-094
  { sku: 'JET-094', warehouseCode: 'MEM-DC', quantity: 64 },
  // KST-110 — premium tool, low everywhere
  { sku: 'KST-110', warehouseCode: 'RENO-1', quantity: 8 },
  { sku: 'KST-110', warehouseCode: 'MEM-DC', quantity: 18 },
  // LTD-502
  { sku: 'LTD-502', warehouseCode: 'RENO-1', quantity: 14 },
  { sku: 'LTD-502', warehouseCode: 'MEM-DC', quantity: 12 },
  // MRN-260
  { sku: 'MRN-260', warehouseCode: 'NWK-XD', quantity: 32 },
]

const MOVEMENT_SEED: MovementSeed[] = [
  {
    sku: 'AZR-104',
    warehouseCode: 'RENO-1',
    quantity_change: 240,
    reason: 'receive',
    reference: 'PO-4419',
    minutes_ago: 8,
  },
  {
    sku: 'BKN-220',
    warehouseCode: 'MEM-DC',
    quantity_change: -12,
    reason: 'shipment',
    reference: 'SO-882',
    minutes_ago: 22,
  },
  {
    sku: 'CDR-018',
    warehouseCode: 'RENO-1',
    quantity_change: -60,
    reason: 'transfer_out',
    reference: 'transfer:rebalance',
    minutes_ago: 47,
  },
  {
    sku: 'CDR-018',
    warehouseCode: 'MEM-DC',
    quantity_change: 60,
    reason: 'transfer_in',
    reference: 'transfer:rebalance',
    minutes_ago: 47,
  },
  {
    sku: 'DLT-007',
    warehouseCode: 'NWK-XD',
    quantity_change: -3,
    reason: 'adjustment',
    reference: 'cycle-count-variance',
    minutes_ago: 95,
  },
  {
    sku: 'EHO-330',
    warehouseCode: 'MEM-DC',
    quantity_change: 480,
    reason: 'receive',
    reference: 'PO-4421',
    minutes_ago: 130,
  },
  {
    sku: 'EHO-330',
    warehouseCode: 'RENO-1',
    quantity_change: -42,
    reason: 'shipment',
    reference: 'SO-884',
    minutes_ago: 240,
  },
  {
    sku: 'FRX-101',
    warehouseCode: 'MEM-DC',
    quantity_change: 100,
    reason: 'receive',
    reference: 'PO-4420',
    minutes_ago: 360,
  },
  {
    sku: 'BKN-340',
    warehouseCode: 'ATL-Y',
    quantity_change: -8,
    reason: 'shipment',
    reference: 'SO-885',
    minutes_ago: 480,
  },
  {
    sku: 'HRZ-422',
    warehouseCode: 'RENO-1',
    quantity_change: 12,
    reason: 'receive',
    reference: 'PO-4418',
    minutes_ago: 640,
  },
  {
    sku: 'JET-094',
    warehouseCode: 'MEM-DC',
    quantity_change: -2,
    reason: 'adjustment',
    reference: 'damage',
    minutes_ago: 720,
  },
  {
    sku: 'KST-110',
    warehouseCode: 'RENO-1',
    quantity_change: -1,
    reason: 'shipment',
    reference: 'SO-879',
    minutes_ago: 900,
  },
  {
    sku: 'AZR-205',
    warehouseCode: 'RENO-1',
    quantity_change: 10,
    reason: 'receive',
    reference: 'PO-4417',
    minutes_ago: 1080,
  },
  {
    sku: 'ISO-271',
    warehouseCode: 'MEM-DC',
    quantity_change: 200,
    reason: 'receive',
    reference: 'PO-4416',
    minutes_ago: 1260,
  },
  {
    sku: 'CDR-022',
    warehouseCode: 'NWK-XD',
    quantity_change: 20,
    reason: 'receive',
    reference: 'PO-4414',
    minutes_ago: 1440,
  },
  {
    sku: 'EHO-330',
    warehouseCode: 'NWK-XD',
    quantity_change: -120,
    reason: 'shipment',
    reference: 'SO-878',
    minutes_ago: 1620,
  },
  {
    sku: 'DLT-008',
    warehouseCode: 'ATL-Y',
    quantity_change: 100,
    reason: 'receive',
    reference: 'PO-4413',
    minutes_ago: 1800,
  },
  {
    sku: 'AZR-104A',
    warehouseCode: 'RENO-1',
    quantity_change: 40,
    reason: 'receive',
    reference: 'PO-4412',
    minutes_ago: 2400,
  },
  {
    sku: 'MRN-260',
    warehouseCode: 'NWK-XD',
    quantity_change: 24,
    reason: 'receive',
    reference: 'PO-4411',
    minutes_ago: 2880,
  },
  {
    sku: 'GNT-558',
    warehouseCode: 'MEM-DC',
    quantity_change: 4,
    reason: 'receive',
    reference: 'PO-4410',
    minutes_ago: 3600,
  },
]

interface AlertSeed {
  sku: string
  warehouseCode: string
  type: 'low_stock' | 'out_of_stock'
  severity: 'warning' | 'critical' | 'info'
  message: string
  status: 'active' | 'acknowledged'
  hours_ago: number
}

const ALERT_SEED: AlertSeed[] = [
  {
    sku: 'AZR-104',
    warehouseCode: 'RENO-1',
    type: 'low_stock',
    severity: 'warning',
    message: 'AZR-104 at Reno DC dropped to 4 (threshold 60).',
    status: 'active',
    hours_ago: 0.5,
  },
  {
    sku: 'BKN-220',
    warehouseCode: 'MEM-DC',
    type: 'out_of_stock',
    severity: 'critical',
    message: 'BKN-220 at Memphis Hub is OUT of stock.',
    status: 'active',
    hours_ago: 1,
  },
  {
    sku: 'CDR-018',
    warehouseCode: 'RENO-1',
    type: 'low_stock',
    severity: 'warning',
    message: 'CDR-018 at Reno DC dropped to 9 (threshold 30).',
    status: 'active',
    hours_ago: 4,
  },
  {
    sku: 'DLT-007',
    warehouseCode: 'NWK-XD',
    type: 'low_stock',
    severity: 'warning',
    message: 'DLT-007 at Newark Crossdock dropped to 22 (threshold 60).',
    status: 'acknowledged',
    hours_ago: 18,
  },
]

const NOTIFICATION_SEED: NotificationSeed[] = [
  {
    icon: 'verified_user',
    title: 'Cycle count complete · Reno DC',
    body: 'Variance 0.4%. 412 SKUs reconciled in 2h 11m.',
    read: false,
    hours_ago: 0.5,
  },
  {
    icon: 'sync_problem',
    title: 'Shopify channel paused',
    body: 'Inventory push paused while Shopify rate-limits API calls. Auto-retry in 4 minutes.',
    read: false,
    hours_ago: 1,
  },
  {
    icon: 'description',
    title: 'Monthly turnover report ready',
    body: 'Apr 2026 report queued. 32-page PDF + CSV available in Reports.',
    href: '/reports',
    read: true,
    hours_ago: 3,
  },
]

interface OrderSeed {
  reference: string
  type: 'inbound' | 'outbound'
  status: 'open' | 'inbound' | 'outbound' | 'received' | 'shipped' | 'cancelled'
  partner: string
  warehouseCode: string
  expected_offset_days: number
  notes: string
  lines: Array<{ sku: string; expected_qty: number; received_qty: number; unit_cost_cents: number }>
}

const ORDER_SEED: OrderSeed[] = [
  {
    reference: 'PO-4421',
    type: 'inbound',
    status: 'inbound',
    partner: 'Atlas Copper',
    warehouseCode: 'MEM-DC',
    expected_offset_days: 1,
    notes: 'Restock for tubing line — confirmed truck departure 2026-04-30 06:00.',
    lines: [
      { sku: 'AZR-104', expected_qty: 240, received_qty: 0, unit_cost_cents: 4250 },
      { sku: 'AZR-104A', expected_qty: 60, received_qty: 0, unit_cost_cents: 1500 },
    ],
  },
  {
    reference: 'PO-4419',
    type: 'inbound',
    status: 'received',
    partner: 'Atlas Copper',
    warehouseCode: 'RENO-1',
    expected_offset_days: -2,
    notes: 'Receiving complete — 1 short on AZR-205 (variance noted in audit log).',
    lines: [
      { sku: 'AZR-104', expected_qty: 240, received_qty: 240, unit_cost_cents: 4250 },
      { sku: 'AZR-205', expected_qty: 12, received_qty: 11, unit_cost_cents: 9800 },
    ],
  },
  {
    reference: 'SO-882',
    type: 'outbound',
    status: 'shipped',
    partner: 'Hightower MEP',
    warehouseCode: 'MEM-DC',
    expected_offset_days: -1,
    notes: 'Picked + shipped via OD Carriers, tracking ODFL-9311.',
    lines: [{ sku: 'BKN-220', expected_qty: 12, received_qty: 12, unit_cost_cents: 6400 }],
  },
  {
    reference: 'SO-884',
    type: 'outbound',
    status: 'outbound',
    partner: 'Brightway Build',
    warehouseCode: 'RENO-1',
    expected_offset_days: 0,
    notes: 'Picking in progress — 28/42 picked.',
    // Both lines must be fully shippable from RENO-1 so the order can be
    // marked shipped: EHO-330 (480 at RENO-1) and CDR-022 (38 at RENO-1).
    // CDR-018 is deliberately low (9) at RENO-1 to drive the low-stock alert,
    // so it is NOT used as an outbound line here — shipping 18 would 409.
    lines: [
      { sku: 'EHO-330', expected_qty: 24, received_qty: 0, unit_cost_cents: 420 },
      { sku: 'CDR-022', expected_qty: 18, received_qty: 0, unit_cost_cents: 2450 },
    ],
  },
]

export async function seedDemoForUser(userId: string): Promise<void> {
  if (!userId) return

  // Quick exit: if any warehouse exists for this user, treat the seed as already done.
  const existingWarehouses = await count('warehouses', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existingWarehouses > 0) return

  // 1. warehouses
  const warehousesByCode: Record<string, string> = {}
  for (const w of WAREHOUSE_SEED) {
    const result = await create('warehouses', {
      user_id: userId,
      name: w.name,
      code: `${w.code}-${userId.slice(0, 8)}`,
      city: w.city,
      country: w.country,
      capacity: w.capacity,
      contact_name: w.contact_name,
      contact_email: w.contact_email,
      status: 'active',
    })
    warehousesByCode[w.code] = String(result.data?.id ?? '')
  }

  // 2. products
  const productsBySku: Record<string, string> = {}
  for (const p of PRODUCT_SEED) {
    const result = await create('products', {
      user_id: userId,
      name: p.name,
      sku: `${p.sku}-${userId.slice(0, 8)}`,
      category: p.category,
      unit: p.unit,
      cost_price: p.cost_price,
      sell_price: p.sell_price,
      description: p.description,
      low_stock_threshold: p.low_stock_threshold,
      status: 'active',
    })
    productsBySku[p.sku] = String(result.data?.id ?? '')
  }

  // 3. stock levels
  for (const s of STOCK_SEED) {
    const productId = productsBySku[s.sku]
    const warehouseId = warehousesByCode[s.warehouseCode]
    if (!productId || !warehouseId) continue
    await create('stock_levels', {
      product_id: productId,
      warehouse_id: warehouseId,
      quantity: s.quantity,
    })
  }

  // 4. movements (in chronological order: oldest first → so created_at ordering reads desc correctly)
  const ordered = [...MOVEMENT_SEED].sort((a, b) => b.minutes_ago - a.minutes_ago)
  for (const m of ordered) {
    const productId = productsBySku[m.sku]
    const warehouseId = warehousesByCode[m.warehouseCode]
    if (!productId || !warehouseId) continue
    const at = new Date(Date.now() - m.minutes_ago * 60_000).toISOString()
    await create('stock_movements', {
      product_id: productId,
      warehouse_id: warehouseId,
      quantity_change: m.quantity_change,
      reason: m.reason,
      reference: m.reference ?? null,
      performed_by: userId,
      created_at: at,
    })
  }

  // 5. alert rules (one global, two per-warehouse)
  await create('alert_rules', {
    type: 'low_stock',
    threshold: 10,
    notify_email: null,
    enabled: true,
    created_by: userId,
  })
  await create('alert_rules', {
    warehouse_id: warehousesByCode['RENO-1'] ?? null,
    type: 'low_stock',
    threshold: 30,
    notify_email: null,
    enabled: true,
    created_by: userId,
  })
  await create('alert_rules', {
    warehouse_id: warehousesByCode['MEM-DC'] ?? null,
    type: 'low_stock',
    threshold: 24,
    notify_email: null,
    enabled: false,
    created_by: userId,
  })

  // 6. inventory_alerts
  for (const a of ALERT_SEED) {
    const productId = productsBySku[a.sku]
    const warehouseId = warehousesByCode[a.warehouseCode]
    if (!productId || !warehouseId) continue
    const at = new Date(Date.now() - a.hours_ago * 3600_000).toISOString()
    await create('inventory_alerts', {
      user_id: userId,
      product_id: productId,
      warehouse_id: warehouseId,
      type: a.type,
      severity: a.severity,
      message: a.message,
      status: a.status,
      acknowledged_by: a.status === 'acknowledged' ? userId : null,
      acknowledged_at: a.status === 'acknowledged' ? at : null,
      created_at: at,
    })
  }

  // 7. notifications
  for (const n of NOTIFICATION_SEED) {
    const at = new Date(Date.now() - n.hours_ago * 3600_000).toISOString()
    await create('notifications', {
      user_id: userId,
      kind: 'system',
      icon: n.icon,
      title: n.title,
      body: n.body,
      href: n.href ?? null,
      read: n.read,
      created_at: at,
    })
  }

  // 8. one pending stock transfer (RENO → MEM for CDR-018, mirroring movement seed)
  const transferResult = await create('stock_transfers', {
    from_warehouse_id: warehousesByCode['RENO-1'],
    to_warehouse_id: warehousesByCode['MEM-DC'],
    status: 'pending',
    notes: 'Weekly cross-dock rebalance.',
    created_by: userId,
  })
  if (transferResult.data?.id) {
    await create('stock_transfer_items', {
      transfer_id: String(transferResult.data.id),
      product_id: productsBySku['CDR-018'],
      quantity: 30,
    })
    await create('stock_transfer_items', {
      transfer_id: String(transferResult.data.id),
      product_id: productsBySku['EHO-330'],
      quantity: 80,
    })
  }

  // 9. orders + order_items
  for (const o of ORDER_SEED) {
    const totalUnits = o.lines.reduce((sum, line) => sum + line.expected_qty, 0)
    const totalValue = o.lines.reduce(
      (sum, line) => sum + line.expected_qty * line.unit_cost_cents,
      0,
    )
    const expectedAt = new Date(Date.now() + o.expected_offset_days * 86_400_000).toISOString()
    const orderRes = await create('orders', {
      user_id: userId,
      reference: o.reference,
      type: o.type,
      status: o.status,
      partner: o.partner,
      warehouse_id: warehousesByCode[o.warehouseCode] ?? null,
      expected_at: expectedAt,
      received_at: o.status === 'received' || o.status === 'shipped' ? expectedAt : null,
      total_units: totalUnits,
      total_value_cents: totalValue,
      notes: o.notes,
    })
    const orderId = String(orderRes.data?.id ?? '')
    if (!orderId) continue
    for (const line of o.lines) {
      const productId = productsBySku[line.sku] ?? null
      const productSeed = PRODUCT_SEED.find((p) => p.sku === line.sku)
      await create('order_items', {
        order_id: orderId,
        product_id: productId,
        sku: line.sku,
        name: productSeed?.name ?? line.sku,
        expected_quantity: line.expected_qty,
        received_quantity: line.received_qty,
        unit_cost_cents: line.unit_cost_cents,
      })
    }
  }
}

/**
 * Per-process locks: the early-exit count check inside `seedDemoForUser`
 * isn't atomic across concurrent requests, so two parallel `GET /products`
 * calls for a brand-new user both see "no warehouses yet" and both try to
 * insert the same `RENO-1-<userPrefix>` row — the second hits a
 * unique-constraint violation. Serialize per-user.
 */
const inFlight = new Map<string, Promise<void>>()

/**
 * Best-effort seed wrapper: serializes per user_id and swallows errors so
 * a partial seed never breaks a normal read endpoint. Errors are still
 * logged. Unique-constraint violations are downgraded to a debug log
 * because they always mean another concurrent request beat us to the
 * insert.
 */
export async function seedDemoForUserSafe(userId: string): Promise<void> {
  if (!userId) return
  let pending = inFlight.get(userId)
  if (pending) {
    await pending.catch(() => {})
    return
  }
  pending = (async () => {
    try {
      await seedDemoForUser(userId)
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === '23505') {
        // Unique violation — concurrent request already seeded this user.
        return
      }
      console.warn('[inventory-management] seedDemoForUser failed:', err)
    }
  })()
  inFlight.set(userId, pending)
  try {
    await pending
  } finally {
    inFlight.delete(userId)
  }
}

// Suppress unused-import warning when we conditionally use findMany in
// future expansions.
void findMany
