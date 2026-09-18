/**
 * Shared backend payload types — keep field names aligned with the API
 * handlers in api/src/handlers/* and the migration in api/migrations/0010.
 *
 * The frontend imports these instead of redeclaring local interfaces so
 * a schema rename only has to be done in one place.
 */

export interface ApiTimeEntry {
  id: string
  owner_id: string
  project_id: string | null
  description: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  is_billable: boolean
  tags: string[]
  invoiced: boolean
  created_at: string
  updated_at: string
}

export interface ApiProject {
  id: string
  owner_id: string
  client_id: string | null
  name: string
  description: string | null
  color: string
  budget_cents: number | null
  billable: boolean
  hourly_rate_cents: number | null
  archived: boolean
  created_at: string
  updated_at: string
}

export interface ApiClient {
  id: string
  owner_id: string
  name: string
  email: string | null
  billing_currency: string
  billing_address: unknown
  hourly_rate_cents: number | null
  archived: boolean
  created_at: string
  updated_at: string
}

export interface ApiInvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  quantity: string | number
  rate_cents: number
  amount_cents: number
  source_entry_ids: string[]
  created_at: string
}

export interface ApiInvoice {
  id: string
  owner_id: string
  client_id: string
  number: string
  issued_at: string
  due_at: string | null
  currency: string
  subtotal_cents: number
  tax_cents: number
  total_cents: number
  status: 'draft' | 'sent' | 'paid' | 'void' | string
  notes: string | null
  pdf_url: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  line_items?: ApiInvoiceLineItem[]
}

export interface ApiReportSummaryRow {
  project_id: string | null
  total_seconds: number
  billable_seconds: number
  revenue_cents: number
  entries: number
}

export interface ApiReportDailyRow {
  date: string
  total_seconds: number
  billable_seconds: number
  revenue_cents: number
}
