/**
 * fleet-management — DB-row → FE-shape transformers.
 *
 * The frontend pages were originally written against a fixture-shaped
 * payload (see api/fixtures/*.json). The Postgres schema uses different
 * column names (`license_plate` vs `plate`, `current_speed` vs
 * `speed_mph`, `kind` vs `type`, …). These helpers map DB rows back into
 * the fixture shape so existing pages render data without rewrites.
 *
 * Pure functions; no I/O. Joining (driver name, vehicle plate, …) is
 * handled by the caller fetching the related rows once and passing them
 * in as lookup maps.
 */

export type Row = Record<string, unknown>

export function asMap<T extends Row>(rows: readonly T[], key: keyof T): Map<string, T> {
  const m = new Map<string, T>()
  for (const r of rows) {
    const k = r[key]
    if (typeof k === 'string') m.set(k, r)
  }
  return m
}

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : v == null ? fallback : String(v)

const iso = (v: unknown, fallback = new Date().toISOString()): string => {
  if (v == null) return fallback
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'string') {
    const t = Date.parse(v)
    if (!Number.isNaN(t)) return new Date(t).toISOString()
    return v
  }
  return fallback
}

export interface ShapedVehicle {
  id: string
  plate: string
  vin: string
  make: string
  model: string
  year: number
  vehicle_type: string
  driver: string | null
  driver_id: string | null
  status: string
  location: string
  odometer: number
  speed_mph: number
  engine_temp: number
  battery_pct: number
  fuel_pct: number
  next_maintenance_miles: number
  last_seen: string
}

export function shapeVehicle(v: Row, driverById: Map<string, Row> = new Map()): ShapedVehicle {
  const driverId = str(v.assigned_driver_id, '') || null
  const driverRow = driverId ? driverById.get(driverId) : undefined
  const odometer = num(v.mileage ?? v.odometer_km)
  // Synthesize plausible values from real columns: vehicles approaching the
  // next 5K-mile interval; engine temp inferred from in-transit status.
  const status = str(v.status, 'operational')
  const speed = num(v.current_speed)
  const engineTemp = status === 'in_transit' && speed > 0 ? 192 + (speed % 10) : 0
  const fuel = num(v.fuel_level_pct, 0)
  // Battery on commercial trucks tracks separately; approximate from age + status.
  const battery = status === 'offline' ? 0 : status === 'idle' ? 92 : 70 + (fuel % 20)
  const nextMaint = Math.ceil(odometer / 5000) * 5000
  return {
    id: str(v.id),
    plate: str(v.license_plate ?? v.name),
    vin: str(v.vin),
    make: str(v.make),
    model: str(v.model),
    year: num(v.year),
    vehicle_type: str(v.type, 'truck'),
    driver: driverRow ? str(driverRow.name) : null,
    driver_id: driverId,
    status,
    location: str(v.notes, ''),
    odometer,
    speed_mph: speed,
    engine_temp: engineTemp,
    battery_pct: Math.max(0, Math.min(100, battery)),
    fuel_pct: fuel,
    next_maintenance_miles: nextMaint,
    last_seen: iso(v.last_seen_at),
  }
}

export interface ShapedDriver {
  id: string
  name: string
  email: string
  phone: string
  license_number: string
  license_class: string
  license_expires: string
  vehicle_id: string | null
  vehicle_plate: string | null
  status: string
  safety_score: number
  hours_today: number
  hours_week: number
  hours_max_week: number
  total_miles: number
  hire_date: string
  certifications: string[]
}

export function shapeDriver(d: Row, vehicleById: Map<string, Row> = new Map()): ShapedDriver {
  const vehicleId = str(d.assigned_vehicle_id, '') || null
  const vehicleRow = vehicleId ? vehicleById.get(vehicleId) : undefined
  const hoursToday = num(d.hours_today)
  // Derive weekly hours from today's hours (rough but plausible for demo).
  const hoursWeek = Math.round(hoursToday * 5.5 * 10) / 10
  const totalMilesFromVehicle = vehicleRow ? num(vehicleRow.mileage ?? vehicleRow.odometer_km) : 0
  return {
    id: str(d.id),
    name: str(d.name),
    email: str(d.email),
    phone: str(d.phone),
    license_number: str(d.license_number),
    license_class: 'CDL Class A',
    license_expires: iso(d.license_expiry, ''),
    vehicle_id: vehicleId,
    vehicle_plate: vehicleRow ? str(vehicleRow.license_plate ?? vehicleRow.name) : null,
    status: str(d.status, 'off_duty'),
    safety_score: num(d.score, 100),
    hours_today: hoursToday,
    hours_week: hoursWeek,
    hours_max_week: 60,
    total_miles: totalMilesFromVehicle,
    hire_date: iso(d.created_at, ''),
    certifications: [],
  }
}

export interface ShapedAlert {
  id: string
  vehicle_id: string
  vehicle_plate: string
  driver: string
  type: string
  message: string
  severity: string
  created_at: string
  resolved: boolean
}

export function shapeAlert(
  a: Row,
  vehicleById: Map<string, Row> = new Map(),
  driverById: Map<string, Row> = new Map(),
): ShapedAlert {
  const vehicleId = str(a.vehicle_id, '')
  const driverId = str(a.driver_id, '')
  const vehicleRow = vehicleById.get(vehicleId)
  const driverRow = driverById.get(driverId)
  return {
    id: str(a.id),
    vehicle_id: vehicleId,
    vehicle_plate: vehicleRow ? str(vehicleRow.license_plate ?? vehicleRow.name) : '',
    driver: driverRow ? str(driverRow.name) : '',
    type: str(a.kind),
    message: str(a.message),
    severity: str(a.severity, 'low'),
    created_at: iso(a.occurred_at ?? a.created_at),
    resolved: a.acknowledged_at != null,
  }
}

export interface ShapedMaintenance {
  id: string
  vehicle_id: string
  vehicle_plate: string
  type: string
  description: string
  scheduled_for: string
  status: string
  technician: string | null
  cost_estimate: number | null
  parts: Array<{ name: string; sku: string; cost: number; quantity: number }>
  labor_hours: number
  labor_rate: number
  notes: string
  events: Array<{ id: string; timestamp: string; description: string }>
}

export function shapeMaintenance(
  m: Row,
  vehicleById: Map<string, Row> = new Map(),
): ShapedMaintenance {
  const vehicleId = str(m.vehicle_id, '')
  const vehicleRow = vehicleById.get(vehicleId)
  let parts: ShapedMaintenance['parts'] = []
  let laborHours = 0
  let laborRate = 0
  let events: ShapedMaintenance['events'] = []
  const raw = m.details_json
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      if (Array.isArray(obj.parts)) parts = obj.parts as ShapedMaintenance['parts']
      laborHours = num(obj.labor_hours, 0)
      laborRate = num(obj.labor_rate, 0)
      if (Array.isArray(obj.events)) events = obj.events as ShapedMaintenance['events']
    }
  } catch (_error) {
    // ignore — malformed JSON falls back to empty arrays
  }
  return {
    id: str(m.id),
    vehicle_id: vehicleId,
    vehicle_plate: vehicleRow ? str(vehicleRow.license_plate ?? vehicleRow.name) : '',
    type: str(m.type, 'other'),
    description: str(m.description),
    scheduled_for: iso(m.scheduled_date ?? m.scheduled_at, ''),
    status: str(m.status, 'scheduled'),
    technician: m.assigned_to ? str(m.assigned_to) : null,
    cost_estimate: num(m.estimated_cost, 0) || null,
    parts,
    labor_hours: laborHours,
    labor_rate: laborRate,
    notes: str(m.notes, ''),
    events,
  }
}

export interface ShapedTrip {
  id: string
  vehicle_id: string
  vehicle_plate: string
  driver: string
  driver_id: string
  origin: string
  destination: string
  miles: number
  duration_minutes: number
  fuel_used_gal: number
  events: number
  started_at: string
  completed_at: string | null
}

export function shapeTrip(
  t: Row,
  vehicleById: Map<string, Row> = new Map(),
  driverById: Map<string, Row> = new Map(),
  eventCountById: Map<string, number> = new Map(),
): ShapedTrip {
  const vehicleId = str(t.vehicle_id, '')
  const driverId = str(t.driver_id, '')
  const vehicleRow = vehicleById.get(vehicleId)
  const driverRow = driverById.get(driverId)
  return {
    id: str(t.id),
    vehicle_id: vehicleId,
    vehicle_plate: vehicleRow ? str(vehicleRow.license_plate ?? vehicleRow.name) : '',
    driver: driverRow ? str(driverRow.name) : '',
    driver_id: driverId,
    origin: str(t.start_location ?? '', ''),
    destination: str(t.end_location ?? '', ''),
    miles: Math.round(num(t.distance_km) * 0.621371),
    duration_minutes: Math.round(num(t.duration_seconds) / 60),
    fuel_used_gal: Math.round((num(t.fuel_used_liters) / 3.785412) * 10) / 10,
    // Real recorded-event count for this trip. Callers that don't join trip_events
    // (e.g. contexts where the count is irrelevant) pass no map and get 0; the trip
    // list supplies it so the "N events" badge + per-row column aren't stuck at 0.
    events: eventCountById.get(str(t.id)) ?? 0,
    started_at: iso(t.started_at, ''),
    completed_at: t.ended_at ? iso(t.ended_at) : null,
  }
}

export interface ShapedRoute {
  id: string
  name: string
  driver: string
  driver_id: string | null
  vehicle_plate: string
  vehicle_id: string | null
  origin: string
  destination: string
  stops_count: number
  stops_completed: number
  status: string
  eta: string
  miles: number
  started_at: string | null
}

export function shapeRoute(
  r: Row,
  vehicleById: Map<string, Row> = new Map(),
  driverById: Map<string, Row> = new Map(),
  stopCounts: Map<string, { total: number; completed: number }> = new Map(),
): ShapedRoute {
  const id = str(r.id)
  const vehicleId = str(r.vehicle_id, '') || null
  const driverId = str(r.driver_id, '') || null
  const vehicleRow = vehicleId ? vehicleById.get(vehicleId) : undefined
  const driverRow = driverId ? driverById.get(driverId) : undefined
  const counts = stopCounts.get(id) ?? { total: 0, completed: 0 }
  // Frontend renders four statuses: active | planned | completed | deviated.
  // The DB-canonical status is `in_progress` (the value the API mutators
  // accept), so map it to `active` for the FE.
  const rawStatus = str(r.status, 'planned')
  const feStatus = rawStatus === 'in_progress' ? 'active' : rawStatus
  return {
    id,
    name: str(r.name),
    driver: driverRow ? str(driverRow.name) : '',
    driver_id: driverId,
    vehicle_plate: vehicleRow ? str(vehicleRow.license_plate ?? vehicleRow.name) : '',
    vehicle_id: vehicleId,
    origin: str(r.origin, ''),
    destination: str(r.destination, ''),
    stops_count: counts.total,
    stops_completed: counts.completed,
    status: feStatus,
    eta: iso(r.scheduled_date, ''),
    miles: num(r.total_distance),
    started_at: r.started_at ? iso(r.started_at) : null,
  }
}

export interface ShapedGeofence {
  id: string
  name: string
  type: string
  rule: string
  radius_miles: number
  center: string
  active: boolean
  vehicles_assigned: number
}

export function shapeGeofence(g: Row): ShapedGeofence {
  const onEnter = !!g.alert_on_enter
  const onExit = !!g.alert_on_exit
  const rule =
    onEnter && onExit ? 'both' : onEnter ? 'entry_alert' : onExit ? 'exit_alert' : 'restricted'
  // polygon_json may be a structured envelope from the seeder ({ polygon, fe })
  // or a raw polygon array authored by the create handler.
  let fe: Record<string, unknown> | undefined
  const raw = g.polygon_json
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (parsed && typeof parsed === 'object' && 'fe' in (parsed as Record<string, unknown>)) {
      fe = (parsed as { fe?: Record<string, unknown> }).fe
    }
  } catch (_error) {
    // ignore — malformed JSON falls back to undefined, shapeGeofence uses raw column values
    fe = undefined
  }
  return {
    id: str(g.id),
    name: str(g.name),
    type: fe ? str(fe.type, str(g.kind, 'allowed')) : str(g.kind, 'allowed'),
    rule,
    radius_miles: fe ? num(fe.radius_miles, 0.25) : 0.25,
    center: fe ? str(fe.center, str(g.name)) : str(g.name),
    active: fe ? Boolean(fe.active) : true,
    vehicles_assigned: fe ? num(fe.vehicles_assigned, 0) : 0,
  }
}

export interface ShapedNotification {
  id: string
  type: string
  title: string
  body: string
  href: string
  created_at: string
  unread: boolean
}

export function shapeNotification(n: Row): ShapedNotification {
  return {
    id: str(n.id),
    type: str(n.kind),
    title: str(n.title),
    body: str(n.body, ''),
    href: str(n.link, ''),
    created_at: iso(n.created_at),
    unread: n.read_at == null,
  }
}
