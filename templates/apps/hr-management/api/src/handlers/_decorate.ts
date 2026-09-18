/**
 * Backend decoration helpers.
 *
 * The HR-management UI was designed against view-ready shapes (e.g.
 * `name`, `avatar_initial`, `tenure_years`, `employee_name`, `type_label`)
 * rather than the raw column shapes returned by `findMany`. The frontend
 * stays simple and presentational; the backend decorates every list/
 * detail response with the derived fields the UI expects.
 *
 * @module
 */

import { findMany } from '@molecule/api-database'

export interface RawEmployee {
  id: string
  user_id: string
  first_name: string
  last_name: string
  work_email: string
  personal_email: string | null
  phone: string | null
  title: string | null
  department_id: string | null
  manager_id: string | null
  start_date: string | null
  hire_date: string | null
  end_date: string | null
  employment_type: string | null
  office_location: string | null
  status: string
  pronouns: string | null
  timezone: string | null
  bio: string | null
  employee_number: string | null
  salary_cents: number | null
  photo_s3_key: string | null
  created_at: string
  updated_at: string
}

export interface DecoratedEmployee {
  id: string
  employee_id: string
  name: string
  first_name: string
  last_name: string
  avatar_initial: string
  email: string
  personal_email: string
  phone: string
  title: string
  department: string
  department_id: string | null
  manager_name: string
  manager_id: string | null
  office: string
  status: string
  hire_date: string
  start_date: string
  tenure_years: number
  employment_type: string
  pronouns: string
  birthday: string
  salary_cents: number | null
}

export function decorateEmployee(
  emp: RawEmployee,
  ctx: {
    departmentName: (id: string | null) => string
    managerName: (id: string | null) => string
  },
): DecoratedEmployee {
  const name = `${emp.first_name} ${emp.last_name}`.trim()
  const initial = (emp.first_name?.[0] ?? '?').toUpperCase()
  const hire = emp.hire_date ?? emp.start_date ?? null
  const tenure = hire ? tenureYears(hire) : 0
  return {
    id: emp.id,
    employee_id: emp.employee_number ?? '—',
    name,
    first_name: emp.first_name,
    last_name: emp.last_name,
    avatar_initial: initial,
    email: emp.work_email,
    personal_email: emp.personal_email ?? '',
    phone: emp.phone ?? '',
    title: emp.title ?? '',
    department: ctx.departmentName(emp.department_id),
    department_id: emp.department_id,
    manager_name: ctx.managerName(emp.manager_id),
    manager_id: emp.manager_id,
    office: emp.office_location ?? '',
    status: canonicalEmployeeStatus(emp.status),
    hire_date: hire ?? '',
    start_date: emp.start_date ?? '',
    tenure_years: tenure,
    employment_type: emp.employment_type ?? 'full-time',
    pronouns: emp.pronouns ?? '',
    birthday: '',
    salary_cents: emp.salary_cents,
  }
}

/**
 * Normalize an employee status to the hyphenated form the frontend
 * filter UI uses ('active' | 'on-leave' | 'probation' | 'terminated').
 *
 * The DB stores `on_leave` (snake_case) but the React app's filter chips,
 * status pill colours, and i18n keys all use `on-leave`. Accept both at
 * the boundary so legacy rows and incoming form payloads keep working,
 * and emit the canonical form on every read.
 */
export function canonicalEmployeeStatus(status: string | null | undefined): string {
  if (!status) return 'active'
  const lower = String(status).toLowerCase().trim()
  if (lower === 'on_leave' || lower === 'on-leave' || lower === 'onleave') return 'on-leave'
  if (lower === 'inactive') return 'terminated'
  return lower
}

/**
 * Every stored spelling of the on-leave status. The app write-path stores `on-leave` (hyphen) while
 * the seed stores `on_leave` (underscore), so headcount analytics that filter in SQL must match both
 * — canonicalEmployeeStatus can't run inside a DB `count`.
 */
export const ON_LEAVE_STATUSES = ['on_leave', 'on-leave'] as const

export function tenureYears(hireDate: string): number {
  const hire = new Date(hireDate)
  if (Number.isNaN(hire.getTime())) return 0
  const ms = Date.now() - hire.getTime()
  return Math.max(0, Math.round((ms / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10)
}

const PTO_TYPE_LABEL: Record<string, string> = {
  vacation: 'Vacation',
  sick: 'Sick',
  personal: 'Personal',
  bereavement: 'Bereavement',
  holiday: 'Holiday',
  parental: 'Parental',
}

export interface RawPto {
  id: string
  user_id: string
  employee_id: string | null
  kind: string
  start_date: string
  end_date: string
  hours: number | null
  reason: string | null
  status: string
  reviewer_id: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  updated_at: string
}

export interface DecoratedPto {
  id: string
  employee_id: string | null
  employee_name: string
  employee_initial: string
  type: string
  type_label: string
  start_date: string
  end_date: string
  days: number
  hours: number
  reason: string
  status: string
  manager_name: string
  reviewer_id: string | null
  reviewed_at: string | null
  submitted_at: string
}

export function decoratePto(
  pto: RawPto,
  ctx: { employee: (id: string | null) => DecoratedEmployee | null },
): DecoratedPto {
  const emp = ctx.employee(pto.employee_id)
  const empName = emp?.name ?? 'Unknown employee'
  const initial = emp?.avatar_initial ?? '?'
  const days = ptoDays(pto.start_date, pto.end_date, Number(pto.hours ?? 0))
  return {
    id: pto.id,
    employee_id: pto.employee_id,
    employee_name: empName,
    employee_initial: initial,
    type: pto.kind,
    type_label: PTO_TYPE_LABEL[pto.kind] ?? pto.kind,
    start_date: dateOnly(pto.start_date),
    end_date: dateOnly(pto.end_date),
    days,
    hours: Number(pto.hours ?? 0),
    reason: pto.reason ?? '',
    status: pto.status,
    manager_name: emp?.manager_name ?? '',
    reviewer_id: pto.reviewer_id,
    reviewed_at: pto.reviewed_at,
    submitted_at: pto.created_at,
  }
}

function ptoDays(start: string, end: string, hours: number): number {
  if (hours > 0) return Math.round((hours / 8) * 10) / 10
  const s = new Date(start)
  const e = new Date(end)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)) + 1)
}

function dateOnly(value: string | Date | null | undefined): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10)
  return d.toISOString().slice(0, 10)
}

export interface RawDocument {
  id: string
  user_id: string
  employee_id: string | null
  kind: string
  title: string
  category: string | null
  s3_key: string | null
  file_url: string | null
  content_type: string | null
  file_size: number | null
  size_label: string | null
  shared_with: string | null
  uploaded_by: string | null
  uploaded_at: string
  created_at: string
  updated_at: string
}

export interface DecoratedDocument {
  id: string
  name: string
  type: 'pdf' | 'doc' | 'xls' | 'img'
  size_label: string
  category: string
  uploader_name: string
  uploader_initial: string
  uploaded_at: string
  url: string
  shared_with: string
  employee_id: string | null
}

export function decorateDocument(
  doc: RawDocument,
  ctx: { employee: (id: string | null) => DecoratedEmployee | null },
): DecoratedDocument {
  const uploader = ctx.employee(doc.uploaded_by)
  const type = (
    ['pdf', 'doc', 'xls', 'img'].includes(doc.kind)
      ? doc.kind
      : guessTypeFromContent(doc.content_type, doc.title)
  ) as DecoratedDocument['type']
  return {
    id: doc.id,
    name: doc.title,
    type,
    size_label: doc.size_label ?? humanSize(doc.file_size),
    category: doc.category ?? 'Other',
    uploader_name: uploader?.name ?? 'You',
    uploader_initial: uploader?.avatar_initial ?? 'U',
    uploaded_at:
      typeof doc.uploaded_at === 'string'
        ? doc.uploaded_at
        : new Date(doc.uploaded_at).toISOString(),
    url: doc.file_url ?? '',
    shared_with: doc.shared_with ?? 'Shared workspace',
    employee_id: doc.employee_id,
  }
}

function guessTypeFromContent(ct: string | null, title: string): 'pdf' | 'doc' | 'xls' | 'img' {
  const lower = (ct ?? '').toLowerCase()
  if (lower.includes('pdf')) return 'pdf'
  if (lower.includes('sheet') || lower.includes('excel')) return 'xls'
  if (lower.includes('word')) return 'doc'
  if (lower.startsWith('image/')) return 'img'
  const ext = title.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'pdf'
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'xls'
  if (ext === 'docx' || ext === 'doc') return 'doc'
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'img'
  return 'doc'
}

function humanSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export interface RawNotification {
  id: string
  user_id: string
  kind: string
  title: string | null
  body: string | null
  payload: { link?: string; actor_name?: string; actor_initial?: string; icon?: string } | null
  read_at: string | null
  created_at: string
}

export interface DecoratedNotification {
  id: string
  kind: string
  icon: string
  actor_name: string
  actor_initial: string
  title: string
  body: string
  occurred_at: string
  link: string
  unread: boolean
}

export function decorateNotification(n: RawNotification): DecoratedNotification {
  const p = n.payload ?? {}
  return {
    id: n.id,
    kind: n.kind,
    icon: p.icon ?? notificationIconFor(n.kind),
    actor_name: p.actor_name ?? 'System',
    actor_initial: p.actor_initial ?? (p.actor_name?.[0] ?? 'S').toUpperCase(),
    title: n.title ?? '',
    body: n.body ?? '',
    occurred_at:
      typeof n.created_at === 'string' ? n.created_at : new Date(n.created_at).toISOString(),
    link: p.link ?? '/',
    unread: n.read_at == null,
  }
}

function notificationIconFor(kind: string): string {
  switch (kind) {
    case 'pto':
      return 'event_available'
    case 'document':
      return 'description'
    case 'review':
      return 'star'
    case 'anniversary':
      return 'celebration'
    case 'mention':
      return 'alternate_email'
    default:
      return 'notifications'
  }
}

export interface RawReview {
  id: string
  user_id: string
  employee_id: string
  reviewer_id: string | null
  cycle_id: string | null
  rating: number | string | null
  summary: string | null
  status: string
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export interface DecoratedReview {
  id: string
  employee_name: string
  employee_initial: string
  role: string
  manager_name: string
  cycle: string
  status: 'not_started' | 'in_progress' | 'complete'
  self_review_done: boolean
  manager_review_done: boolean
  rating: 'exceeds' | 'meets' | 'below' | null
  due_date: string
  goals_total: number
  goals_done: number
}

export function decorateReview(
  r: RawReview,
  ctx: {
    employee: (id: string | null) => DecoratedEmployee | null
    cycleName: (id: string | null) => string
  },
): DecoratedReview {
  const emp = ctx.employee(r.employee_id)
  const ratingNum = r.rating == null ? null : Number(r.rating)
  let rating: DecoratedReview['rating'] = null
  if (ratingNum != null && !Number.isNaN(ratingNum)) {
    if (ratingNum >= 4.25) rating = 'exceeds'
    else if (ratingNum >= 3.0) rating = 'meets'
    else rating = 'below'
  }
  const status: DecoratedReview['status'] =
    r.status === 'completed'
      ? 'complete'
      : r.status === 'in_progress'
        ? 'in_progress'
        : 'not_started'
  const totalGoals = 5
  const doneGoals = status === 'complete' ? 5 : status === 'in_progress' ? 3 : 0
  return {
    id: r.id,
    employee_name: emp?.name ?? 'Unknown',
    employee_initial: emp?.avatar_initial ?? '?',
    role: emp?.title ?? '',
    manager_name: emp?.manager_name ?? '',
    cycle: ctx.cycleName(r.cycle_id),
    status,
    self_review_done: status === 'complete' || status === 'in_progress',
    manager_review_done: status === 'complete',
    rating,
    due_date: '2026-05-15',
    goals_total: totalGoals,
    goals_done: doneGoals,
  }
}

/**
 * Loads departments, employees, and review cycles for a user once per
 * request and returns lookup helpers used by the decorate fns. Avoids
 * N+1 lookups when decorating large lists.
 */
export async function buildLookups(userId: string): Promise<{
  departmentName: (id: string | null) => string
  cycleName: (id: string | null) => string
  decoratedEmployees: DecoratedEmployee[]
  employeeById: (id: string | null) => DecoratedEmployee | null
}> {
  const departments = await findMany<{ id: string; name: string }>('departments', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
  })
  const cycles = await findMany<{ id: string; name: string }>('review_cycles', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
  })
  const employees = await findMany<RawEmployee>('employees', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'last_name', direction: 'asc' }],
  })

  const deptByIdMap = new Map(departments.map((d) => [String(d.id), d.name]))
  const cycleByIdMap = new Map(cycles.map((c) => [String(c.id), c.name]))
  const empMap = new Map<string, RawEmployee>(employees.map((e) => [String(e.id), e]))

  const departmentName = (id: string | null): string =>
    id ? (deptByIdMap.get(String(id)) ?? 'Unassigned') : 'Unassigned'
  const cycleName = (id: string | null): string => (id ? (cycleByIdMap.get(String(id)) ?? '') : '')

  // First pass — base decoration without manager_name resolution
  const decoratedFirst = employees.map((e) =>
    decorateEmployee(e, {
      departmentName,
      managerName: () => '',
    }),
  )
  const decoratedById = new Map(decoratedFirst.map((d) => [String(d.id), d]))
  // Second pass — fill manager_name now that all decorations exist
  const decoratedEmployees = employees.map((e) =>
    decorateEmployee(e, {
      departmentName,
      managerName: (mid) => (mid ? (decoratedById.get(String(mid))?.name ?? '') : ''),
    }),
  )
  const decByIdFinal = new Map(decoratedEmployees.map((d) => [String(d.id), d]))
  const employeeById = (id: string | null): DecoratedEmployee | null =>
    id ? (decByIdFinal.get(String(id)) ?? null) : null

  // (rawEmployeeById no longer needed externally — caller works off decoratedEmployees)
  void empMap

  return {
    departmentName,
    cycleName,
    decoratedEmployees,
    employeeById,
  }
}
