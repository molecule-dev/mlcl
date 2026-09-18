/**
 * Response shaping helpers for accounting-invoicing.
 *
 * The Postgres driver returns `bigint` and `numeric` columns as JS strings to
 * avoid lossy `Number` conversion. Our pages assume numbers (they call
 * `(cents/100).toLocaleString()`, `rate.toFixed(2)`, sum reductions, etc.),
 * so the API layer is the only place to normalize.
 *
 * Pages were also designed against the fixture-style schema (`number`,
 * `issued_at`, `customer_address`, `unit_price_cents` / `total_cents` per
 * line item) while the live DB uses `invoice_number`, `issue_date`, and
 * dollar-based `unit_price` / `amount` line items. We adapt at the edge so
 * the front-end keeps its design-baseline types and a fixture-driven mock
 * server stays drop-in compatible with the real backend.
 *
 * @module
 */

export type DbValue = unknown

/** Coerce a Postgres numeric/bigint column (returned as string) to a JS number. */
export function toNum(value: DbValue): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (typeof value === 'bigint') return Number(value)
  return 0
}

/** Coerce to ISO string if it's a Date or already a string. */
function toIso(value: DbValue): string | null {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  return null
}

interface RawInvoice {
  id: string
  user_id: string
  invoice_number: string | null
  customer_id: string | null
  customer_name: string | null
  status: string
  issue_date: string | Date | null
  due_date: string | Date | null
  paid_at: string | Date | null
  sent_at: string | Date | null
  line_items: unknown
  subtotal_cents: number | string
  tax_rate_pct: number | string
  tax_cents: number | string
  tax_jurisdiction: string | null
  total_cents: number | string
  amount_cents: number | string
  currency: string
  notes: string | null
  created_at: string | Date
  updated_at: string | Date
}

interface RawLineItem {
  description?: string | null
  quantity?: number | string | null
  // Stored shape (dollars):
  unit_price?: number | string | null
  amount?: number | string | null
  // Already-cents shape (when client sent fixture-style payload):
  unit_price_cents?: number | string | null
  total_cents?: number | string | null
}

interface SerializedLineItem {
  description: string
  quantity: number
  unit_price_cents: number
  total_cents: number
}

interface RawCustomer {
  id: string
  user_id: string
  company: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  address: unknown
  payment_terms: string | null
  tags: string[] | null
  ytd_billed_cents: number | string
  total_billed_cents: number | string
  outstanding_cents: number | string
  avg_days_to_pay: number | string | null
  last_invoice_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}

interface SerializedCustomer {
  id: string
  user_id: string
  company: string
  contact_name: string
  contact_email: string
  contact_phone: string | null
  address: string[]
  payment_terms: string
  tags: string[]
  ytd_billed_cents: number
  total_billed_cents: number
  outstanding_cents: number
  avg_days_to_pay: number
  last_invoice_at: string | null
  created_at: string | null
  updated_at: string | null
}

/**
 * Address is stored as a jsonb column. Accept either an array of strings
 * (fixture style), a single string, an object with structured fields, or
 * a stringified JSON value. Always return `string[]` so the UI can render
 * one address line per element without further branching.
 */
function normalizeAddress(value: unknown): string[] {
  if (value == null) return []
  if (Array.isArray(value)) {
    return value.filter((line): line is string => typeof line === 'string' && line.length > 0)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        return normalizeAddress(JSON.parse(trimmed))
      } catch (_error) {
        // JSON.parse failed — treat raw string as single address line
        return [trimmed]
      }
    }
    return [trimmed]
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const out: string[] = []
    for (const key of ['line1', 'line2', 'city', 'region', 'postal_code', 'country']) {
      const v = obj[key]
      if (typeof v === 'string' && v.trim()) out.push(v.trim())
    }
    return out
  }
  return []
}

function serializeLineItem(raw: unknown): SerializedLineItem {
  const item = (raw ?? {}) as RawLineItem
  const description = typeof item.description === 'string' ? item.description : ''
  const quantity = toNum(item.quantity)
  // If the stored payload already used `_cents` fields (fixture shape or a
  // payload sent that way), prefer them directly so we don't round-trip
  // through dollars and accumulate floating-point loss.
  if (item.unit_price_cents != null || item.total_cents != null) {
    const unit_price_cents = toNum(item.unit_price_cents)
    const total_cents = toNum(item.total_cents) || Math.round(unit_price_cents * quantity)
    return { description, quantity, unit_price_cents, total_cents }
  }
  // Otherwise dollar-based shape — multiply by 100 to land in cents.
  const unit_price_dollars = toNum(item.unit_price)
  const amount_dollars = toNum(item.amount)
  const unit_price_cents = Math.round(unit_price_dollars * 100)
  const total_cents = amount_dollars
    ? Math.round(amount_dollars * 100)
    : Math.round(unit_price_dollars * quantity * 100)
  return { description, quantity, unit_price_cents, total_cents }
}

export interface SerializedInvoice {
  id: string
  user_id: string
  number: string
  invoice_number: string
  customer_id: string | null
  customer_name: string
  customer_email: string
  customer_address: string[]
  status: string
  issue_date: string | null
  issued_at: string | null
  due_date: string | null
  paid_at: string | null
  sent_at: string | null
  line_items: SerializedLineItem[]
  subtotal_cents: number
  tax_rate_pct: number
  tax_cents: number
  tax_jurisdiction: string | null
  total_cents: number
  amount_cents: number
  currency: string
  notes: string
  created_at: string | null
  updated_at: string | null
}

export interface InvoiceCustomerLookup {
  contact_email?: string | null
  address?: string[]
}

/**
 * Whether an invoice is overdue *right now*, derived from its `due_date`. Nothing ever writes
 * `status = 'overdue'` (the app has no scheduler), so overdue must be derived at read time: a sent,
 * unpaid invoice whose `due_date` has passed is overdue. Without this, the dashboard's overdue KPI
 * and the invoice-status badge ignored `due_date` entirely and overdue was always zero/never shown.
 */
export function isInvoiceOverdue(
  invoice: {
    status?: string | null
    due_date?: string | Date | null
    paid_at?: string | Date | null
  },
  now: Date = new Date(),
): boolean {
  if (invoice.paid_at) return false
  const status = invoice.status ?? 'draft'
  if (status !== 'sent' && status !== 'overdue') return false
  if (!invoice.due_date) return false
  return new Date(invoice.due_date).getTime() < now.getTime()
}

/**
 * Map a raw `invoices` row plus an optional joined customer row into the
 * shape every page in `app/src/pages/Invoices*.tsx` and
 * `components/RecentInvoicesCard.tsx` expects.
 */
export function serializeInvoice(
  raw: RawInvoice,
  customer?: InvoiceCustomerLookup | null,
): SerializedInvoice {
  const number = raw.invoice_number ?? ''
  const issuedIso = toIso(raw.issue_date)
  const dueIso = toIso(raw.due_date)
  const paidIso = toIso(raw.paid_at)
  const sentIso = toIso(raw.sent_at)
  const lineItemsRaw = Array.isArray(raw.line_items)
    ? raw.line_items
    : typeof raw.line_items === 'string' && raw.line_items.length > 0
      ? (() => {
          try {
            const parsed = JSON.parse(raw.line_items)
            return Array.isArray(parsed) ? parsed : []
          } catch (_error) {
            // JSON.parse failed — default to empty line items
            return []
          }
        })()
      : []
  const line_items = lineItemsRaw.map(serializeLineItem)
  const subtotal_cents =
    toNum(raw.subtotal_cents) || line_items.reduce((acc, l) => acc + l.total_cents, 0)
  const tax_cents = toNum(raw.tax_cents)
  const total_cents = toNum(raw.total_cents) || subtotal_cents + tax_cents
  return {
    id: raw.id,
    user_id: raw.user_id,
    number,
    invoice_number: number,
    customer_id: raw.customer_id ?? null,
    customer_name: raw.customer_name ?? '',
    customer_email: customer?.contact_email ?? '',
    customer_address: customer?.address ?? [],
    // Derive overdue from due_date at read time (nothing writes status='overdue').
    status: isInvoiceOverdue(raw) ? 'overdue' : (raw.status ?? 'draft'),
    issue_date: issuedIso,
    issued_at: issuedIso,
    due_date: dueIso,
    paid_at: paidIso,
    sent_at: sentIso,
    line_items,
    subtotal_cents,
    tax_rate_pct: toNum(raw.tax_rate_pct),
    tax_cents,
    tax_jurisdiction: raw.tax_jurisdiction ?? null,
    total_cents,
    amount_cents: toNum(raw.amount_cents) || total_cents,
    currency: raw.currency ?? 'USD',
    notes: raw.notes ?? '',
    created_at: toIso(raw.created_at),
    updated_at: toIso(raw.updated_at),
  }
}

export function serializeCustomer(raw: RawCustomer): SerializedCustomer {
  return {
    id: raw.id,
    user_id: raw.user_id,
    company: raw.company ?? '',
    contact_name: raw.contact_name ?? '',
    contact_email: raw.contact_email ?? '',
    contact_phone: raw.contact_phone ?? null,
    address: normalizeAddress(raw.address),
    payment_terms: raw.payment_terms ?? '',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    ytd_billed_cents: toNum(raw.ytd_billed_cents),
    total_billed_cents: toNum(raw.total_billed_cents),
    outstanding_cents: toNum(raw.outstanding_cents),
    avg_days_to_pay: toNum(raw.avg_days_to_pay),
    last_invoice_at: toIso(raw.last_invoice_at),
    created_at: toIso(raw.created_at),
    updated_at: toIso(raw.updated_at),
  }
}

interface RawExpense {
  id: string
  user_id: string
  amount_cents: number | string
  amount: number | string
  currency: string | null
  merchant: string | null
  category: string | null
  category_color: string | null
  occurred_at: string | Date | null
  date: string | Date | null
  has_receipt: boolean
  receipt_url: string | null
  notes: string | null
  description: string | null
  is_deductible: boolean
  tax_cents: number | string
  reconciled: boolean
  reconciled_match_id: string | null
  reconciled_match_description: string | null
  audit_log: unknown
  vendor: string | null
  account_id: string | null
  status: string
  created_by: string | null
  created_at: string | Date
  updated_at: string | Date
}

export interface SerializedExpense {
  id: string
  user_id: string
  amount_cents: number
  currency: string
  merchant: string
  category: string
  category_color: string
  occurred_at: string | null
  date: string | null
  has_receipt: boolean
  receipt_url: string | null
  notes: string
  description: string
  is_deductible: boolean
  tax_cents: number
  reconciled: boolean
  reconciled_match_id: string | null
  reconciled_match_description: string | null
  audit_log: Array<{ id: string; occurred_at: string; actor: string; action: string }>
  vendor: string | null
  account_id: string | null
  status: string
  created_at: string | null
  updated_at: string | null
}

function normalizeAuditLog(raw: unknown): SerializedExpense['audit_log'] {
  let arr: unknown[]
  if (Array.isArray(raw)) arr = raw
  else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      arr = Array.isArray(parsed) ? parsed : []
    } catch (_error) {
      // JSON.parse failed — default to empty audit log
      arr = []
    }
  } else {
    arr = []
  }
  return arr.map((entry, index) => {
    const e = (entry ?? {}) as Record<string, unknown>
    return {
      id: typeof e.id === 'string' ? e.id : `audit_${index}`,
      occurred_at:
        typeof e.occurred_at === 'string'
          ? e.occurred_at
          : e.occurred_at instanceof Date
            ? e.occurred_at.toISOString()
            : new Date().toISOString(),
      actor: typeof e.actor === 'string' ? e.actor : 'system',
      action: typeof e.action === 'string' ? e.action : '',
    }
  })
}

export function serializeExpense(raw: RawExpense): SerializedExpense {
  return {
    id: raw.id,
    user_id: raw.user_id,
    amount_cents: toNum(raw.amount_cents),
    currency: raw.currency ?? 'USD',
    merchant: raw.merchant ?? '',
    category: raw.category ?? 'Uncategorized',
    category_color: raw.category_color ?? '#888888',
    occurred_at: toIso(raw.occurred_at),
    date: toIso(raw.date),
    has_receipt: Boolean(raw.has_receipt),
    receipt_url: raw.receipt_url ?? null,
    notes: raw.notes ?? '',
    description: raw.description ?? '',
    is_deductible: Boolean(raw.is_deductible),
    tax_cents: toNum(raw.tax_cents),
    reconciled: Boolean(raw.reconciled),
    reconciled_match_id: raw.reconciled_match_id ?? null,
    reconciled_match_description: raw.reconciled_match_description ?? null,
    audit_log: normalizeAuditLog(raw.audit_log),
    vendor: raw.vendor ?? null,
    account_id: raw.account_id ?? null,
    status: raw.status ?? 'pending',
    created_at: toIso(raw.created_at),
    updated_at: toIso(raw.updated_at),
  }
}

interface RawPayment {
  id: string
  user_id: string
  invoice_id: string | null
  customer_name: string | null
  invoice_number: string | null
  amount_cents: number | string
  method: string
  reference: string | null
  status: string
  received_at: string | Date | null
  reconciled: boolean
  created_at: string | Date
}

export interface SerializedPayment {
  id: string
  user_id: string
  invoice_id: string | null
  customer_name: string
  invoice_number: string
  amount_cents: number
  method: string
  reference: string | null
  status: string
  received_at: string | null
  reconciled: boolean
  created_at: string | null
}

interface RawAccount {
  id: string
  user_id: string
  code: string
  name: string
  type: string
  description: string | null
  balance: number | string
  currency: string
  active: boolean
  created_at: string | Date
  updated_at: string | Date
}

export interface SerializedAccount {
  id: string
  user_id: string
  code: string
  name: string
  type: string
  description: string
  balance: number
  balance_cents: number
  currency: string
  active: boolean
  created_at: string | null
  updated_at: string | null
}

export function serializeAccount(raw: RawAccount): SerializedAccount {
  const balance = toNum(raw.balance)
  return {
    id: raw.id,
    user_id: raw.user_id,
    code: raw.code ?? '',
    name: raw.name ?? '',
    type: raw.type ?? '',
    description: raw.description ?? '',
    balance,
    balance_cents: Math.round(balance * 100),
    currency: raw.currency ?? 'USD',
    active: Boolean(raw.active),
    created_at: toIso(raw.created_at),
    updated_at: toIso(raw.updated_at),
  }
}

export function serializePayment(raw: RawPayment): SerializedPayment {
  return {
    id: raw.id,
    user_id: raw.user_id,
    invoice_id: raw.invoice_id ?? null,
    customer_name: raw.customer_name ?? '',
    invoice_number: raw.invoice_number ?? '',
    amount_cents: toNum(raw.amount_cents),
    method: raw.method ?? 'manual',
    reference: raw.reference ?? null,
    status: raw.status ?? 'received',
    received_at: toIso(raw.received_at),
    reconciled: Boolean(raw.reconciled),
    created_at: toIso(raw.created_at),
  }
}
