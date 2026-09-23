import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findMany, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface SeedResult {
  seeded: boolean
  alreadySeeded?: boolean
  zones?: number
  locations?: number
  products?: number
  orders?: number
  shipments?: number
  receipts?: number
  returns?: number
  notifications?: number
}

const ZONE_DEFS = [
  { name: 'Receiving', code: 'A', kind: 'receiving', bins: 18, utilization_pct: 72 },
  { name: 'Storage A', code: 'B', kind: 'storage', bins: 96, utilization_pct: 81 },
  { name: 'Picking', code: 'C', kind: 'picking', bins: 64, utilization_pct: 64 },
  { name: 'Packing', code: 'D', kind: 'packing', bins: 32, utilization_pct: 55 },
  { name: 'Outbound', code: 'E', kind: 'shipping', bins: 24, utilization_pct: 41 },
  { name: 'Returns', code: 'F', kind: 'returns', bins: 12, utilization_pct: 28 },
] as const

const PRODUCT_DEFS = [
  {
    name: 'Steelhead Fly Reel — 5/6wt',
    sku: 'SH-FR-56',
    bin: 'B-04-12',
    onHand: 142,
    reorderPoint: 30,
    price: 18900,
  },
  {
    name: 'Maddox Trail Pant',
    sku: 'MX-TP-32',
    bin: 'B-07-04',
    onHand: 86,
    reorderPoint: 24,
    price: 8900,
  },
  {
    name: 'North Ridge Headlamp 800lm',
    sku: 'NR-HL-800',
    bin: 'C-02-01',
    onHand: 312,
    reorderPoint: 60,
    price: 4900,
  },
  {
    name: 'Birchwood Trail Mix 1lb',
    sku: 'BW-TM-16',
    bin: 'C-09-08',
    onHand: 9,
    reorderPoint: 80,
    price: 1295,
  },
  {
    name: 'Locklear Carabiner — Master',
    sku: 'LL-CB-04',
    bin: 'B-12-02',
    onHand: 248,
    reorderPoint: 40,
    price: 2495,
  },
  {
    name: 'Hartwell Insulated Bottle 32oz',
    sku: 'HW-IB-32',
    bin: 'B-03-09',
    onHand: 64,
    reorderPoint: 30,
    price: 3895,
  },
  {
    name: 'Northwind Shell Jacket — M',
    sku: 'NW-SJ-M',
    bin: 'B-08-15',
    onHand: 18,
    reorderPoint: 20,
    price: 14900,
  },
  {
    name: 'Cedar Park Coffee — 12oz',
    sku: 'CP-CF-12',
    bin: 'C-04-22',
    onHand: 0,
    reorderPoint: 50,
    price: 1495,
  },
  {
    name: 'Steelhead Fly Line WF6F',
    sku: 'SH-FL-WF6',
    bin: 'B-04-13',
    onHand: 64,
    reorderPoint: 25,
    price: 6500,
  },
  {
    name: 'Maddox Insulated Vest',
    sku: 'MX-IV-L',
    bin: 'B-07-06',
    onHand: 27,
    reorderPoint: 15,
    price: 7900,
  },
] as const

const ORDER_DEFS = [
  {
    external: 'SO-90412',
    customerName: 'Maddox Outfitters',
    customerEmail: 'orders@maddox.example',
    priority: 'rush',
    status: 'picking',
    method: 'UPS Next Day',
    weight: 12.4,
    items: [
      ['MX-TP-32', 2],
      ['MX-IV-L', 1],
    ],
  },
  {
    external: 'SO-90411',
    customerName: 'Steelhead Supply Co.',
    customerEmail: 'shipping@steelhead.example',
    priority: 'express',
    status: 'pending',
    method: 'FedEx 2-Day',
    weight: 38.6,
    items: [
      ['SH-FR-56', 4],
      ['SH-FL-WF6', 8],
    ],
  },
  {
    external: 'SO-90410',
    customerName: 'North Ridge Hardware',
    customerEmail: 'rcv@northridge.example',
    priority: 'standard',
    status: 'packed',
    method: 'UPS Ground',
    weight: 22.0,
    items: [['NR-HL-800', 7]],
  },
  {
    external: 'SO-90409',
    customerName: 'Locklear & Co.',
    customerEmail: 'ops@locklear.example',
    priority: 'standard',
    status: 'shipped',
    method: 'USPS Priority',
    weight: 6.1,
    items: [['LL-CB-04', 3]],
  },
  {
    external: 'SO-90408',
    customerName: 'Birchwood Foods',
    customerEmail: 'fulfillment@birchwood.example',
    priority: 'standard',
    status: 'picking',
    method: 'LTL Freight',
    weight: 84.5,
    items: [['BW-TM-16', 22]],
  },
  {
    external: 'SO-90407',
    customerName: 'Hartwell Outfitters',
    customerEmail: 'orders@hartwell.example',
    priority: 'standard',
    status: 'pending',
    method: 'FedEx Ground',
    weight: 16.2,
    items: [['HW-IB-32', 9]],
  },
  {
    external: 'SO-90406',
    customerName: 'Northwind Apparel',
    customerEmail: 'orders@northwind.example',
    priority: 'rush',
    status: 'shipped',
    method: 'UPS Next Day',
    weight: 4.8,
    items: [['NW-SJ-M', 2]],
  },
  {
    external: 'SO-90405',
    customerName: 'Cedar Park Co-Op',
    customerEmail: 'shipping@cedarpark.example',
    priority: 'standard',
    status: 'cancelled',
    method: 'USPS Ground',
    weight: 47.0,
    items: [['CP-CF-12', 18]],
  },
] as const

const RECEIPT_DEFS = [
  { supplier: 'Steelhead Wholesale', poNumber: 'PO-2418', expectedUnits: 240, status: 'expected' },
  { supplier: 'Maddox Manufacturing', poNumber: 'PO-2419', expectedUnits: 180, status: 'received' },
  { supplier: 'North Ridge Imports', poNumber: 'PO-2420', expectedUnits: 96, status: 'expected' },
] as const

const RETURN_DEFS = [
  {
    rmaNumber: 'RMA-1042',
    reason: 'Damaged in transit',
    status: 'received',
    resolution: 'restock',
  },
  { rmaNumber: 'RMA-1043', reason: 'Wrong size', status: 'issued', resolution: 'inspect' },
] as const

const NOTIFICATION_DEFS = [
  {
    kind: 'low_stock',
    title: 'Low stock alert',
    body: 'Birchwood Trail Mix is below reorder point.',
    link: '/inventory',
  },
  {
    kind: 'rush_order',
    title: 'Rush order incoming',
    body: 'SO-90412 marked rush — promised by 22:00.',
    link: '/orders',
  },
  {
    kind: 'shipment',
    title: 'Manifest cleared',
    body: 'Outbound dock D2 cleared 18 manifests today.',
    link: '/shipments',
  },
] as const

router.post('/seed', async (_req: Request, res: Response): Promise<unknown> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const existingZones = await findMany('zones', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1,
    })
    if (existingZones.length > 0) {
      return res.json({ seeded: false, alreadySeeded: true } satisfies SeedResult)
    }

    const result: SeedResult = {
      seeded: true,
      zones: 0,
      locations: 0,
      products: 0,
      orders: 0,
      shipments: 0,
      receipts: 0,
      returns: 0,
      notifications: 0,
    }
    const zoneIds: Record<string, string> = {}

    for (const z of ZONE_DEFS) {
      const created = await create<Record<string, unknown>>('zones', {
        user_id: userId,
        name: z.name,
        kind: z.kind,
        description: `${z.name} zone`,
        code: z.code,
        bins: z.bins,
        utilization_pct: z.utilization_pct,
        created_at: new Date(),
      })
      const id = (created.data as { id: string }).id
      zoneIds[z.code] = id
      result.zones! += 1

      const binCount = Math.min(z.bins, 6)
      for (let i = 1; i <= binCount; i++) {
        await create('locations', {
          user_id: userId,
          zone_id: id,
          code: `${z.code}-${String(i).padStart(2, '0')}`,
          name: `${z.name} ${String(i).padStart(2, '0')}`,
          aisle: z.code,
          bin_capacity: 100,
          current_occupancy_pct: Math.min(100, z.utilization_pct + (i % 3) * 5),
          created_at: new Date(),
        })
        result.locations! += 1
      }
    }

    const productIds: Record<string, string> = {}
    for (const p of PRODUCT_DEFS) {
      const slug = `${p.sku.toLowerCase()}-${userId.slice(0, 8)}`
      const created = await create<Record<string, unknown>>('products', {
        userId,
        name: p.name,
        slug,
        description: `${p.name} — ${p.sku}`,
        price: p.price,
        sku: p.sku,
        bin: p.bin,
        onHand: p.onHand,
        reorderPoint: p.reorderPoint,
        inventory: p.onHand,
        status: 'active',
      })
      productIds[p.sku] = (created.data as { id: string }).id
      result.products! += 1
    }

    const now = Date.now()
    let createdOrderCount = 0
    let firstShippedOrderId: string | null = null
    for (let i = 0; i < ORDER_DEFS.length; i++) {
      const od = ORDER_DEFS[i]
      const itemTotal = od.items.reduce((s, [sku, qty]) => {
        const def = PRODUCT_DEFS.find((p) => p.sku === sku)
        return s + (def?.price ?? 0) * Number(qty)
      }, 0)
      const created = await create<Record<string, unknown>>('orders', {
        userId,
        status: od.status,
        priority: od.priority,
        total: itemTotal,
        subtotal: itemTotal,
        tax: 0,
        shipping: 0,
        discount: 0,
        shippingAddress: {
          line1: '123 Trailhead Rd',
          city: 'Asheville',
          region: 'NC',
          postal: '28801',
          country: 'US',
        },
        notes: null,
        customerName: od.customerName,
        customerEmail: od.customerEmail,
        externalOrderId: od.external,
        shippingMethod: od.method,
        weightLb: od.weight,
        promisedAt: new Date(now + 1000 * 60 * 60 * (i + 4)),
        createdAt: new Date(now - 1000 * 60 * (6 + i * 12)),
      })
      const orderId = (created.data as { id: string }).id
      createdOrderCount += 1
      if (od.status === 'shipped' && !firstShippedOrderId) firstShippedOrderId = orderId

      for (const [sku, qty] of od.items) {
        const def = PRODUCT_DEFS.find((p) => p.sku === sku)
        if (!def) continue
        await create('order_items', {
          orderId,
          productId: productIds[sku] ?? sku,
          name: def.name,
          price: def.price,
          quantity: Number(qty),
        })
      }

      await create('order_events', {
        orderId,
        status: od.status,
        metadata: { actor: userId, seeded: true },
      })
    }
    result.orders = createdOrderCount

    if (firstShippedOrderId) {
      const ship = await create<Record<string, unknown>>('shipments', {
        user_id: userId,
        order_id: firstShippedOrderId,
        carrier: 'usps',
        service: 'Priority',
        dock: 'D2',
        manifest_number: `MAN-${Date.now().toString(36).toUpperCase()}`,
        cutoff_at: new Date(now + 1000 * 60 * 60 * 4),
        tracking_number: `9400${Date.now().toString().slice(-12)}`,
        weight_oz: 96,
        status: 'in_transit',
        shipped_at: new Date(now - 1000 * 60 * 30),
        created_at: new Date(now - 1000 * 60 * 30),
      })
      result.shipments! += 1
      const shipId = (ship.data as { id: string }).id
      await create('shipment_events', {
        user_id: userId,
        shipment_id: shipId,
        status: 'in_transit',
        description: 'Departed origin facility',
        location: 'Asheville, NC',
        created_at: new Date(now - 1000 * 60 * 28),
      })
    }

    const shipNow = Date.now()
    const ship2 = await create<Record<string, unknown>>('shipments', {
      user_id: userId,
      order_id: null,
      carrier: 'ups',
      service: 'Ground',
      dock: 'D1',
      manifest_number: `MAN-${shipNow.toString(36).toUpperCase()}-2`,
      cutoff_at: new Date(shipNow + 1000 * 60 * 60 * 6),
      tracking_number: `1Z999${shipNow.toString().slice(-9)}`,
      weight_oz: 240,
      status: 'label_created',
      created_at: new Date(shipNow - 1000 * 60 * 5),
    })
    result.shipments! += 1
    await create('shipment_events', {
      user_id: userId,
      shipment_id: (ship2.data as { id: string }).id,
      status: 'label_created',
      description: 'Label created',
      location: 'Asheville, NC',
      created_at: new Date(shipNow - 1000 * 60 * 5),
    })

    for (const r of RECEIPT_DEFS) {
      await create('receipts', {
        user_id: userId,
        supplier: r.supplier,
        po_number: r.poNumber,
        expected_units: r.expectedUnits,
        expected_at: new Date(Date.now() + 1000 * 60 * 60 * 24),
        received_at: r.status === 'received' ? new Date() : null,
        status: r.status,
        created_at: new Date(),
      })
      result.receipts! += 1
    }

    const orderRowsResult = await query<{ id: string }>(
      'SELECT id FROM orders WHERE "userId" = $1 LIMIT 2',
      [userId],
    )
    const orderRowsForReturns = orderRowsResult.rows
    for (let i = 0; i < RETURN_DEFS.length; i++) {
      const r = RETURN_DEFS[i]
      await create('returns', {
        user_id: userId,
        original_order_id: orderRowsForReturns[i]?.id ?? null,
        rma_number: r.rmaNumber,
        reason: r.reason,
        resolution: r.resolution,
        status: r.status,
        received_at: r.status === 'received' ? new Date() : null,
        created_at: new Date(),
      })
      result.returns! += 1
    }

    for (const n of NOTIFICATION_DEFS) {
      await create('notifications', {
        user_id: userId,
        kind: n.kind,
        title: n.title,
        body: n.body,
        link: n.link,
        payload: {},
        read_at: null,
        created_at: new Date(),
      })
      result.notifications! += 1
    }

    res.status(201).json(result)
  } catch (err) {
    logger.error('setup.handler', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/reset', async (_req: Request, res: Response): Promise<unknown> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    await query(
      'DELETE FROM order_events WHERE "orderId" IN (SELECT id FROM orders WHERE "userId" = $1)',
      [userId],
    )
    await query(
      'DELETE FROM order_items WHERE "orderId" IN (SELECT id FROM orders WHERE "userId" = $1)',
      [userId],
    )
    await query('DELETE FROM orders WHERE "userId" = $1', [userId])
    await query('DELETE FROM shipment_events WHERE user_id = $1', [userId])
    await query('DELETE FROM shipments WHERE user_id = $1', [userId])
    await query('DELETE FROM receipt_items WHERE user_id = $1', [userId])
    await query('DELETE FROM receipts WHERE user_id = $1', [userId])
    await query('DELETE FROM return_items WHERE user_id = $1', [userId])
    await query('DELETE FROM returns WHERE user_id = $1', [userId])
    await query('DELETE FROM pick_lines WHERE user_id = $1', [userId])
    await query('DELETE FROM pick_lists WHERE user_id = $1', [userId])
    await query('DELETE FROM locations WHERE user_id = $1', [userId])
    await query('DELETE FROM zones WHERE user_id = $1', [userId])
    await query('DELETE FROM notifications WHERE user_id = $1', [userId])
    await query('DELETE FROM products WHERE "userId" = $1', [userId])
    res.json({ reset: true })
  } catch (err) {
    logger.error('setup.handler', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
