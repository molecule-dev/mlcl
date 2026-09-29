/**
 * Demo seed for delivery-tracking.
 *
 * Two layers:
 *
 * 1. **Globals** (`seedGlobalCarriersIfEmpty`) — the standard carrier
 *    integrations (UPS, FedEx, USPS, DHL, Amazon Logistics) every
 *    operator expects to see in the directory. Idempotent.
 *
 * 2. **Per-user** (`seedDemoForUser`) — a small starter set of shipments,
 *    tracking events, alerts, notifications, and a webhook so a freshly-
 *    signed-up user lands on a Dashboard / Shipments / Alerts /
 *    Notifications / Webhooks page that actually shows something.
 *    Idempotent on user_id.
 *
 * @module
 */

import { randomBytes } from 'node:crypto'

import { count, create, findMany } from '@molecule/api-database'

const CARRIERS = [
  {
    name: 'UPS',
    code: 'UPS',
    tracking_url_template: 'https://www.ups.com/track?tracknum={tracking_number}',
    base_url: 'https://onlinetools.ups.com/api/track',
    logo_url: '/carrier-logos/ups.svg',
  },
  {
    name: 'FedEx',
    code: 'FEDEX',
    tracking_url_template: 'https://www.fedex.com/fedextrack/?tracknumbers={tracking_number}',
    base_url: 'https://apis.fedex.com/track',
    logo_url: '/carrier-logos/fedex.svg',
  },
  {
    name: 'USPS',
    code: 'USPS',
    tracking_url_template: 'https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking_number}',
    base_url: 'https://api.usps.com/tracking',
    logo_url: '/carrier-logos/usps.svg',
  },
  {
    name: 'DHL Express',
    code: 'DHL',
    tracking_url_template: 'https://www.dhl.com/en/express/tracking.html?AWB={tracking_number}',
    base_url: 'https://api-eu.dhl.com/track',
    logo_url: '/carrier-logos/dhl.svg',
  },
  {
    name: 'Amazon Logistics',
    code: 'AMZL',
    tracking_url_template: 'https://track.amazon.com/tracking/{tracking_number}',
    base_url: 'https://api.amazon.com/logistics',
    logo_url: '/carrier-logos/amzl.svg',
  },
] as const

interface SampleShipment {
  tracking_number: string
  carrier_code: string
  recipient_name: string
  recipient_email: string
  origin: string
  destination: string
  status: string
  current_location: string
  current_latitude: number
  current_longitude: number
  expected_delivery_offset_hours: number
  events: Array<{
    status: string
    description: string
    location: string
    latitude?: number
    longitude?: number
    offset_hours: number
  }>
}

const SAMPLE_SHIPMENTS: readonly SampleShipment[] = [
  {
    tracking_number: '1Z999AA10123456784',
    carrier_code: 'UPS',
    recipient_name: 'Sarah Lee',
    recipient_email: 'sarah.lee@example.com',
    origin: 'Brooklyn, NY, US',
    destination: 'San Francisco, CA, US',
    status: 'in_transit',
    current_location: 'Chicago, IL, US',
    current_latitude: 41.8781,
    current_longitude: -87.6298,
    expected_delivery_offset_hours: 36,
    events: [
      {
        status: 'created',
        description: 'Label created',
        location: 'Brooklyn, NY',
        latitude: 40.6782,
        longitude: -73.9442,
        offset_hours: -72,
      },
      {
        status: 'picked_up',
        description: 'Picked up by carrier',
        location: 'Brooklyn, NY',
        latitude: 40.6782,
        longitude: -73.9442,
        offset_hours: -60,
      },
      {
        status: 'in_transit',
        description: 'Departed origin facility',
        location: 'Newark, NJ',
        latitude: 40.7357,
        longitude: -74.1724,
        offset_hours: -48,
      },
      {
        status: 'in_transit',
        description: 'Arrived at sort facility',
        location: 'Chicago, IL',
        latitude: 41.8781,
        longitude: -87.6298,
        offset_hours: -2,
      },
    ],
  },
  {
    tracking_number: 'FX012345678901',
    carrier_code: 'FEDEX',
    recipient_name: 'Marcus Tan',
    recipient_email: 'marcus@example.com',
    origin: 'Memphis, TN, US',
    destination: 'Seattle, WA, US',
    status: 'out_for_delivery',
    current_location: 'Seattle, WA, US',
    current_latitude: 47.6062,
    current_longitude: -122.3321,
    expected_delivery_offset_hours: 4,
    events: [
      {
        status: 'created',
        description: 'Label created',
        location: 'Memphis, TN',
        latitude: 35.1495,
        longitude: -90.049,
        offset_hours: -96,
      },
      {
        status: 'picked_up',
        description: 'Picked up',
        location: 'Memphis, TN',
        latitude: 35.1495,
        longitude: -90.049,
        offset_hours: -84,
      },
      {
        status: 'in_transit',
        description: 'In transit',
        location: 'Denver, CO',
        latitude: 39.7392,
        longitude: -104.9903,
        offset_hours: -36,
      },
      {
        status: 'arrived',
        description: 'Arrived at delivery hub',
        location: 'Seattle, WA',
        latitude: 47.6062,
        longitude: -122.3321,
        offset_hours: -6,
      },
      {
        status: 'out_for_delivery',
        description: 'Out for delivery with driver',
        location: 'Seattle, WA',
        latitude: 47.6062,
        longitude: -122.3321,
        offset_hours: -1,
      },
    ],
  },
  {
    tracking_number: '9400110200881234567890',
    carrier_code: 'USPS',
    recipient_name: 'Priya Anand',
    recipient_email: 'priya.a@example.com',
    origin: 'Austin, TX, US',
    destination: 'Boston, MA, US',
    status: 'delivered',
    current_location: 'Boston, MA, US',
    current_latitude: 42.3601,
    current_longitude: -71.0589,
    expected_delivery_offset_hours: -24,
    events: [
      {
        status: 'created',
        description: 'Shipping label created',
        location: 'Austin, TX',
        latitude: 30.2672,
        longitude: -97.7431,
        offset_hours: -120,
      },
      {
        status: 'in_transit',
        description: 'In transit to next facility',
        location: 'Atlanta, GA',
        latitude: 33.749,
        longitude: -84.388,
        offset_hours: -72,
      },
      {
        status: 'arrived',
        description: 'Arrived at unit',
        location: 'Boston, MA',
        latitude: 42.3601,
        longitude: -71.0589,
        offset_hours: -36,
      },
      {
        status: 'delivered',
        description: 'Delivered, in/at mailbox',
        location: 'Boston, MA',
        latitude: 42.3601,
        longitude: -71.0589,
        offset_hours: -24,
      },
    ],
  },
  {
    tracking_number: '1234567890',
    carrier_code: 'DHL',
    recipient_name: 'Anna Schmidt',
    recipient_email: 'anna.s@example.de',
    origin: 'Frankfurt, DE',
    destination: 'New York, NY, US',
    status: 'exception',
    current_location: 'JFK Airport, NY, US',
    current_latitude: 40.6413,
    current_longitude: -73.7781,
    expected_delivery_offset_hours: 12,
    events: [
      {
        status: 'created',
        description: 'Shipment information received',
        location: 'Frankfurt, DE',
        latitude: 50.1109,
        longitude: 8.6821,
        offset_hours: -120,
      },
      {
        status: 'picked_up',
        description: 'Shipment picked up',
        location: 'Frankfurt, DE',
        latitude: 50.1109,
        longitude: 8.6821,
        offset_hours: -100,
      },
      {
        status: 'in_transit',
        description: 'Departed facility',
        location: 'Frankfurt Airport, DE',
        latitude: 50.0379,
        longitude: 8.5622,
        offset_hours: -84,
      },
      {
        status: 'arrived',
        description: 'Arrived at facility',
        location: 'JFK Airport, NY',
        latitude: 40.6413,
        longitude: -73.7781,
        offset_hours: -48,
      },
      {
        status: 'exception',
        description: 'Customs hold — additional documentation required',
        location: 'JFK Airport, NY',
        latitude: 40.6413,
        longitude: -73.7781,
        offset_hours: -6,
      },
    ],
  },
  {
    tracking_number: 'TBA303456789012',
    carrier_code: 'AMZL',
    recipient_name: 'Jordan Reeves',
    recipient_email: 'jordan@example.com',
    origin: 'Carteret, NJ, US',
    destination: 'Brooklyn, NY, US',
    status: 'delivered',
    current_location: 'Brooklyn, NY, US',
    current_latitude: 40.6782,
    current_longitude: -73.9442,
    expected_delivery_offset_hours: -48,
    events: [
      {
        status: 'created',
        description: 'Order shipped',
        location: 'Carteret, NJ',
        latitude: 40.5868,
        longitude: -74.2284,
        offset_hours: -72,
      },
      {
        status: 'in_transit',
        description: 'Out for delivery',
        location: 'Brooklyn, NY',
        latitude: 40.6782,
        longitude: -73.9442,
        offset_hours: -54,
      },
      {
        status: 'delivered',
        description: 'Delivered to customer',
        location: 'Brooklyn, NY',
        latitude: 40.6782,
        longitude: -73.9442,
        offset_hours: -48,
      },
    ],
  },
  {
    tracking_number: '1Z999AA10123456999',
    carrier_code: 'UPS',
    recipient_name: 'Diego Ramos',
    recipient_email: 'diego@example.com',
    origin: 'Los Angeles, CA, US',
    destination: 'Phoenix, AZ, US',
    status: 'in_transit',
    current_location: 'Riverside, CA, US',
    current_latitude: 33.9533,
    current_longitude: -117.3962,
    expected_delivery_offset_hours: 18,
    events: [
      {
        status: 'created',
        description: 'Label created',
        location: 'Los Angeles, CA',
        latitude: 34.0522,
        longitude: -118.2437,
        offset_hours: -24,
      },
      {
        status: 'picked_up',
        description: 'Picked up by carrier',
        location: 'Los Angeles, CA',
        latitude: 34.0522,
        longitude: -118.2437,
        offset_hours: -18,
      },
      {
        status: 'in_transit',
        description: 'In transit',
        location: 'Riverside, CA',
        latitude: 33.9533,
        longitude: -117.3962,
        offset_hours: -2,
      },
    ],
  },
  {
    tracking_number: 'FX012345678999',
    carrier_code: 'FEDEX',
    recipient_name: 'Hana Yamada',
    recipient_email: 'hana@example.com',
    origin: 'Portland, OR, US',
    destination: 'Honolulu, HI, US',
    status: 'in_transit',
    current_location: 'Oakland, CA, US',
    current_latitude: 37.8044,
    current_longitude: -122.2712,
    expected_delivery_offset_hours: 60,
    events: [
      {
        status: 'created',
        description: 'Label created',
        location: 'Portland, OR',
        latitude: 45.5152,
        longitude: -122.6784,
        offset_hours: -36,
      },
      {
        status: 'picked_up',
        description: 'Picked up',
        location: 'Portland, OR',
        latitude: 45.5152,
        longitude: -122.6784,
        offset_hours: -30,
      },
      {
        status: 'in_transit',
        description: 'In transit',
        location: 'Oakland, CA',
        latitude: 37.8044,
        longitude: -122.2712,
        offset_hours: -4,
      },
    ],
  },
  {
    tracking_number: '1Z999AA10888888884',
    carrier_code: 'UPS',
    recipient_name: 'Nora Kelly',
    recipient_email: 'nora@example.com',
    origin: 'Brooklyn, NY, US',
    destination: 'Miami, FL, US',
    status: 'created',
    current_location: 'Brooklyn, NY, US',
    current_latitude: 40.6782,
    current_longitude: -73.9442,
    expected_delivery_offset_hours: 96,
    events: [
      {
        status: 'created',
        description: 'Shipment information sent to carrier',
        location: 'Brooklyn, NY',
        latitude: 40.6782,
        longitude: -73.9442,
        offset_hours: -2,
      },
    ],
  },
] as const

export interface CarrierSeedRow {
  id: string
  code: string
}

/**
 * Seed the global carrier catalog if empty. Idempotent.
 */
export async function seedGlobalCarriersIfEmpty(): Promise<{ created: number }> {
  const existing = await count('carriers', [])
  if (existing > 0) return { created: 0 }
  let created = 0
  for (const c of CARRIERS) {
    await create('carriers', {
      name: c.name,
      code: c.code,
      tracking_url_template: c.tracking_url_template,
      base_url: c.base_url,
      logo_url: c.logo_url,
      webhook_url: null,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    })
    created++
  }
  return { created }
}

/**
 * Seed a freshly signed-up user's account so the Dashboard, Shipments,
 * Alerts, Notifications, and Webhooks pages render with content.
 * Idempotent on user_id.
 */
export async function seedDemoForUser(userId: string): Promise<{
  shipmentsCreated: number
  eventsCreated: number
  alertsCreated: number
  notificationsCreated: number
  webhooksCreated: number
}> {
  const empty = {
    shipmentsCreated: 0,
    eventsCreated: 0,
    alertsCreated: 0,
    notificationsCreated: 0,
    webhooksCreated: 0,
  }
  if (!userId) return empty
  const existingShipments = await count('shipments', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existingShipments > 0) return empty

  const carriers = await findMany<CarrierSeedRow>('carriers', { limit: 50 })
  const carrierByCode = new Map<string, string>()
  for (const c of carriers) carrierByCode.set(c.code, c.id)

  const now = Date.now()
  const offset = (h: number): Date => new Date(now + h * 3_600_000)

  let shipmentsCreated = 0
  let eventsCreated = 0
  const exceptionShipments: Array<{
    id: string
    tracking_number: string
    recipient_name: string
    recipient_email: string
    recipient_safe: string
  }> = []

  for (const sample of SAMPLE_SHIPMENTS) {
    const result = await create<{ id: string }>('shipments', {
      user_id: userId,
      tracking_number: sample.tracking_number,
      carrier_id: carrierByCode.get(sample.carrier_code) ?? null,
      recipient_name: sample.recipient_name,
      recipient_email: sample.recipient_email,
      origin: sample.origin,
      destination: sample.destination,
      current_location: sample.current_location,
      current_latitude: sample.current_latitude,
      current_longitude: sample.current_longitude,
      status: sample.status,
      expected_delivery: offset(sample.expected_delivery_offset_hours),
      eta: offset(sample.expected_delivery_offset_hours),
      delivered_at:
        sample.status === 'delivered' ? offset(sample.expected_delivery_offset_hours) : null,
      created_at: offset(sample.events[0]?.offset_hours ?? -120),
      updated_at: offset(sample.events.at(-1)?.offset_hours ?? 0),
    })
    const shipment = result.data as { id: string } | undefined
    if (!shipment?.id) continue
    shipmentsCreated++

    for (const ev of sample.events) {
      await create('tracking_events', {
        shipment_id: shipment.id,
        status: ev.status,
        description: ev.description,
        location: ev.location,
        latitude: ev.latitude ?? null,
        longitude: ev.longitude ?? null,
        timestamp: offset(ev.offset_hours),
        created_at: offset(ev.offset_hours),
      })
      eventsCreated++
    }

    if (sample.status === 'exception') {
      exceptionShipments.push({
        id: shipment.id,
        tracking_number: sample.tracking_number,
        recipient_name: sample.recipient_name,
        recipient_email: sample.recipient_email,
        recipient_safe: sample.recipient_name,
      })
    }
  }

  let alertsCreated = 0
  for (const ex of exceptionShipments) {
    await create('alerts', {
      user_id: userId,
      shipment_id: ex.id,
      type: 'customs_hold',
      severity: 'error',
      message: `Customs hold on shipment ${ex.tracking_number} — additional documentation required.`,
      created_at: offset(-6),
    })
    alertsCreated++
  }
  // Add a couple non-shipment-bound informational alerts so the unread
  // pill on the navbar shows something even when no exceptions exist.
  await create('alerts', {
    user_id: userId,
    shipment_id: null,
    type: 'system_message',
    severity: 'warning',
    message: 'Your weekly performance digest is ready — open Analytics to view it.',
    created_at: offset(-12),
  })
  alertsCreated++
  await create('alerts', {
    user_id: userId,
    shipment_id: null,
    type: 'webhook_failure',
    severity: 'warning',
    message: 'Webhook delivery to https://acme.example/notify failed twice in the last hour.',
    created_at: offset(-2),
  })
  alertsCreated++
  // Cold-chain exception on the demo freezer lane — mirrors the critical
  // alerts the design highlights (sensor above threshold for >15 minutes).
  await create('alerts', {
    user_id: userId,
    shipment_id: exceptionShipments[0]?.id ?? null,
    type: 'exception_alert',
    severity: 'error',
    message: 'Temperature excursion detected — cold-chain sensor exceeded 8°C for over 15 minutes.',
    created_at: offset(-1),
  })
  alertsCreated++

  // Notifications log — feeds /api/notifications and the bell.
  const notifications = [
    {
      type: 'exception_alert',
      title: 'Customs hold on 1234567890',
      body: 'A DHL Express shipment to New York is held in customs.',
      href: exceptionShipments[0] ? `/shipments/${exceptionShipments[0].id}` : '/alerts',
      offset: -6,
      unread: true,
    },
    {
      type: 'shipment_delivered',
      title: 'Delivered: Boston, MA',
      body: 'USPS shipment to Priya Anand was delivered.',
      href: '/shipments',
      offset: -24,
      unread: false,
    },
    {
      type: 'shipment_delivered',
      title: 'Delivered: Brooklyn, NY',
      body: 'Amazon Logistics shipment to Jordan Reeves was delivered.',
      href: '/shipments',
      offset: -48,
      unread: false,
    },
    {
      type: 'webhook_failure',
      title: 'Webhook delivery failed',
      body: 'POST to https://acme.example/notify returned 500 (2 attempts).',
      href: '/webhooks',
      offset: -2,
      unread: true,
    },
    {
      type: 'system_message',
      title: 'Weekly performance digest',
      body: 'On-time rate this week: 98%. Exceptions: 1.',
      href: '/analytics',
      offset: -12,
      unread: false,
    },
  ]
  let notificationsCreated = 0
  for (const n of notifications) {
    await create('notification_log', {
      user_id: userId,
      type: n.type,
      payload: JSON.stringify({
        title: n.title,
        body: n.body,
        href: n.href,
        unread: n.unread,
      }),
      sent_at: offset(n.offset),
      created_at: offset(n.offset),
    })
    notificationsCreated++
  }

  // Notification preferences — start with sensible defaults so the
  // Settings page renders the toggles in their expected positions.
  await create('notification_preferences', {
    user_id: userId,
    email_on_delivered: true,
    email_on_exception: true,
    push_on_status_change: false,
    created_at: new Date(),
    updated_at: new Date(),
  }).catch(() => null)

  // One sample webhook so the Webhooks page isn't empty.
  let webhooksCreated = 0
  await create('webhooks', {
    user_id: userId,
    url: 'https://example.com/webhooks/delivery-tracking',
    events: JSON.stringify(['shipment.delivered', 'shipment.exception']),
    // Webhook signing secrets are bearer credentials (they authenticate the
    // deliveries this app sends to the user's endpoint) — mint even the demo
    // one with a CSPRNG, never Math.random. [L2-1]
    secret: 'whsec_demo_' + randomBytes(12).toString('hex'),
    status: 'active',
    created_at: offset(-72),
    updated_at: offset(-72),
  })
  webhooksCreated++

  return { shipmentsCreated, eventsCreated, alertsCreated, notificationsCreated, webhooksCreated }
}
