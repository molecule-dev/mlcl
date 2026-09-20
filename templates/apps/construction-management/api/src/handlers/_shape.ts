/**
 * construction-management — DB-row → FE-shape transformers.
 *
 * The frontend pages render a fixture-shaped payload (see
 * api/fixtures/*.json). The Postgres schema stores normalized rows with
 * child tables (log_entries, rfi_responses), so these helpers fold a
 * parent row plus its children and joined lookups (project name) back
 * into the flat shape the pages expect.
 *
 * Pure functions; no I/O. Joining is handled by the caller fetching the
 * related rows once and passing them in as lookup maps.
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

const iso = (v: unknown, fallback = ''): string => {
  if (v == null) return fallback
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'string') {
    const t = Date.parse(v)
    if (!Number.isNaN(t)) return new Date(t).toISOString()
    return v
  }
  return fallback
}

const nullableStr = (v: unknown): string | null => (v == null ? null : str(v))

const nullableIso = (v: unknown): string | null => (v == null ? null : iso(v))

/** `2026-09-19` (date columns pass through as plain day strings). */
const day = (v: unknown): string => (typeof v === 'string' ? v : str(v))

export interface ShapedProject {
  id: string
  code: string
  name: string
  description: string
  phase: string
  budget_cents: number
  progress: number
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export function shapeProject(p: Row): ShapedProject {
  return {
    id: str(p.id),
    code: str(p.code),
    name: str(p.name),
    description: str(p.description),
    phase: str(p.phase, 'preconstruction'),
    budget_cents: num(p.budget_cents),
    progress: num(p.progress),
    start_date: nullableStr(p.start_date),
    end_date: nullableStr(p.end_date),
    created_at: iso(p.created_at),
    updated_at: iso(p.updated_at),
  }
}

export interface ShapedLogEntry {
  id: string
  area: string
  work_performed: string
  created_at: string
}

const shapeEntries = (rows: readonly Row[]): ShapedLogEntry[] =>
  rows.map((r) => ({
    id: str(r.id),
    area: str(r.area),
    work_performed: str(r.work_performed),
    created_at: iso(r.created_at),
  }))

export interface ShapedDailyLog {
  id: string
  project_id: string
  project: string
  log_date: string
  weather: string
  crew_count: number
  hours: number
  notes: string
  entries: ShapedLogEntry[]
  created_at: string
}

export function shapeDailyLog(
  l: Row,
  projectById: Map<string, Row> = new Map(),
  entries: readonly Row[] = [],
): ShapedDailyLog {
  const projectId = str(l.project_id)
  const projectRow = projectById.get(projectId)
  return {
    id: str(l.id),
    project_id: projectId,
    project: projectRow ? str(projectRow.name) : '',
    log_date: day(l.log_date),
    weather: str(l.weather),
    crew_count: num(l.crew_count),
    hours: num(l.hours),
    notes: str(l.notes),
    entries: shapeEntries(entries),
    created_at: iso(l.created_at),
  }
}

export interface ShapedPunchItem {
  id: string
  project_id: string
  project: string
  location: string
  severity: string
  description: string
  assignee: string | null
  status: string
  photo_url: string | null
  closed_at: string | null
  created_at: string
}

export function shapePunchItem(p: Row, projectById: Map<string, Row> = new Map()): ShapedPunchItem {
  const projectId = str(p.project_id)
  const projectRow = projectById.get(projectId)
  return {
    id: str(p.id),
    project_id: projectId,
    project: projectRow ? str(projectRow.name) : '',
    location: str(p.location),
    severity: str(p.severity, 'medium'),
    description: str(p.description),
    assignee: nullableStr(p.assignee),
    status: str(p.status, 'open'),
    photo_url: nullableStr(p.photo_url),
    closed_at: nullableIso(p.closed_at),
    created_at: iso(p.created_at),
  }
}

export interface ShapedRfiResponse {
  id: string
  author: string
  body: string
  is_final: boolean
  created_at: string
}

const shapeResponses = (rows: readonly Row[]): ShapedRfiResponse[] =>
  rows.map((r) => ({
    id: str(r.id),
    author: str(r.author),
    body: str(r.body),
    is_final: Boolean(r.is_final),
    created_at: iso(r.created_at),
  }))

export interface ShapedRfi {
  id: string
  project_id: string
  project: string
  number: number
  title: string
  question: string
  originator: string
  drawings_ref: string
  due_date: string | null
  status: string
  responses: ShapedRfiResponse[]
  created_at: string
}

export function shapeRfi(
  r: Row,
  projectById: Map<string, Row> = new Map(),
  responses: readonly Row[] = [],
): ShapedRfi {
  const projectId = str(r.project_id)
  const projectRow = projectById.get(projectId)
  return {
    id: str(r.id),
    project_id: projectId,
    project: projectRow ? str(projectRow.name) : '',
    number: num(r.number, 1),
    title: str(r.title),
    question: str(r.question),
    originator: str(r.originator),
    drawings_ref: str(r.drawings_ref),
    due_date: nullableStr(r.due_date),
    status: str(r.status, 'open'),
    responses: shapeResponses(responses),
    created_at: iso(r.created_at),
  }
}

export interface ShapedSubcontractor {
  id: string
  project_id: string
  project: string
  trade: string
  company: string
  contact: string
  contract_value_cents: number
  status: string
  created_at: string
}

export function shapeSubcontractor(
  s: Row,
  projectById: Map<string, Row> = new Map(),
): ShapedSubcontractor {
  const projectId = str(s.project_id)
  const projectRow = projectById.get(projectId)
  return {
    id: str(s.id),
    project_id: projectId,
    project: projectRow ? str(projectRow.name) : '',
    trade: str(s.trade),
    company: str(s.company),
    contact: str(s.contact),
    contract_value_cents: num(s.contract_value_cents),
    status: str(s.status, 'invited'),
    created_at: iso(s.created_at),
  }
}
