/**
 * Projection helpers — turn raw DB rows into the shape the frontend
 * expects. PostgreSQL returns numerics as strings, jsonb as objects,
 * timestamps as Date objects. The frontend expects numbers, parsed
 * arrays, and ISO strings respectively.
 *
 * @module
 */

interface ClientRow {
  id: string
  user_id: string
  name?: string | null
  email?: string | null
  company?: string | null
  phone?: string | null
  address?: string | Record<string, unknown> | null
  tax_id?: string | null
  notes?: string | null
  total_billed?: string | number | null
  total_paid?: string | number | null
  created_at?: string | Date | null
}

interface InvoiceRow {
  id: string
  user_id: string
  client_id?: string | null
  client_name?: string | null
  client_company?: string | null
  invoice_number?: string | null
  status?: string | null
  total?: string | number | null
  amount_paid?: string | number | null
  subtotal?: string | number | null
  tax_rate?: string | number | null
  tax_amount?: string | number | null
  currency?: string | null
  notes?: string | null
  items?: string | unknown[] | null
  due_date?: string | Date | null
  sent_at?: string | Date | null
  created_at?: string | Date | null
}

interface PaymentRow {
  id: string
  user_id: string
  invoice_id?: string | null
  invoice_number?: string | null
  client_name?: string | null
  amount?: string | number | null
  method?: string | null
  reference?: string | null
  status?: string | null
  created_at?: string | Date | null
}

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number | null | undefined)
  return Number.isFinite(n as number) ? (n as number) : 0
}

const iso = (v: unknown): string | null => {
  if (v == null) return null
  const d = v instanceof Date ? v : new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

const parseItems = (raw: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(raw)) return raw as Array<Record<string, unknown>>
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (_error) {
      // Raw string is not valid JSON; fall back to empty array
      return []
    }
  }
  return []
}

const parseAddress = (raw: unknown): string | Record<string, unknown> | null => {
  if (raw == null) return null
  if (typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed)
      } catch (_error) {
        // Raw string looks like JSON but isn't; return as plain string
        return raw
      }
    }
    return raw
  }
  return null
}

export interface DecoratedClient {
  id: string
  name: string
  email: string | null
  company: string | null
  phone: string | null
  address: string | Record<string, unknown> | null
  tax_id: string | null
  notes: string | null
  total_billed: number
  total_paid: number
  outstanding_cents: number
  invoice_count: number
  last_activity: string | null
  created_at: string | null
}

export function decorateClient(
  client: ClientRow,
  invoices: InvoiceRow[],
  payments: PaymentRow[],
): DecoratedClient {
  const myInvoices = invoices.filter((i) => i.client_id === client.id)
  const myPayments = payments.filter((p) => myInvoices.some((i) => i.id === p.invoice_id))
  let outstanding = 0
  let billed = 0
  for (const inv of myInvoices) {
    const total = num(inv.total)
    const paid = num(inv.amount_paid)
    billed += total
    const status = String(inv.status ?? '').toLowerCase()
    if (['sent', 'viewed', 'partial', 'overdue'].includes(status)) {
      outstanding += total - paid
    }
  }
  let lastActivity = client.created_at ? new Date(client.created_at).getTime() : 0
  for (const inv of myInvoices) {
    const ts = inv.created_at ? new Date(inv.created_at).getTime() : 0
    if (ts > lastActivity) lastActivity = ts
    const sent = inv.sent_at ? new Date(inv.sent_at).getTime() : 0
    if (sent > lastActivity) lastActivity = sent
  }
  for (const p of myPayments) {
    const ts = p.created_at ? new Date(p.created_at).getTime() : 0
    if (ts > lastActivity) lastActivity = ts
  }
  return {
    id: client.id,
    name: client.name ?? '',
    email: client.email ?? null,
    company: client.company ?? null,
    phone: client.phone ?? null,
    address: parseAddress(client.address),
    tax_id: client.tax_id ?? null,
    notes: client.notes ?? null,
    total_billed: Math.round(billed * 100) / 100,
    total_paid: num(client.total_paid),
    outstanding_cents: Math.round(outstanding * 100),
    invoice_count: myInvoices.length,
    last_activity: lastActivity > 0 ? new Date(lastActivity).toISOString() : null,
    created_at: iso(client.created_at),
  }
}

export interface DecoratedInvoice {
  id: string
  client_id: string | null
  client_name: string
  client_company: string | null
  invoice_number: string
  status: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  amount_paid: number
  currency: string
  notes: string | null
  items: Array<{ description: string; quantity: number; unit_price: number }>
  due_date: string | null
  sent_at: string | null
  created_at: string | null
}

export function decorateInvoice(invoice: InvoiceRow, client?: ClientRow | null): DecoratedInvoice {
  return {
    id: invoice.id,
    client_id: (invoice.client_id as string | null) ?? null,
    client_name: invoice.client_name ?? client?.name ?? '',
    client_company: invoice.client_company ?? client?.company ?? null,
    invoice_number: invoice.invoice_number ?? '',
    status: String(invoice.status ?? 'draft'),
    subtotal: num(invoice.subtotal),
    tax_rate: num(invoice.tax_rate),
    tax_amount: num(invoice.tax_amount),
    total: num(invoice.total),
    amount_paid: num(invoice.amount_paid),
    currency: invoice.currency ?? 'USD',
    notes: invoice.notes ?? null,
    items: parseItems(invoice.items) as DecoratedInvoice['items'],
    due_date: iso(invoice.due_date),
    sent_at: iso(invoice.sent_at),
    created_at: iso(invoice.created_at),
  }
}

export interface DecoratedPayment {
  id: string
  invoice_id: string | null
  invoice_number: string | null
  client_name: string | null
  amount: number
  method: string
  reference: string | null
  status: string
  created_at: string | null
}

export function decoratePayment(payment: PaymentRow): DecoratedPayment {
  return {
    id: payment.id,
    invoice_id: payment.invoice_id ?? null,
    invoice_number: payment.invoice_number ?? null,
    client_name: payment.client_name ?? null,
    amount: num(payment.amount),
    method: String(payment.method ?? 'manual'),
    reference: payment.reference ?? null,
    status: String(payment.status ?? 'completed'),
    created_at: iso(payment.created_at),
  }
}
