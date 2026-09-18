/**
 * UI projection helpers — translate raw DB rows into the denormalized
 * shapes the React app's interfaces expect (carrier name, customer fields,
 * origin/destination cities, etc.).
 *
 * The front end was designed against a "view model" shape that doesn't
 * map 1:1 to the DB tables. Instead of changing every page to consume
 * the raw shape, the backend projects the canonical view shape on read.
 *
 * @module
 */

import { findById, findMany, query } from '@molecule/api-database'

export interface CarrierRow {
  id: string
  name: string
  code: string
  tracking_url_template: string | null
  webhook_url: string | null
  logo_url: string | null
  base_url: string | null
  status: string
  created_at: string | Date
  updated_at: string | Date
}

export interface ShipmentRow {
  id: string
  user_id: string
  tracking_number: string
  carrier_id: string | null
  recipient_name: string | null
  recipient_email: string | null
  origin: string | null
  destination: string | null
  current_location: string | null
  current_latitude: number | null
  current_longitude: number | null
  status: string
  expected_delivery: string | Date | null
  eta: string | Date | null
  delivered_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}

export interface AlertRow {
  id: string
  user_id: string
  shipment_id: string | null
  type: string
  severity: string
  message: string
  read_at: string | Date | null
  created_at: string | Date
}

interface AddressParts {
  city: string
  state: string
  country: string
}

/**
 * Best-effort parse of a free-form "City, ST, Country" address.
 * Falls back to placing the whole string in `city` when no delimiters.
 */
export function splitAddress(raw: string | null | undefined): AddressParts {
  if (!raw) return { city: '', state: '', country: '' }
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length === 0) return { city: '', state: '', country: '' }
  if (parts.length === 1) return { city: parts[0], state: '', country: '' }
  if (parts.length === 2) return { city: parts[0], state: parts[1], country: '' }
  return { city: parts[0], state: parts[1], country: parts.slice(2).join(', ') }
}

/**
 * Decorate a single shipment row with the denormalized fields the UI expects.
 * Resolves carrier name from carrier_id and parses origin/destination strings.
 */
export async function decorateShipment(
  row: ShipmentRow,
  carrierMap?: Map<string, CarrierRow>,
): Promise<Record<string, unknown>> {
  let carrierName = ''
  if (row.carrier_id) {
    const cm = carrierMap ?? new Map<string, CarrierRow>()
    let carrier = cm.get(row.carrier_id)
    if (!carrier) {
      const c = await findById<CarrierRow>('carriers', row.carrier_id)
      if (c) {
        carrier = c
        cm.set(row.carrier_id, c)
      }
    }
    carrierName = carrier?.name ?? ''
  }
  const origin = splitAddress(row.origin)
  const dest = splitAddress(row.destination)
  const eta = row.eta ?? row.expected_delivery
  return {
    ...row,
    carrier: carrierName,
    customer: row.recipient_name ?? '',
    customer_email: row.recipient_email ?? '',
    origin_city: origin.city,
    origin_state: origin.state,
    origin_country: origin.country || 'US',
    destination_city: dest.city,
    destination_state: dest.state,
    destination_country: dest.country || 'US',
    destination_address: row.destination ?? '',
    service_level: 'Standard',
    weight_lb: 0,
    eta,
    shipped_at: row.created_at,
  }
}

/**
 * Decorate a list of shipments. Uses a single carriers query to avoid N+1.
 */
export async function decorateShipments(
  rows: ShipmentRow[],
): Promise<Array<Record<string, unknown>>> {
  if (rows.length === 0) return []
  const carrierIds = [...new Set(rows.map((r) => r.carrier_id).filter(Boolean) as string[])]
  const map = new Map<string, CarrierRow>()
  if (carrierIds.length > 0) {
    const carriers = await findMany<CarrierRow>('carriers', {
      where: [{ field: 'id', operator: 'in', value: carrierIds }],
      limit: carrierIds.length,
    })
    for (const c of carriers) map.set(c.id, c)
  }
  const out: Array<Record<string, unknown>> = []
  for (const row of rows) out.push(await decorateShipment(row, map))
  return out
}

interface CarrierStats {
  total: number
  delivered: number
  exception: number
}

const ZERO_STATS: CarrierStats = { total: 0, delivered: 0, exception: 0 }

function projectCarrier(row: CarrierRow, stats: CarrierStats): Record<string, unknown> {
  const { total, delivered, exception } = stats
  return {
    ...row,
    region: regionFromCode(row.code),
    shipments_30d: total,
    on_time_rate: total > 0 ? delivered / total : 0,
    exception_rate: total > 0 ? exception / total : 0,
    avg_transit_hours: total > 0 ? 36 : 0,
    api_status: row.status === 'active' ? 'connected' : 'disconnected',
    api_endpoint: row.base_url ?? `https://api.${row.code.toLowerCase()}.com`,
    api_key_masked: '••••••••' + row.id.slice(-4),
    integrated_at: row.created_at,
  }
}

/**
 * Decorate a carrier row with synthetic stats (shipments_30d, on_time_rate,
 * exception_rate, etc.). Stats are computed from this user's shipments.
 */
export async function decorateCarrier(
  row: CarrierRow,
  userId: string,
): Promise<Record<string, unknown>> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const totalRow = await query<{ total: string; delivered: string; exception: string }>(
    `SELECT
       COUNT(*)::text AS total,
       COUNT(*) FILTER (WHERE status = 'delivered')::text AS delivered,
       COUNT(*) FILTER (WHERE status = 'exception')::text AS exception
     FROM shipments
     WHERE user_id = $1 AND carrier_id = $2 AND created_at >= $3`,
    [userId, row.id, since],
  )
  return projectCarrier(row, {
    total: Number(totalRow.rows[0]?.total ?? 0),
    delivered: Number(totalRow.rows[0]?.delivered ?? 0),
    exception: Number(totalRow.rows[0]?.exception ?? 0),
  })
}

/**
 * Decorate a list of carriers. Computes per-carrier stats in a single
 * GROUP BY query (one round-trip total) instead of an N+1 per-carrier
 * COUNT — that race made /api/carriers far slower than /api/shipments
 * and caused the Shipments page test to flake (carriers response landed
 * after the captureNetwork window closed).
 */
export async function decorateCarriers(
  rows: CarrierRow[],
  userId: string,
): Promise<Array<Record<string, unknown>>> {
  if (rows.length === 0) return []
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const ids = rows.map((r) => r.id)
  const grouped = await query<{
    carrier_id: string
    total: string
    delivered: string
    exception: string
  }>(
    `SELECT
       carrier_id,
       COUNT(*)::text AS total,
       COUNT(*) FILTER (WHERE status = 'delivered')::text AS delivered,
       COUNT(*) FILTER (WHERE status = 'exception')::text AS exception
     FROM shipments
     WHERE user_id = $1 AND carrier_id = ANY($2) AND created_at >= $3
     GROUP BY carrier_id`,
    [userId, ids, since],
  )
  const statsByCarrier = new Map<string, CarrierStats>()
  for (const r of grouped.rows) {
    statsByCarrier.set(r.carrier_id, {
      total: Number(r.total ?? 0),
      delivered: Number(r.delivered ?? 0),
      exception: Number(r.exception ?? 0),
    })
  }
  return rows.map((row) => projectCarrier(row, statsByCarrier.get(row.id) ?? ZERO_STATS))
}

function regionFromCode(code: string): string {
  const upper = code.toUpperCase()
  if (['UPS', 'FEDEX', 'USPS', 'DHL'].includes(upper)) return 'North America'
  if (['DPD', 'GLS', 'HERMES'].includes(upper)) return 'Europe'
  if (upper.includes('JP') || upper.includes('CN')) return 'Asia'
  return 'Global'
}

// Map backend DB severity tokens (info/warning/error) to the frontend's
// expected enum (low/medium/high) so the Alerts page can color-code rows
// without a translation layer in the React component.
const SEVERITY_MAP: Record<string, 'low' | 'medium' | 'high'> = {
  info: 'low',
  low: 'low',
  warning: 'medium',
  medium: 'medium',
  error: 'high',
  critical: 'high',
  high: 'high',
}

// Map alert type tokens to the small icon set the Alerts page renders.
// Falls back to 'system_message' so the icon resolver never returns undefined.
const KNOWN_TYPES = new Set([
  'customs_hold',
  'delivery_attempt',
  'address_issue',
  'weather_delay',
  'damaged',
  'webhook_failure',
  'system_message',
  'exception_alert',
])

/**
 * Decorate alert with denormalized shipment fields and a `resolved` flag
 * derived from `read_at`.
 */
export async function decorateAlerts(rows: AlertRow[]): Promise<Array<Record<string, unknown>>> {
  if (rows.length === 0) return []
  const shipIds = [...new Set(rows.map((r) => r.shipment_id).filter(Boolean) as string[])]
  const shipMap = new Map<string, ShipmentRow>()
  if (shipIds.length > 0) {
    const ships = await findMany<ShipmentRow>('shipments', {
      where: [{ field: 'id', operator: 'in', value: shipIds }],
      limit: shipIds.length,
    })
    for (const s of ships) shipMap.set(s.id, s)
  }
  return rows.map((row) => {
    const ship = row.shipment_id ? shipMap.get(row.shipment_id) : undefined
    return {
      ...row,
      tracking_number: ship?.tracking_number ?? '—',
      customer: ship?.recipient_name ?? '',
      severity: SEVERITY_MAP[row.severity] ?? 'medium',
      type: KNOWN_TYPES.has(row.type) ? row.type : 'system_message',
      resolved: row.read_at != null,
      assigned_to: null as string | null,
    }
  })
}
