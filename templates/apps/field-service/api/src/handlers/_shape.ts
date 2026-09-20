/**
 * field-service — DB-row → FE-shape transformers.
 *
 * The frontend pages render a fixture-shaped payload (see
 * api/fixtures/*.json). The Postgres schema stores normalized rows with
 * child tables (quote_items, job_checklist, job_notes, invoice_items),
 * so these helpers fold a parent row plus its children and joined
 * lookups (customer name, technician name) back into the flat shape the
 * pages expect.
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

const bool = (v: unknown, fallback = false): boolean =>
  typeof v === 'boolean' ? v : v == null ? fallback : Boolean(v)

export interface ShapedCustomer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string
  notes: string
  created_at: string
}

export function shapeCustomer(c: Row): ShapedCustomer {
  return {
    id: str(c.id),
    name: str(c.name),
    email: c.email ? str(c.email) : null,
    phone: c.phone ? str(c.phone) : null,
    address: str(c.address),
    notes: str(c.notes),
    created_at: iso(c.created_at),
  }
}

export interface ShapedTechnician {
  id: string
  name: string
  trade: string
  phone: string | null
  email: string | null
  skills: string[]
  active: boolean
  /** Count of open (non-completed/cancelled) jobs assigned — supplied by the caller. */
  active_jobs: number
  created_at: string
}

export function shapeTechnician(
  t: Row,
  activeJobCountById: Map<string, number> = new Map(),
): ShapedTechnician {
  const rawSkills = t.skills
  const skills = Array.isArray(rawSkills) ? rawSkills.map((s) => str(s)) : []
  return {
    id: str(t.id),
    name: str(t.name),
    trade: str(t.trade, 'general'),
    phone: t.phone ? str(t.phone) : null,
    email: t.email ? str(t.email) : null,
    skills,
    active: bool(t.active, true),
    active_jobs: activeJobCountById.get(str(t.id)) ?? 0,
    created_at: iso(t.created_at),
  }
}

export interface ShapedLineItem {
  id: string
  description: string
  qty: number
  unit: string
  rate_cents: number
}

const shapeItems = (rows: readonly Row[]): ShapedLineItem[] =>
  rows.map((r) => ({
    id: str(r.id),
    description: str(r.description),
    qty: num(r.qty, 1),
    unit: str(r.unit, 'each'),
    rate_cents: num(r.rate_cents),
  }))

export interface ShapedQuote {
  id: string
  customer_id: string
  customer: string
  title: string
  status: 'draft' | 'sent' | 'accepted' | 'declined'
  valid_until: string
  total_cents: number
  notes: string
  items: ShapedLineItem[]
  job_id: string | null
  sent_at: string | null
  accepted_at: string | null
  declined_at: string | null
  created_at: string
}

export function shapeQuote(
  q: Row,
  customerById: Map<string, Row> = new Map(),
  items: readonly Row[] = [],
  jobIdByQuoteId: Map<string, string> = new Map(),
): ShapedQuote {
  const customerId = str(q.customer_id)
  const customerRow = customerById.get(customerId)
  return {
    id: str(q.id),
    customer_id: customerId,
    customer: customerRow ? str(customerRow.name) : '',
    title: str(q.title),
    status: str(q.status, 'draft') as ShapedQuote['status'],
    valid_until: iso(q.valid_until),
    total_cents: num(q.total_cents),
    notes: str(q.notes),
    items: shapeItems(items),
    job_id: jobIdByQuoteId.get(str(q.id)) ?? null,
    sent_at: q.sent_at ? iso(q.sent_at) : null,
    accepted_at: q.accepted_at ? iso(q.accepted_at) : null,
    declined_at: q.declined_at ? iso(q.declined_at) : null,
    created_at: iso(q.created_at),
  }
}

export interface ShapedChecklistItem {
  id: string
  label: string
  done: boolean
  done_at: string | null
}

export interface ShapedJobNote {
  id: string
  author: string
  body: string
  created_at: string
}

export interface ShapedJob {
  id: string
  customer_id: string
  customer: string
  quote_id: string | null
  title: string
  description: string
  address: string
  scheduled_start: string | null
  scheduled_end: string | null
  status: 'scheduled' | 'en_route' | 'in_progress' | 'completed' | 'cancelled'
  technician_id: string | null
  technician: string | null
  checklist: ShapedChecklistItem[]
  notes: ShapedJobNote[]
  completed_at: string | null
  created_at: string
}

export function shapeJob(
  j: Row,
  customerById: Map<string, Row> = new Map(),
  technicianById: Map<string, Row> = new Map(),
  checklist: readonly Row[] = [],
  notes: readonly Row[] = [],
): ShapedJob {
  const customerId = str(j.customer_id)
  const customerRow = customerById.get(customerId)
  const technicianId = str(j.technician_id, '') || null
  const technicianRow = technicianId ? technicianById.get(technicianId) : undefined
  return {
    id: str(j.id),
    customer_id: customerId,
    customer: customerRow ? str(customerRow.name) : '',
    quote_id: j.quote_id ? str(j.quote_id) : null,
    title: str(j.title),
    description: str(j.description),
    address: str(j.address),
    scheduled_start: j.scheduled_start ? iso(j.scheduled_start) : null,
    scheduled_end: j.scheduled_end ? iso(j.scheduled_end) : null,
    status: str(j.status, 'scheduled') as ShapedJob['status'],
    technician_id: technicianId,
    technician: technicianRow ? str(technicianRow.name) : null,
    checklist: checklist.map((c) => ({
      id: str(c.id),
      label: str(c.label),
      done: bool(c.done),
      done_at: c.done_at ? iso(c.done_at) : null,
    })),
    notes: notes.map((n) => ({
      id: str(n.id),
      author: str(n.author),
      body: str(n.body),
      created_at: iso(n.created_at),
    })),
    completed_at: j.completed_at ? iso(j.completed_at) : null,
    created_at: iso(j.created_at),
  }
}

export interface ShapedInvoice {
  id: string
  job_id: string | null
  job_title: string | null
  customer_id: string
  customer: string
  number: string
  status: 'draft' | 'sent' | 'paid'
  total_cents: number
  items: ShapedLineItem[]
  issued_at: string | null
  sent_at: string | null
  paid_at: string | null
  created_at: string
}

export function shapeInvoice(
  i: Row,
  customerById: Map<string, Row> = new Map(),
  items: readonly Row[] = [],
  jobTitleById: Map<string, string> = new Map(),
): ShapedInvoice {
  const customerId = str(i.customer_id)
  const customerRow = customerById.get(customerId)
  const jobId = i.job_id ? str(i.job_id) : null
  return {
    id: str(i.id),
    job_id: jobId,
    job_title: jobId ? (jobTitleById.get(jobId) ?? null) : null,
    customer_id: customerId,
    customer: customerRow ? str(customerRow.name) : '',
    number: str(i.number),
    status: str(i.status, 'draft') as ShapedInvoice['status'],
    total_cents: num(i.total_cents),
    items: shapeItems(items),
    issued_at: i.issued_at ? iso(i.issued_at) : null,
    sent_at: i.sent_at ? iso(i.sent_at) : null,
    paid_at: i.paid_at ? iso(i.paid_at) : null,
    created_at: iso(i.created_at),
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
