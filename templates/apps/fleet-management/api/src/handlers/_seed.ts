/**
 * fleet-management — per-user demo seeding.
 *
 * On the first authenticated request from a new user this module checks
 * whether the user has any vehicles yet. If not, it seeds a realistic
 * fleet snapshot derived from the JSON fixtures in api/fixtures/. Every
 * row is owned by the caller's user_id, so it stays scoped per-user
 * even though the fixture content is shared.
 *
 * The seed is gated on count(vehicles). Once a user has vehicles,
 * subsequent calls become a no-op. Concurrent calls are guarded with
 * an in-memory `seedingInFlight` map to avoid double-seeding when a
 * fresh signup hits multiple endpoints simultaneously.
 */

import { count, create, updateById } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

const seededUsers = new Set<string>()
const seedingInFlight = new Map<string, Promise<void>>()

interface VehicleFixture {
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

interface DriverFixture {
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

interface AlertFixture {
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

interface MaintenanceFixture {
  id: string
  vehicle_id: string
  vehicle_plate: string
  type: string
  description: string
  scheduled_for: string
  status: string
  technician: string | null
  cost_estimate: number
  parts: Array<{ name: string; sku: string; cost: number; quantity: number }>
  labor_hours: number
  labor_rate: number
  notes: string
  events: Array<{ id: string; timestamp: string; description: string }>
}

interface TripFixture {
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

interface RouteFixture {
  id: string
  name: string
  driver: string
  vehicle_plate: string
  origin: string
  destination: string
  stops_count: number
  stops_completed: number
  status: string
  eta: string
  miles: number
  started_at: string | null
}

interface GeofenceFixture {
  id: string
  name: string
  type: string
  rule: string
  radius_miles: number
  center: string
  active: boolean
  vehicles_assigned: number
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

const VEHICLES: VehicleFixture[] = [
  {
    id: 'veh_001',
    plate: 'TRK-4218',
    vin: '1HGCM82633A001234',
    make: 'Freightliner',
    model: 'Cascadia',
    year: 2024,
    vehicle_type: 'truck',
    driver: 'Marcus Reilly',
    driver_id: 'drv_001',
    status: 'in_transit',
    location: 'I-80 W, Cheyenne, WY',
    odometer: 184320,
    speed_mph: 64,
    engine_temp: 198,
    battery_pct: 78,
    fuel_pct: 64,
    next_maintenance_miles: 190000,
    last_seen: '__T-4m',
  },
  {
    id: 'veh_002',
    plate: 'TRK-4219',
    vin: '1HGCM82633A001235',
    make: 'Freightliner',
    model: 'Cascadia',
    year: 2024,
    vehicle_type: 'truck',
    driver: 'Linda Park',
    driver_id: 'drv_002',
    status: 'in_transit',
    location: 'I-95 N, Baltimore, MD',
    odometer: 142910,
    speed_mph: 58,
    engine_temp: 192,
    battery_pct: 82,
    fuel_pct: 71,
    next_maintenance_miles: 150000,
    last_seen: '__T-5m',
  },
  {
    id: 'veh_003',
    plate: 'VAN-2042',
    vin: 'WD3PE7CC8K0001234',
    make: 'Mercedes',
    model: 'Sprinter',
    year: 2023,
    vehicle_type: 'van',
    driver: 'Devon Walsh',
    driver_id: 'drv_003',
    status: 'operational',
    location: 'Eastline depot, Brooklyn',
    odometer: 68240,
    speed_mph: 0,
    engine_temp: 0,
    battery_pct: 100,
    fuel_pct: 92,
    next_maintenance_miles: 75000,
    last_seen: '__T-15m',
  },
  {
    id: 'veh_004',
    plate: 'VAN-2043',
    vin: 'WD3PE7CC8K0001235',
    make: 'Mercedes',
    model: 'Sprinter',
    year: 2023,
    vehicle_type: 'van',
    driver: 'Aisha Martin',
    driver_id: 'drv_004',
    status: 'in_transit',
    location: 'Atlantic Ave, Brooklyn',
    odometer: 71820,
    speed_mph: 28,
    engine_temp: 188,
    battery_pct: 88,
    fuel_pct: 78,
    next_maintenance_miles: 75000,
    last_seen: '__T-3m',
  },
  {
    id: 'veh_005',
    plate: 'TRK-4220',
    vin: '1HGCM82633A001236',
    make: 'Volvo',
    model: 'VNL 760',
    year: 2022,
    vehicle_type: 'truck',
    driver: 'Henry Park',
    driver_id: 'drv_005',
    status: 'alert',
    location: 'I-78 E, Allentown, PA',
    odometer: 312840,
    speed_mph: 0,
    engine_temp: 232,
    battery_pct: 60,
    fuel_pct: 18,
    next_maintenance_miles: 320000,
    last_seen: '__T-7m',
  },
  {
    id: 'veh_006',
    plate: 'VAN-2044',
    vin: 'WD3PE7CC8K0001236',
    make: 'Ford',
    model: 'Transit 350',
    year: 2024,
    vehicle_type: 'van',
    driver: 'Tessa Bright',
    driver_id: 'drv_006',
    status: 'idle',
    location: 'Newark depot',
    odometer: 28140,
    speed_mph: 0,
    engine_temp: 142,
    battery_pct: 92,
    fuel_pct: 56,
    next_maintenance_miles: 30000,
    last_seen: '__T-5m',
  },
  {
    id: 'veh_007',
    plate: 'VAN-2045',
    vin: 'WD3PE7CC8K0001237',
    make: 'Ford',
    model: 'Transit 250',
    year: 2024,
    vehicle_type: 'van',
    driver: null,
    driver_id: null,
    status: 'operational',
    location: 'Brooklyn depot',
    odometer: 18420,
    speed_mph: 0,
    engine_temp: 0,
    battery_pct: 100,
    fuel_pct: 100,
    next_maintenance_miles: 30000,
    last_seen: '__T-7h',
  },
  {
    id: 'veh_008',
    plate: 'TRK-4221',
    vin: '1HGCM82633A001237',
    make: 'Kenworth',
    model: 'T680',
    year: 2021,
    vehicle_type: 'truck',
    driver: 'Priya Desai',
    driver_id: 'drv_007',
    status: 'in_transit',
    location: 'I-90 W, Cleveland, OH',
    odometer: 421890,
    speed_mph: 62,
    engine_temp: 196,
    battery_pct: 71,
    fuel_pct: 48,
    next_maintenance_miles: 425000,
    last_seen: '__T-3m',
  },
  {
    id: 'veh_009',
    plate: 'VAN-2046',
    vin: 'WD3PE7CC8K0001238',
    make: 'Mercedes',
    model: 'Sprinter',
    year: 2022,
    vehicle_type: 'van',
    driver: 'Kenji Tanaka',
    driver_id: 'drv_008',
    status: 'in_transit',
    location: 'I-87 N, Albany, NY',
    odometer: 124820,
    speed_mph: 65,
    engine_temp: 194,
    battery_pct: 85,
    fuel_pct: 67,
    next_maintenance_miles: 130000,
    last_seen: '__T-3m',
  },
  {
    id: 'veh_010',
    plate: 'TRK-4222',
    vin: '1HGCM82633A001238',
    make: 'Volvo',
    model: 'VNL 760',
    year: 2023,
    vehicle_type: 'truck',
    driver: 'Marisol Vega',
    driver_id: 'drv_009',
    status: 'in_transit',
    location: 'I-65 S, Indianapolis, IN',
    odometer: 198410,
    speed_mph: 67,
    engine_temp: 200,
    battery_pct: 76,
    fuel_pct: 82,
    next_maintenance_miles: 200000,
    last_seen: '__T-3m',
  },
  {
    id: 'veh_011',
    plate: 'VAN-2047',
    vin: 'WD3PE7CC8K0001239',
    make: 'Ford',
    model: 'Transit 350',
    year: 2023,
    vehicle_type: 'van',
    driver: 'Ezra Cohen',
    driver_id: 'drv_010',
    status: 'alert',
    location: 'Holland Tunnel, Manhattan',
    odometer: 64820,
    speed_mph: 0,
    engine_temp: 198,
    battery_pct: 88,
    fuel_pct: 12,
    next_maintenance_miles: 75000,
    last_seen: '__T-10m',
  },
  {
    id: 'veh_012',
    plate: 'TRK-4223',
    vin: '1HGCM82633A001239',
    make: 'Kenworth',
    model: 'T680',
    year: 2022,
    vehicle_type: 'truck',
    driver: null,
    driver_id: null,
    status: 'offline',
    location: 'Newark service center',
    odometer: 268340,
    speed_mph: 0,
    engine_temp: 0,
    battery_pct: 0,
    fuel_pct: 30,
    next_maintenance_miles: 270000,
    last_seen: '__T-30h',
  },
]

const DRIVERS: DriverFixture[] = [
  {
    id: 'drv_001',
    name: 'Marcus Reilly',
    email: 'marcus@bearing.io',
    phone: '(555) 123-4567',
    license_number: 'CDL-NY-8472913',
    license_class: 'CDL Class A',
    license_expires: '2027-08-15',
    vehicle_id: 'veh_001',
    vehicle_plate: 'TRK-4218',
    status: 'on_duty',
    safety_score: 94,
    hours_today: 6.2,
    hours_week: 42.4,
    hours_max_week: 60,
    total_miles: 184320,
    hire_date: '2021-03-15',
    certifications: ['Hazmat', 'Doubles/Triples', 'Tanker'],
  },
  {
    id: 'drv_002',
    name: 'Linda Park',
    email: 'linda@bearing.io',
    phone: '(555) 234-5678',
    license_number: 'CDL-NJ-8472914',
    license_class: 'CDL Class A',
    license_expires: '2026-11-22',
    vehicle_id: 'veh_002',
    vehicle_plate: 'TRK-4219',
    status: 'on_duty',
    safety_score: 92,
    hours_today: 4.8,
    hours_week: 38.2,
    hours_max_week: 60,
    total_miles: 142910,
    hire_date: '2022-01-10',
    certifications: ['Hazmat', 'Doubles/Triples'],
  },
  {
    id: 'drv_003',
    name: 'Devon Walsh',
    email: 'devon@bearing.io',
    phone: '(555) 345-6789',
    license_number: 'CDL-NY-8472915',
    license_class: 'Class C',
    license_expires: '2028-05-04',
    vehicle_id: 'veh_003',
    vehicle_plate: 'VAN-2042',
    status: 'on_break',
    safety_score: 96,
    hours_today: 3.4,
    hours_week: 28.6,
    hours_max_week: 50,
    total_miles: 68240,
    hire_date: '2023-06-22',
    certifications: ['Defensive driving'],
  },
  {
    id: 'drv_004',
    name: 'Aisha Martin',
    email: 'aisha@bearing.io',
    phone: '(555) 456-7890',
    license_number: 'CDL-NY-8472916',
    license_class: 'Class C',
    license_expires: '2027-02-18',
    vehicle_id: 'veh_004',
    vehicle_plate: 'VAN-2043',
    status: 'on_duty',
    safety_score: 89,
    hours_today: 5.1,
    hours_week: 36.0,
    hours_max_week: 50,
    total_miles: 71820,
    hire_date: '2022-09-08',
    certifications: ['Defensive driving'],
  },
  {
    id: 'drv_005',
    name: 'Henry Park',
    email: 'henry@bearing.io',
    phone: '(555) 567-8901',
    license_number: 'CDL-NJ-8472917',
    license_class: 'CDL Class A',
    license_expires: '2026-12-30',
    vehicle_id: 'veh_005',
    vehicle_plate: 'TRK-4220',
    status: 'on_duty',
    safety_score: 78,
    hours_today: 7.4,
    hours_week: 52.8,
    hours_max_week: 60,
    total_miles: 312840,
    hire_date: '2019-04-12',
    certifications: ['Hazmat'],
  },
  {
    id: 'drv_006',
    name: 'Tessa Bright',
    email: 'tessa@bearing.io',
    phone: '(555) 678-9012',
    license_number: 'CDL-NJ-8472918',
    license_class: 'Class C',
    license_expires: '2028-09-17',
    vehicle_id: 'veh_006',
    vehicle_plate: 'VAN-2044',
    status: 'on_break',
    safety_score: 91,
    hours_today: 2.0,
    hours_week: 16.4,
    hours_max_week: 50,
    total_miles: 28140,
    hire_date: '2024-02-01',
    certifications: ['Defensive driving'],
  },
  {
    id: 'drv_007',
    name: 'Priya Desai',
    email: 'priya@bearing.io',
    phone: '(555) 789-0123',
    license_number: 'CDL-OH-8472919',
    license_class: 'CDL Class A',
    license_expires: '2027-06-25',
    vehicle_id: 'veh_008',
    vehicle_plate: 'TRK-4221',
    status: 'on_duty',
    safety_score: 88,
    hours_today: 6.8,
    hours_week: 48.2,
    hours_max_week: 60,
    total_miles: 421890,
    hire_date: '2018-08-20',
    certifications: ['Hazmat', 'Doubles/Triples', 'Tanker'],
  },
  {
    id: 'drv_008',
    name: 'Kenji Tanaka',
    email: 'kenji@bearing.io',
    phone: '(555) 890-1234',
    license_number: 'CDL-NY-8472920',
    license_class: 'Class C',
    license_expires: '2026-10-08',
    vehicle_id: 'veh_009',
    vehicle_plate: 'VAN-2046',
    status: 'on_duty',
    safety_score: 93,
    hours_today: 4.2,
    hours_week: 30.4,
    hours_max_week: 50,
    total_miles: 124820,
    hire_date: '2023-01-15',
    certifications: ['Defensive driving'],
  },
  {
    id: 'drv_009',
    name: 'Marisol Vega',
    email: 'marisol@bearing.io',
    phone: '(555) 901-2345',
    license_number: 'CDL-IN-8472921',
    license_class: 'CDL Class A',
    license_expires: '2028-03-12',
    vehicle_id: 'veh_010',
    vehicle_plate: 'TRK-4222',
    status: 'on_duty',
    safety_score: 95,
    hours_today: 5.6,
    hours_week: 40.8,
    hours_max_week: 60,
    total_miles: 198410,
    hire_date: '2021-11-30',
    certifications: ['Hazmat', 'Tanker'],
  },
  {
    id: 'drv_010',
    name: 'Ezra Cohen',
    email: 'ezra@bearing.io',
    phone: '(555) 012-3456',
    license_number: 'CDL-NY-8472922',
    license_class: 'Class C',
    license_expires: '2027-12-15',
    vehicle_id: 'veh_011',
    vehicle_plate: 'VAN-2047',
    status: 'off_duty',
    safety_score: 84,
    hours_today: 0.0,
    hours_week: 22.0,
    hours_max_week: 50,
    total_miles: 64820,
    hire_date: '2024-08-10',
    certifications: ['Defensive driving'],
  },
]

const ALERTS: AlertFixture[] = [
  {
    id: 'al_001',
    vehicle_id: 'veh_005',
    vehicle_plate: 'TRK-4220',
    driver: 'Henry Park',
    type: 'low_fuel',
    message: 'Fuel below 20% — recommend stop',
    severity: 'high',
    created_at: '__T-7m',
    resolved: false,
  },
  {
    id: 'al_002',
    vehicle_id: 'veh_011',
    vehicle_plate: 'VAN-2047',
    driver: 'Ezra Cohen',
    type: 'low_fuel',
    message: 'Fuel critical: 12% remaining',
    severity: 'high',
    created_at: '__T-10m',
    resolved: false,
  },
  {
    id: 'al_003',
    vehicle_id: 'veh_005',
    vehicle_plate: 'TRK-4220',
    driver: 'Henry Park',
    type: 'speeding',
    message: 'Speeding: 78 mph in 65 zone (I-78 E)',
    severity: 'medium',
    created_at: '__T-1h23m',
    resolved: false,
  },
  {
    id: 'al_004',
    vehicle_id: 'veh_008',
    vehicle_plate: 'TRK-4221',
    driver: 'Priya Desai',
    type: 'hard_brake',
    message: 'Hard braking event detected',
    severity: 'low',
    created_at: '__T-1h57m',
    resolved: false,
  },
  {
    id: 'al_005',
    vehicle_id: 'veh_004',
    vehicle_plate: 'VAN-2043',
    driver: 'Aisha Martin',
    type: 'geofence_breach',
    message: 'Exited service area (Brooklyn boundary)',
    severity: 'medium',
    created_at: '__T-3h31m',
    resolved: true,
  },
  {
    id: 'al_006',
    vehicle_id: 'veh_001',
    vehicle_plate: 'TRK-4218',
    driver: 'Marcus Reilly',
    type: 'idle_threshold',
    message: 'Idle 22 minutes at rest stop (limit: 15)',
    severity: 'low',
    created_at: '__T-4h45m',
    resolved: true,
  },
  {
    id: 'al_007',
    vehicle_id: 'veh_005',
    vehicle_plate: 'TRK-4220',
    driver: 'Henry Park',
    type: 'maintenance_due',
    message: 'Approaching 320K-mile service interval (within 1,200 mi)',
    severity: 'medium',
    created_at: '__T-7h45m',
    resolved: false,
  },
]

const MAINTENANCE: MaintenanceFixture[] = [
  {
    id: 'mn_001',
    vehicle_id: 'veh_005',
    vehicle_plate: 'TRK-4220',
    type: 'oil_change',
    description: 'Synthetic oil change + filter, 50K-mile service',
    scheduled_for: '__T+24h',
    status: 'overdue',
    technician: 'Jamal Bishop',
    cost_estimate: 285,
    parts: [
      { name: 'Mobil 1 Synthetic 5W-40', sku: 'MOB-5W40', cost: 12, quantity: 12 },
      { name: 'Donaldson oil filter', sku: 'DON-P551313', cost: 18, quantity: 1 },
    ],
    labor_hours: 1.5,
    labor_rate: 85,
    notes: 'Engine showing slight oil consumption — consider compression test next service.',
    events: [
      { id: 'ev_1', timestamp: '__T-11d', description: 'Work order created' },
      { id: 'ev_2', timestamp: '__T-4d', description: 'Service window opened' },
      { id: 'ev_3', timestamp: '__T-18h', description: 'Status changed to overdue' },
    ],
  },
  {
    id: 'mn_002',
    vehicle_id: 'veh_011',
    vehicle_plate: 'VAN-2047',
    type: 'brake_service',
    description: 'Front pad replacement + rotor inspection',
    scheduled_for: '__T-2h',
    status: 'in_progress',
    technician: 'Carla Ng',
    cost_estimate: 480,
    parts: [
      { name: 'EBC RP-1 brake pads (front)', sku: 'EBC-RP-1234', cost: 180, quantity: 1 },
      { name: 'Brake fluid DOT 4', sku: 'DOT4-32', cost: 12, quantity: 1 },
    ],
    labor_hours: 2.5,
    labor_rate: 95,
    notes: 'Brake fade reported. Rotors look OK; pads at 30%.',
    events: [
      { id: 'ev_10', timestamp: '__T-2d', description: 'Driver reported brake fade' },
      { id: 'ev_11', timestamp: '__T-2h', description: 'In progress' },
    ],
  },
  {
    id: 'mn_003',
    vehicle_id: 'veh_001',
    vehicle_plate: 'TRK-4218',
    type: 'tire_rotation',
    description: 'Drive-axle tire rotation + balance',
    scheduled_for: '__T+4d',
    status: 'scheduled',
    technician: null,
    cost_estimate: 220,
    parts: [{ name: 'Wheel weight kit', sku: 'WW-KIT', cost: 8, quantity: 1 }],
    labor_hours: 2,
    labor_rate: 95,
    notes: '',
    events: [
      { id: 'ev_20', timestamp: '__T-6d', description: 'Auto-scheduled at 180K-mile interval' },
    ],
  },
  {
    id: 'mn_004',
    vehicle_id: 'veh_008',
    vehicle_plate: 'TRK-4221',
    type: 'inspection',
    description: 'Annual DOT inspection',
    scheduled_for: '__T+12d',
    status: 'scheduled',
    technician: null,
    cost_estimate: 380,
    parts: [],
    labor_hours: 4,
    labor_rate: 95,
    notes: '',
    events: [{ id: 'ev_30', timestamp: '__T-18d', description: 'Created from auto-renewal' }],
  },
  {
    id: 'mn_005',
    vehicle_id: 'veh_012',
    vehicle_plate: 'TRK-4223',
    type: 'repair',
    description: 'Coolant leak — replacing hose + thermostat',
    scheduled_for: '__T-1d',
    status: 'completed',
    technician: 'Jamal Bishop',
    cost_estimate: 620,
    parts: [
      { name: 'Lower radiator hose', sku: 'GTS-LRH-T680', cost: 84, quantity: 1 },
      { name: 'Thermostat 195°F', sku: 'GTS-TSTAT-195', cost: 42, quantity: 1 },
      { name: 'Coolant (50/50)', sku: 'COOL-G05', cost: 22, quantity: 4 },
    ],
    labor_hours: 4.5,
    labor_rate: 95,
    notes: 'Replaced hose, flushed system, confirmed no further leaks.',
    events: [
      { id: 'ev_40', timestamp: '__T-3d', description: 'Coolant leak reported by driver' },
      { id: 'ev_41', timestamp: '__T-1d', description: 'Service started' },
      { id: 'ev_42', timestamp: '__T-22h', description: 'Service completed and verified' },
    ],
  },
]

const TRIPS: TripFixture[] = [
  {
    id: 'tp_001',
    vehicle_id: 'veh_001',
    vehicle_plate: 'TRK-4218',
    driver: 'Marcus Reilly',
    driver_id: 'drv_001',
    origin: 'Brooklyn, NY',
    destination: 'Cleveland, OH',
    miles: 462,
    duration_minutes: 720,
    fuel_used_gal: 78.4,
    events: 0,
    started_at: '__T-1d8h',
    completed_at: '__T-20h',
  },
  {
    id: 'tp_002',
    vehicle_id: 'veh_002',
    vehicle_plate: 'TRK-4219',
    driver: 'Linda Park',
    driver_id: 'drv_002',
    origin: 'Newark, NJ',
    destination: 'Boston, MA',
    miles: 218,
    duration_minutes: 280,
    fuel_used_gal: 38.2,
    events: 0,
    started_at: '__T-1d1h',
    completed_at: '__T-20h20m',
  },
  {
    id: 'tp_003',
    vehicle_id: 'veh_005',
    vehicle_plate: 'TRK-4220',
    driver: 'Henry Park',
    driver_id: 'drv_005',
    origin: 'Pittsburgh, PA',
    destination: 'Allentown, PA',
    miles: 312,
    duration_minutes: 410,
    fuel_used_gal: 56.8,
    events: 2,
    started_at: '__T-2d9h',
    completed_at: '__T-2d2h10m',
  },
  {
    id: 'tp_004',
    vehicle_id: 'veh_004',
    vehicle_plate: 'VAN-2043',
    driver: 'Aisha Martin',
    driver_id: 'drv_004',
    origin: 'Brooklyn, NY',
    destination: 'Bronx, NY',
    miles: 64,
    duration_minutes: 240,
    fuel_used_gal: 8.4,
    events: 0,
    started_at: '__T-1d4h',
    completed_at: '__T-1d',
  },
  {
    id: 'tp_005',
    vehicle_id: 'veh_008',
    vehicle_plate: 'TRK-4221',
    driver: 'Priya Desai',
    driver_id: 'drv_007',
    origin: 'Indianapolis, IN',
    destination: 'Cleveland, OH',
    miles: 314,
    duration_minutes: 380,
    fuel_used_gal: 52.4,
    events: 1,
    started_at: '__T-2d2h',
    completed_at: '__T-1d19h40m',
  },
  {
    id: 'tp_006',
    vehicle_id: 'veh_010',
    vehicle_plate: 'TRK-4222',
    driver: 'Marisol Vega',
    driver_id: 'drv_009',
    origin: 'Atlanta, GA',
    destination: 'Indianapolis, IN',
    miles: 532,
    duration_minutes: 640,
    fuel_used_gal: 89.4,
    events: 0,
    started_at: '__T-3d10h',
    completed_at: '__T-2d23h20m',
  },
  {
    id: 'tp_007',
    vehicle_id: 'veh_001',
    vehicle_plate: 'TRK-4218',
    driver: 'Marcus Reilly',
    driver_id: 'drv_001',
    origin: 'Cleveland, OH',
    destination: 'Brooklyn, NY',
    miles: 462,
    duration_minutes: 700,
    fuel_used_gal: 76.8,
    events: 0,
    started_at: '__T-9h',
    completed_at: null,
  },
  {
    id: 'tp_008',
    vehicle_id: 'veh_009',
    vehicle_plate: 'VAN-2046',
    driver: 'Kenji Tanaka',
    driver_id: 'drv_008',
    origin: 'Brooklyn, NY',
    destination: 'Albany, NY',
    miles: 154,
    duration_minutes: 220,
    fuel_used_gal: 24.2,
    events: 0,
    started_at: '__T-2h',
    completed_at: null,
  },
]

const ROUTES: RouteFixture[] = [
  {
    id: 'rt_001',
    name: 'Brooklyn → Chicago — Tuesday Run',
    driver: 'Marcus Reilly',
    vehicle_plate: 'TRK-4218',
    origin: 'Brooklyn, NY',
    destination: 'Chicago, IL',
    stops_count: 3,
    stops_completed: 1,
    status: 'in_progress',
    eta: '__T+1d3h',
    miles: 798,
    started_at: '__T-9h',
  },
  {
    id: 'rt_002',
    name: 'NYC metro afternoon',
    driver: 'Aisha Martin',
    vehicle_plate: 'VAN-2043',
    origin: 'Brooklyn, NY',
    destination: 'Bronx, NY',
    stops_count: 12,
    stops_completed: 5,
    status: 'in_progress',
    eta: '__T+3h',
    miles: 64,
    started_at: '__T-4h',
  },
  {
    id: 'rt_003',
    name: 'Newark → Boston — overnight',
    driver: 'Linda Park',
    vehicle_plate: 'TRK-4219',
    origin: 'Newark, NJ',
    destination: 'Boston, MA',
    stops_count: 2,
    stops_completed: 0,
    status: 'in_progress',
    eta: '__T+15h',
    miles: 218,
    started_at: '__T-30m',
  },
  {
    id: 'rt_004',
    name: 'Allentown → Pittsburgh',
    driver: 'Henry Park',
    vehicle_plate: 'TRK-4220',
    origin: 'Allentown, PA',
    destination: 'Pittsburgh, PA',
    stops_count: 4,
    stops_completed: 1,
    status: 'in_progress',
    eta: '__T+11h',
    miles: 312,
    started_at: '__T-7h',
  },
  {
    id: 'rt_005',
    name: 'Cleveland → Indianapolis',
    driver: 'Priya Desai',
    vehicle_plate: 'TRK-4221',
    origin: 'Cleveland, OH',
    destination: 'Indianapolis, IN',
    stops_count: 1,
    stops_completed: 0,
    status: 'in_progress',
    eta: '__T+6h',
    miles: 314,
    started_at: '__T-2h',
  },
  {
    id: 'rt_006',
    name: 'Brooklyn → Albany',
    driver: 'Kenji Tanaka',
    vehicle_plate: 'VAN-2046',
    status: 'in_progress',
    origin: 'Brooklyn, NY',
    destination: 'Albany, NY',
    stops_count: 2,
    stops_completed: 0,
    eta: '__T+5h',
    miles: 154,
    started_at: '__T-2h',
  },
  {
    id: 'rt_010',
    name: 'Tomorrow: Newark → Atlanta',
    driver: 'Marisol Vega',
    vehicle_plate: 'TRK-4222',
    origin: 'Newark, NJ',
    destination: 'Atlanta, GA',
    stops_count: 4,
    stops_completed: 0,
    status: 'planned',
    eta: '__T+2d',
    miles: 884,
    started_at: null,
  },
  {
    id: 'rt_011',
    name: 'Tomorrow: NYC delivery loop',
    driver: 'Devon Walsh',
    vehicle_plate: 'VAN-2042',
    origin: 'Brooklyn, NY',
    destination: 'Brooklyn, NY',
    stops_count: 18,
    stops_completed: 0,
    status: 'planned',
    eta: '__T+1d',
    miles: 92,
    started_at: null,
  },
  {
    id: 'rt_020',
    name: 'Yesterday: Brooklyn → Cleveland',
    driver: 'Marcus Reilly',
    vehicle_plate: 'TRK-4218',
    origin: 'Brooklyn, NY',
    destination: 'Cleveland, OH',
    stops_count: 2,
    stops_completed: 2,
    status: 'completed',
    eta: '__T-20h',
    miles: 462,
    started_at: '__T-1d8h',
  },
]

const GEOFENCES: GeofenceFixture[] = [
  {
    id: 'gf_001',
    name: 'Brooklyn depot',
    type: 'depot',
    rule: 'both',
    radius_miles: 0.25,
    center: 'Brooklyn Navy Yard, NY',
    active: true,
    vehicles_assigned: 12,
  },
  {
    id: 'gf_002',
    name: 'Newark depot',
    type: 'depot',
    rule: 'both',
    radius_miles: 0.25,
    center: 'Newark Industrial Blvd, NJ',
    active: true,
    vehicles_assigned: 8,
  },
  {
    id: 'gf_003',
    name: 'Manhattan service area',
    type: 'service_area',
    rule: 'exit_alert',
    radius_miles: 5,
    center: 'Midtown Manhattan, NY',
    active: true,
    vehicles_assigned: 6,
  },
  {
    id: 'gf_004',
    name: 'Acme HQ delivery',
    type: 'customer',
    rule: 'entry_alert',
    radius_miles: 0.1,
    center: 'Acme Manufacturing, Newark, NJ',
    active: true,
    vehicles_assigned: 3,
  },
  {
    id: 'gf_005',
    name: 'FAA restricted zone',
    type: 'restricted',
    rule: 'restricted',
    radius_miles: 1,
    center: 'JFK Airport restricted, NY',
    active: true,
    vehicles_assigned: 12,
  },
  {
    id: 'gf_006',
    name: 'Holiday warehouse',
    type: 'customer',
    rule: 'both',
    radius_miles: 0.15,
    center: 'Holiday Distribution, Boston, MA',
    active: false,
    vehicles_assigned: 0,
  },
]

const NOTIFICATIONS: NotificationFixture[] = [
  {
    id: 'ntf_001',
    type: 'speeding_alert',
    title: 'Speeding alert — TRK-4220',
    body: 'Henry Park, 78 mph in 65 zone (I-78 E)',
    href: '/alerts',
    created_at: '__T-1h23m',
    unread: true,
  },
  {
    id: 'ntf_002',
    type: 'maintenance_due',
    title: 'TRK-4220 — service due in 1,200 mi',
    body: 'Approaching 320K-mile interval. Schedule with Jamal.',
    href: '/maintenance',
    created_at: '__T-7h45m',
    unread: true,
  },
  {
    id: 'ntf_003',
    type: 'route_completed',
    title: 'Route completed: Cleveland',
    body: 'Marcus Reilly arrived 12 min early. Brooklyn → Cleveland, 462 mi.',
    href: '/trips',
    created_at: '__T-20h',
    unread: false,
  },
  {
    id: 'ntf_004',
    type: 'driver_assigned',
    title: 'Tessa Bright assigned to VAN-2044',
    body: 'Newark depot · cargo van · effective today',
    href: '/drivers',
    created_at: '__T-1d8h',
    unread: false,
  },
  {
    id: 'ntf_005',
    type: 'system_message',
    title: 'Welcome to Bearing',
    body: 'Add your first vehicle and assign a driver to get started.',
    href: '/vehicles',
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

/**
 * Seed demo content for a single user, idempotently.
 *
 * Returns the maps from fixture-id → DB-uuid for cross-referencing
 * (e.g. alerts.vehicle_id needs to reference the seeded vehicle's UUID).
 * Returns immediately if the user is already seeded.
 */
export async function seedDemoForUser(userId: string): Promise<void> {
  if (seededUsers.has(userId)) return
  const inFlight = seedingInFlight.get(userId)
  if (inFlight) return inFlight

  const promise = (async () => {
    const existing = await count('vehicles', [{ field: 'owner_id', operator: '=', value: userId }])
    if (existing > 0) {
      seededUsers.add(userId)
      return
    }

    const now = Date.now()
    const vehicleMap = new Map<string, string>()
    const driverMap = new Map<string, string>()
    const routeMap = new Map<string, string>()

    for (const v of VEHICLES) {
      const r = await create('vehicles', {
        owner_id: userId,
        name: v.plate,
        vin: v.vin,
        license_plate: v.plate,
        type: v.vehicle_type,
        make: v.make,
        model: v.model,
        year: v.year,
        fuel_type: v.vehicle_type === 'truck' ? 'diesel' : 'gasoline',
        status: v.status,
        mileage: v.odometer,
        odometer_km: Math.round(v.odometer * 1.609344),
        fuel_level_pct: v.fuel_pct,
        current_speed: v.speed_mph,
        last_seen_at: tStamp(v.last_seen, now),
        notes: v.location,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      })
      const dbId = (r.data as { id?: string } | null)?.id
      if (dbId) vehicleMap.set(v.id, dbId)
    }

    for (const d of DRIVERS) {
      const assignedVehicleDbId = d.vehicle_id ? vehicleMap.get(d.vehicle_id) : null
      const r = await create('drivers', {
        owner_id: userId,
        name: d.name,
        email: d.email,
        phone: d.phone,
        license_number: d.license_number,
        license_expiry: d.license_expires,
        status: d.status,
        assigned_vehicle_id: assignedVehicleDbId ?? null,
        hours_today: d.hours_today,
        score: d.safety_score,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      })
      const dbId = (r.data as { id?: string } | null)?.id
      if (dbId) driverMap.set(d.id, dbId)
    }

    // Backfill vehicles.assigned_driver_id from the source-vehicle's driver_id
    // so the FE can render driver name on each vehicle card without an extra
    // round-trip.
    for (const v of VEHICLES) {
      if (!v.driver_id) continue
      const vehicleDbId = vehicleMap.get(v.id)
      const driverDbId = driverMap.get(v.driver_id)
      if (vehicleDbId && driverDbId) {
        await updateById('vehicles', vehicleDbId, {
          assigned_driver_id: driverDbId,
          updated_at: new Date(now).toISOString(),
        })
      }
    }

    for (const a of ALERTS) {
      const vehicleDbId = vehicleMap.get(a.vehicle_id)
      // Driver fixture id derived from vehicle's driver_id.
      const sourceVehicle = VEHICLES.find((v) => v.id === a.vehicle_id)
      const driverDbId = sourceVehicle?.driver_id ? driverMap.get(sourceVehicle.driver_id) : null
      const occurredAt = tStamp(a.created_at, now)
      await create('alerts', {
        owner_id: userId,
        kind: a.type,
        severity: a.severity,
        vehicle_id: vehicleDbId ?? null,
        driver_id: driverDbId ?? null,
        message: a.message,
        occurred_at: occurredAt,
        acknowledged_at: a.resolved ? new Date(now).toISOString() : null,
        acknowledged_by: a.resolved ? userId : null,
        payload: null,
        created_at: occurredAt,
      })
    }

    for (const m of MAINTENANCE) {
      const vehicleDbId = vehicleMap.get(m.vehicle_id)
      if (!vehicleDbId) continue
      const scheduledAt = tStamp(m.scheduled_for, now)
      const startedAt =
        m.status === 'in_progress' || m.status === 'completed'
          ? tStamp(
              m.events.find((e) => /In progress|Service started/.test(e.description))?.timestamp ??
                m.scheduled_for,
              now,
            )
          : null
      const completedAt =
        m.status === 'completed'
          ? tStamp(
              m.events.find((e) => /completed/i.test(e.description))?.timestamp ?? m.scheduled_for,
              now,
            )
          : null
      const eventsResolved = m.events.map((e) => ({
        ...e,
        timestamp: tStamp(e.timestamp, now),
      }))
      await create('maintenance_records', {
        owner_id: userId,
        vehicle_id: vehicleDbId,
        type: m.type,
        kind: m.type,
        description: m.description,
        scheduled_date: scheduledAt,
        scheduled_at: scheduledAt,
        started_at: startedAt,
        completed_at: completedAt,
        completed_by: completedAt ? userId : null,
        estimated_cost: m.cost_estimate,
        actual_cost: m.status === 'completed' ? m.cost_estimate : 0,
        cost_cents: Math.round(m.cost_estimate * 100),
        assigned_to: m.technician,
        status: m.status,
        notes: m.notes,
        details_json: JSON.stringify({
          parts: m.parts,
          labor_hours: m.labor_hours,
          labor_rate: m.labor_rate,
          events: eventsResolved,
        }),
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      })
    }

    for (const t of TRIPS) {
      const vehicleDbId = vehicleMap.get(t.vehicle_id)
      const driverDbId = driverMap.get(t.driver_id)
      if (!vehicleDbId) continue
      await create('trips', {
        owner_id: userId,
        vehicle_id: vehicleDbId,
        driver_id: driverDbId ?? null,
        route_id: null,
        started_at: tStamp(t.started_at, now),
        ended_at: t.completed_at ? tStamp(t.completed_at, now) : null,
        distance_km: t.miles * 1.609344,
        duration_seconds: t.duration_minutes * 60,
        idle_seconds: 0,
        fuel_used_liters: t.fuel_used_gal * 3.785412,
        start_location: t.origin,
        end_location: t.destination,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      })
    }

    for (const r of ROUTES) {
      const sourceVehicle = VEHICLES.find((v) => v.plate === r.vehicle_plate)
      const sourceDriver = DRIVERS.find((d) => d.name === r.driver)
      const vehicleDbId = sourceVehicle ? vehicleMap.get(sourceVehicle.id) : null
      const driverDbId = sourceDriver ? driverMap.get(sourceDriver.id) : null
      const startedAt = r.started_at ? tStamp(r.started_at, now) : null
      const eta = tStamp(r.eta, now)
      const result = await create('fleet_routes', {
        owner_id: userId,
        name: r.name,
        vehicle_id: vehicleDbId ?? null,
        driver_id: driverDbId ?? null,
        scheduled_date: eta,
        status: r.status,
        origin: r.origin,
        destination: r.destination,
        total_distance: r.miles,
        planned_distance_km: r.miles * 1.609344,
        planned_duration_seconds: 0,
        started_at: startedAt,
        completed_at: r.status === 'completed' ? eta : null,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      })
      const dbId = (result.data as { id?: string } | null)?.id
      if (dbId) {
        routeMap.set(r.id, dbId)
        // Add stops based on stops_count
        for (let i = 0; i < r.stops_count; i++) {
          const completed = i < r.stops_completed
          await create('route_stops', {
            route_id: dbId,
            sequence: i + 1,
            address: `Stop ${i + 1} — ${r.destination}`,
            estimated_arrival: eta,
            actual_arrival: completed ? eta : null,
            status: completed ? 'completed' : 'pending',
            notes: '',
            created_at: new Date(now).toISOString(),
          })
        }
      }
    }

    // Geofences: build a small polygon around a notional center.
    let lat = 40.7
    let lng = -74.0
    for (const g of GEOFENCES) {
      const polygon = [
        { lat, lng },
        { lat: lat + 0.005, lng },
        { lat: lat + 0.005, lng: lng + 0.005 },
        { lat, lng: lng + 0.005 },
      ]
      // Embed the FE-facing type/center/radius/active/vehicles_assigned
      // into the polygon_json envelope since the schema lacks dedicated
      // columns. shapeGeofence reads them back out.
      await create('geofences', {
        owner_id: userId,
        name: g.name,
        kind: g.type === 'restricted' ? 'restricted' : 'allowed',
        polygon_json: JSON.stringify({
          polygon,
          fe: {
            type: g.type,
            radius_miles: g.radius_miles,
            center: g.center,
            active: g.active,
            vehicles_assigned: g.vehicles_assigned,
          },
        }),
        alert_on_enter: g.rule === 'entry_alert' || g.rule === 'both',
        alert_on_exit: g.rule === 'exit_alert' || g.rule === 'both',
        min_lat: lat,
        max_lat: lat + 0.005,
        min_lng: lng,
        max_lng: lng + 0.005,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      })
      lat += 0.01
      lng += 0.01
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
    logger.error('[fleet-management/_seed] Failed to seed demo data:', err)
    throw err
  } finally {
    seedingInFlight.delete(userId)
  }
}
