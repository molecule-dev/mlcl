/**
 * construction-management — per-user demo seeding.
 *
 * On the first authenticated request from a new user this module checks
 * whether the user has any projects yet. If not, it seeds a realistic
 * commercial-construction snapshot (jobsites, daily logs with work-per-area
 * entries, punch-list items with plan locations, threaded RFIs, and the
 * subcontractor directory) derived from the JSON fixtures in api/fixtures/.
 * Every row is owned by the caller's user_id, so it stays scoped per-user
 * even though the fixture content is shared.
 *
 * All money is integer cents. Timestamps use `__T±<offset>` tokens that
 * resolve relative to seed time, and log dates use `__D±<days>` tokens,
 * so the demo always shows "today's log" today and this week's RFI aging
 * this week.
 *
 * The seed is gated on count(projects). Once a user has projects,
 * subsequent calls become a no-op. Concurrent calls are guarded with
 * an in-memory `seedingInFlight` map to avoid double-seeding when a
 * fresh signup hits multiple endpoints simultaneously.
 */

import { count, create } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

const seededUsers = new Set<string>()
const seedingInFlight = new Map<string, Promise<void>>()

interface ProjectFixture {
  id: string
  code: string
  name: string
  description: string
  phase: string
  budget_cents: number
  progress: number
  start_offset_days: number
  end_offset_days: number | null
}

interface LogEntryFixture {
  area: string
  work_performed: string
}

interface DailyLogFixture {
  id: string
  project: string
  day_offset: number
  weather: string
  crew_count: number
  hours: number
  notes: string
  entries: LogEntryFixture[]
}

interface PunchItemFixture {
  id: string
  project: string
  location: string
  severity: 'low' | 'medium' | 'high'
  description: string
  assignee?: string
  status: 'open' | 'in_progress' | 'closed'
  photo_url?: string
  created_at: string
  closed_at?: string
}

interface RfiFixture {
  id: string
  project: string
  title: string
  question: string
  originator: string
  drawings_ref: string
  due_offset_days: number | null
  status: 'open' | 'answered' | 'closed'
  created_at: string
  responses: Array<{ author: string; body: string; is_final?: boolean; at: string }>
}

interface SubcontractorFixture {
  id: string
  project: string
  trade: string
  company: string
  contact: string
  contract_value_cents: number
  status: 'invited' | 'active' | 'terminated'
}

const PROJECTS: ProjectFixture[] = [
  {
    id: 'prj_harborview',
    code: 'HVT-204',
    name: 'Harborview Office Tower',
    description:
      '12-story Class A office tower over two levels of below-grade parking. Structural steel superstructure with curtain-wall envelope.',
    phase: 'structure',
    budget_cents: 1_840_000_000,
    progress: 62,
    start_offset_days: -214,
    end_offset_days: 305,
  },
  {
    id: 'prj_eastgate',
    code: 'EGR-118',
    name: 'Eastgate Retail Fit-Out',
    description:
      'Interior fit-out of 18,000 sq ft shell space into a grocery anchor plus two inline retail bays. TI package with full MEP upgrade.',
    phase: 'mechanicals',
    budget_cents: 292_000_000,
    progress: 45,
    start_offset_days: -96,
    end_offset_days: 118,
  },
  {
    id: 'prj_lakeside',
    code: 'LPS-071',
    name: 'Lakeside Parking Structure',
    description:
      'Precast concrete parking structure, 480 stalls over four levels. Closeout phase: punch, sealant, and striping warranty items.',
    phase: 'closeout',
    budget_cents: 610_000_000,
    progress: 94,
    start_offset_days: -420,
    end_offset_days: 21,
  },
]

const DAILY_LOGS: DailyLogFixture[] = [
  {
    id: 'log_hv_today',
    project: 'prj_harborview',
    day_offset: 0,
    weather: 'partly_cloudy',
    crew_count: 34,
    hours: 268,
    notes: 'Crane #2 annual inspection passed at 07:30. Deliveries staged on Level 1.',
    entries: [
      {
        area: 'Level 8 — Grid C4',
        work_performed:
          'Steel erection crew set four beams at Line C; bolt-up trailing one bay behind.',
      },
      {
        area: 'Level 7 — Grid A2',
        work_performed: 'Metal deck installation across bays A2–A5; 60% of level decked.',
      },
      {
        area: 'Site — east laydown',
        work_performed: 'Received 14 bundles of deck; staged for tomorrow morning hoisting.',
      },
    ],
  },
  {
    id: 'log_hv_yday',
    project: 'prj_harborview',
    day_offset: -1,
    weather: 'rain',
    crew_count: 21,
    hours: 154,
    notes: 'Rain stopped exterior hoisting after 13:00; interior work continued.',
    entries: [
      {
        area: 'Level 8 — Grid D1',
        work_performed: 'Morning-only steel setting; two beams placed before weather hold.',
      },
      {
        area: 'Level 2 — core',
        work_performed: 'Plumbing rough-in continued in the north core; risers through Level 4.',
      },
    ],
  },
  {
    id: 'log_hv_2ago',
    project: 'prj_harborview',
    day_offset: -2,
    weather: 'sunny',
    crew_count: 38,
    hours: 302,
    notes: 'Full production day. Third-party elevator inspector on site for pit review.',
    entries: [
      {
        area: 'Level 8 — Grid B7',
        work_performed: 'Steel erection continued; line B fully erected through Level 8.',
      },
      {
        area: 'Basement L2',
        work_performed: 'Fireproofing prep and mask-off around the parking ramp.',
      },
    ],
  },
  {
    id: 'log_eg_today',
    project: 'prj_eastgate',
    day_offset: 0,
    weather: 'partly_cloudy',
    crew_count: 17,
    hours: 129,
    notes: 'Health inspector walk-through scheduled for next week; deli prep area priority.',
    entries: [
      {
        area: 'Grocery — ceiling plenum',
        work_performed: 'Duct main installation over aisles 4–9; hangers and mains complete.',
      },
      {
        area: 'Bay 2 — back-of-house',
        work_performed: 'Electrical rough-in for the freezer room; panels landed and labeled.',
      },
    ],
  },
  {
    id: 'log_ls_1ago',
    project: 'prj_lakeside',
    day_offset: -1,
    weather: 'wind',
    crew_count: 6,
    hours: 42,
    notes: 'Winds limited boom-lift work to sheltered levels; striping crew idle after 11:00.',
    entries: [
      {
        area: 'Level 3 — ramp B',
        work_performed: 'Sealant touch-up along expansion joints at ramp B landing.',
      },
    ],
  },
]

const PUNCH_ITEMS: PunchItemFixture[] = [
  {
    id: 'pun_hv_01',
    project: 'prj_harborview',
    location: 'Level 7 — Grid C4',
    severity: 'high',
    description: 'Two bolted connections at Line C missing pretension; torque and re-inspect.',
    assignee: 'Keystone Steel Erectors',
    status: 'in_progress',
    created_at: '__T-4d',
  },
  {
    id: 'pun_hv_02',
    project: 'prj_harborview',
    location: 'Level 2 — north core',
    severity: 'medium',
    description: 'Plumbing sleeve offset 40mm from drawing; verify before L3 pour.',
    assignee: 'Delta Mechanical',
    status: 'open',
    created_at: '__T-2d',
  },
  {
    id: 'pun_hv_03',
    project: 'prj_harborview',
    location: 'Level 8 — Grid B2',
    severity: 'low',
    description: 'Deck pour left a 2m unfinished strip at the column line; schedule patch.',
    status: 'closed',
    photo_url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=640',
    created_at: '__T-9d',
    closed_at: '__T-3d',
  },
  {
    id: 'pun_hv_04',
    project: 'prj_harborview',
    location: 'Exterior — east elevation',
    severity: 'high',
    description: 'Temporary railing at the Level 7 slab edge is loose; re-secure immediately.',
    status: 'open',
    created_at: '__T-6h',
  },
  {
    id: 'pun_eg_01',
    project: 'prj_eastgate',
    location: 'Grocery — aisle 7',
    severity: 'medium',
    description: 'Duct strap spacing exceeds spec over the refrigerated cases; add hangers.',
    assignee: 'Northline Sheet Metal',
    status: 'in_progress',
    created_at: '__T-6d',
  },
  {
    id: 'pun_eg_02',
    project: 'prj_eastgate',
    location: 'Bay 2 — freezer room',
    severity: 'high',
    description: 'Vapor barrier penetration unsealed at the electrical sleeves.',
    assignee: 'Delta Mechanical',
    status: 'open',
    created_at: '__T-1d2h',
  },
  {
    id: 'pun_ls_01',
    project: 'prj_lakeside',
    location: 'Level 4 — Grid F2',
    severity: 'low',
    description: 'One precast panel joint sealant tooling below standard; refinish.',
    assignee: 'Shorecrete Sealants',
    status: 'closed',
    created_at: '__T-16d',
    closed_at: '__T-5d',
  },
  {
    id: 'pun_ls_02',
    project: 'prj_lakeside',
    location: 'Ground — striping',
    severity: 'low',
    description: 'Stall lines faded at the entry lane after rain; restripe under warranty.',
    assignee: 'LineMark Striping',
    status: 'open',
    created_at: '__T-8d',
  },
]

const RFIS: RfiFixture[] = [
  {
    id: 'rfi_hv_01',
    project: 'prj_harborview',
    title: 'Deck opening size at stair S-2',
    question:
      'Structural drawings show a 1400x2600 opening at stair S-2, but the architectural intent requires 1600 wide for the smoke barrier. Which dimension governs the deck opening, and is a trimmer channel required at the wide side?',
    originator: 'Keystone Steel Erectors',
    drawings_ref: 'S-302 / A-511',
    due_offset_days: 4,
    status: 'open',
    created_at: '__T-6d',
    responses: [],
  },
  {
    id: 'rfi_hv_02',
    project: 'prj_harborview',
    title: 'Firestop rating at plumbing risers',
    question:
      'Confirm the required firestop assembly for the 100mm plumbing risers penetrating the Level 6 floor at the north core. Spec section 078400 lists two systems; the riser cluster is tight to the beam face.',
    originator: 'Delta Mechanical',
    drawings_ref: 'P-201',
    due_offset_days: -2,
    status: 'answered',
    created_at: '__T-11d',
    responses: [
      {
        author: 'A-E reviewer',
        body: 'Use system W-L-1043 for the 100mm risers. Maintain 25mm minimum to the beam face; where the cluster is tighter, shift the bundle per the attached sketch.',
        is_final: true,
        at: '__T-7d',
      },
    ],
  },
  {
    id: 'rfi_eg_01',
    project: 'prj_eastgate',
    title: 'Freezer room vapor barrier tie-in',
    question:
      'The freezer room vapor barrier needs to tie into the slab vapor retarder, but the refrigeration supplier embedded their curb in the wrong location relative to the drawing. Do we field-relocate the curb or patch and seal around it?',
    originator: 'Delta Mechanical',
    drawings_ref: 'A-402 / R-101',
    due_offset_days: null,
    status: 'closed',
    created_at: '__T-18d',
    responses: [
      {
        author: 'A-E reviewer',
        body: 'Relocating the curb is not acceptable — it must sit on the thickened slab edge. See correction sketch R-101-R1.',
        at: '__T-15d',
      },
      {
        author: 'A-E reviewer',
        body: 'Final: relocate the curb 300mm north per sketch R-101-R1; refrigeration supplier to re-pour the housekeeping pad at their cost. Close this RFI and log the repair on the punch list.',
        is_final: true,
        at: '__T-12d',
      },
    ],
  },
  {
    id: 'rfi_ls_01',
    project: 'prj_lakeside',
    title: 'Sealant warranty extension for ramp joints',
    question:
      'The ramp expansion joints were re-sealed under the punch list. Does the sealant warranty restart from the re-seal date for the full term?',
    originator: 'Shorecrete Sealants',
    drawings_ref: 'S-501',
    due_offset_days: 9,
    status: 'open',
    created_at: '__T-1d',
    responses: [],
  },
]

const SUBCONTRACTORS: SubcontractorFixture[] = [
  {
    id: 'sub_hv_01',
    project: 'prj_harborview',
    trade: 'structural steel',
    company: 'Keystone Steel Erectors',
    contact: 'Dana Whitfield (555) 210-3344',
    contract_value_cents: 412_000_000,
    status: 'active',
  },
  {
    id: 'sub_hv_02',
    project: 'prj_harborview',
    trade: 'plumbing',
    company: 'Delta Mechanical',
    contact: 'Ike Potvin (555) 218-9021',
    contract_value_cents: 168_500_000,
    status: 'active',
  },
  {
    id: 'sub_hv_03',
    project: 'prj_harborview',
    trade: 'curtain wall',
    company: 'Clearspan Facades',
    contact: 'Marisol Vega (555) 226-7710',
    contract_value_cents: 296_000_000,
    status: 'invited',
  },
  {
    id: 'sub_hv_04',
    project: 'prj_harborview',
    trade: 'fireproofing',
    company: 'ThermaGuard Coatings',
    contact: 'Rolf Steiner (555) 233-1188',
    contract_value_cents: 34_200_000,
    status: 'terminated',
  },
  {
    id: 'sub_eg_01',
    project: 'prj_eastgate',
    trade: 'sheet metal',
    company: 'Northline Sheet Metal',
    contact: 'Pearl Okafor (555) 241-6650',
    contract_value_cents: 62_800_000,
    status: 'active',
  },
  {
    id: 'sub_eg_02',
    project: 'prj_eastgate',
    trade: 'electrical',
    company: 'Brightway Electric',
    contact: 'Chuck Nwosu (555) 248-2207',
    contract_value_cents: 71_300_000,
    status: 'active',
  },
  {
    id: 'sub_eg_03',
    project: 'prj_eastgate',
    trade: 'refrigeration',
    company: 'ColdChain Systems',
    contact: 'Sara Lindqvist (555) 255-8843',
    contract_value_cents: 88_900_000,
    status: 'active',
  },
  {
    id: 'sub_ls_01',
    project: 'prj_lakeside',
    trade: 'sealants',
    company: 'Shorecrete Sealants',
    contact: 'Ben Alvarez (555) 262-4471',
    contract_value_cents: 12_400_000,
    status: 'active',
  },
  {
    id: 'sub_ls_02',
    project: 'prj_lakeside',
    trade: 'striping',
    company: 'LineMark Striping',
    contact: 'Tomás Reyes (555) 269-3398',
    contract_value_cents: 6_900_000,
    status: 'active',
  },
]

/** Resolve `__T-3h12m`, `__T+4d` into ISO strings relative to now. */
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

/** Local YYYY-MM-DD for N days from seed time. */
function dayOffset(days: number, now: number): string {
  const d = new Date(now + days * 86_400_000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

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
    const existing = await count('projects', [{ field: 'owner_id', operator: '=', value: userId }])
    if (existing > 0) {
      seededUsers.add(userId)
      return
    }

    const now = Date.now()
    const projectMap = new Map<string, string>()
    const logMap = new Map<string, string>()
    const rfiMap = new Map<string, string>()
    // RFI numbers are sequential PER PROJECT.
    const rfiNumberByProject = new Map<string, number>()

    for (const p of PROJECTS) {
      const r = await create('projects', {
        owner_id: userId,
        code: p.code,
        name: p.name,
        description: p.description,
        phase: p.phase,
        budget_cents: p.budget_cents,
        progress: p.progress,
        start_date: dayOffset(p.start_offset_days, now),
        end_date: p.end_offset_days == null ? null : dayOffset(p.end_offset_days, now),
        created_at: tStamp(`__T${p.start_offset_days}d`, now),
        updated_at: new Date(now).toISOString(),
      })
      const dbId = (r.data as { id?: string } | null)?.id
      if (dbId) projectMap.set(p.id, dbId)
    }

    for (const l of DAILY_LOGS) {
      const projectDbId = projectMap.get(l.project)
      if (!projectDbId) continue
      const r = await create('daily_logs', {
        owner_id: userId,
        project_id: projectDbId,
        log_date: dayOffset(l.day_offset, now),
        weather: l.weather,
        crew_count: l.crew_count,
        hours: l.hours,
        notes: l.notes,
        created_at: tStamp(`__T${l.day_offset}d`, now),
        updated_at: tStamp(`__T${l.day_offset}d`, now),
      })
      const dbId = (r.data as { id?: string } | null)?.id
      if (!dbId) continue
      logMap.set(l.id, dbId)
      for (const e of l.entries) {
        await create('log_entries', {
          log_id: dbId,
          area: e.area,
          work_performed: e.work_performed,
          created_at: tStamp(`__T${l.day_offset}d`, now),
        })
      }
    }

    for (const p of PUNCH_ITEMS) {
      const projectDbId = projectMap.get(p.project)
      if (!projectDbId) continue
      await create('punch_items', {
        owner_id: userId,
        project_id: projectDbId,
        location: p.location,
        severity: p.severity,
        description: p.description,
        assignee: p.assignee ?? null,
        status: p.status,
        photo_url: p.photo_url ?? null,
        closed_at: p.closed_at ? tStamp(p.closed_at, now) : null,
        created_at: tStamp(p.created_at, now),
        updated_at: tStamp(p.closed_at ?? p.created_at, now),
      })
    }

    for (const rfi of RFIS) {
      const projectDbId = projectMap.get(rfi.project)
      if (!projectDbId) continue
      const nextNumber = (rfiNumberByProject.get(rfi.project) ?? 0) + 1
      rfiNumberByProject.set(rfi.project, nextNumber)
      const r = await create('rfis', {
        owner_id: userId,
        project_id: projectDbId,
        number: nextNumber,
        title: rfi.title,
        question: rfi.question,
        originator: rfi.originator,
        drawings_ref: rfi.drawings_ref,
        due_date: rfi.due_offset_days == null ? null : dayOffset(rfi.due_offset_days, now),
        status: rfi.status,
        created_at: tStamp(rfi.created_at, now),
        updated_at: tStamp(rfi.created_at, now),
      })
      const dbId = (r.data as { id?: string } | null)?.id
      if (!dbId) continue
      rfiMap.set(rfi.id, dbId)
      for (const resp of rfi.responses) {
        await create('rfi_responses', {
          rfi_id: dbId,
          author: resp.author,
          body: resp.body,
          is_final: Boolean(resp.is_final),
          created_at: tStamp(resp.at, now),
        })
      }
    }

    for (const s of SUBCONTRACTORS) {
      const projectDbId = projectMap.get(s.project)
      if (!projectDbId) continue
      await create('subcontractors', {
        owner_id: userId,
        project_id: projectDbId,
        trade: s.trade,
        company: s.company,
        contact: s.contact,
        contract_value_cents: s.contract_value_cents,
        status: s.status,
        created_at: tStamp('__T-60d', now),
        updated_at: tStamp('__T-60d', now),
      })
    }

    seededUsers.add(userId)
  })()

  seedingInFlight.set(userId, promise)
  try {
    await promise
  } catch (err) {
    logger.error('[construction-management/_seed] Failed to seed demo data:', err)
    throw err
  } finally {
    seedingInFlight.delete(userId)
  }
}
