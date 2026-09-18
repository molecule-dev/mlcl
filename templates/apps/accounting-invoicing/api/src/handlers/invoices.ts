import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { resolveInvoiceTotals } from '../lib/invoice-totals.js'
import { type InvoiceCustomerLookup, serializeInvoice } from '../lib/serialize.js'
import type { AccountingInvoicingLimits } from '../tiers.js'

const router = Router()

interface RawInvoiceRow {
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

interface CustomerRow {
  id: string
  user_id: string
  contact_email: string | null
  address: unknown
}

/**
 * Look up the address + email for a set of customer ids in one query so we
 * can enrich invoice rows with the same fields the design baseline expects.
 */
async function loadCustomersByIds(
  userId: string,
  ids: Array<string | null | undefined>,
): Promise<Map<string, InvoiceCustomerLookup>> {
  const unique = Array.from(
    new Set(ids.filter((v): v is string => typeof v === 'string' && v.length > 0)),
  )
  if (unique.length === 0) return new Map()
  const where: WhereCondition[] = [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'id', operator: 'in', value: unique },
  ]
  const rows = await findMany<CustomerRow>('customers', { where })
  const map = new Map<string, InvoiceCustomerLookup>()
  for (const row of rows) {
    map.set(row.id, normalizeCustomerLookup(row))
  }
  return map
}

function normalizeCustomerLookup(row: CustomerRow): InvoiceCustomerLookup {
  let address: string[] = []
  const raw = row.address
  if (Array.isArray(raw)) {
    address = raw.filter((line): line is string => typeof line === 'string' && line.length > 0)
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          address = parsed.filter((l): l is string => typeof l === 'string' && l.length > 0)
        }
      } catch (_error) {
        // JSON.parse failed — treat raw string as single address line
        address = trimmed ? [trimmed] : []
      }
    } else if (trimmed) {
      address = [trimmed]
    }
  }
  return { contact_email: row.contact_email, address }
}

const lineItemSchema = z.object({
  description: z.string().optional(),
  quantity: z.number().optional(),
  unit_price: z.number().optional(),
  amount: z.number().optional(),
})

const createInvoiceSchema = z.object({
  invoice_number: z.string().nullable().optional(),
  customer_id: z.string().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  issue_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  // paid_at / sent_at are valid on create too — when an invoice is recorded
  // after the fact (e.g. legacy migration, Stripe payout reconciliation,
  // historical seeding) the lifecycle timestamps must be settable up-front,
  // not only via the subsequent update path. Reports rely on paid_at to bucket
  // revenue into the correct month/year, so dropping it on create silently
  // poisons every aggregate.
  paid_at: z.string().nullable().optional(),
  sent_at: z.string().nullable().optional(),
  tax_jurisdiction: z.string().nullable().optional(),
  line_items: z.array(lineItemSchema).optional(),
  subtotal_cents: z.number().optional(),
  tax_rate_pct: z.number().optional(),
  tax_cents: z.number().optional(),
  total_cents: z.number().optional(),
  amount_cents: z.number().optional(),
  currency: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

const updateInvoiceSchema = createInvoiceSchema

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const { status, customer_id } = req.query
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: String(status) })
    if (customer_id) where.push({ field: 'customer_id', operator: '=', value: String(customer_id) })

    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const items = await findMany<RawInvoiceRow>('invoices', { where, orderBy })
    const customers = await loadCustomersByIds(
      userId,
      items.map((i) => i.customer_id),
    )
    res.json(
      items.map((item) =>
        serializeInvoice(item, item.customer_id ? (customers.get(item.customer_id) ?? null) : null),
      ),
    )
  } catch (error) {
    logger.error('invoices.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const item = await findById<RawInvoiceRow>('invoices', getParamId(req))
    if (!item || item.user_id !== userId) {
      return res.status(404).json({ error: t('invoices.notFound') })
    }
    const customers = await loadCustomersByIds(userId, [item.customer_id])
    const customer = item.customer_id ? (customers.get(item.customer_id) ?? null) : null
    res.json(serializeInvoice(item, customer))
  } catch (error) {
    logger.error('invoices.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

// Enforce the per-tier invoices cap (tiers.ts maxInvoices) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could create unlimited.
const enforceInvoiceLimit = enforceLimit<AccountingInvoicingLimits>({
  limitType: 'maxInvoices',
  getLimit: (limits) => limits.maxInvoices,
  getCurrent: async (userId) =>
    count('invoices', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceInvoiceLimit,
  validateBody(createInvoiceSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

      const issue = req.body.issue_date ? new Date(req.body.issue_date) : new Date()
      const due = req.body.due_date ? new Date(req.body.due_date) : null
      const paid = req.body.paid_at ? new Date(req.body.paid_at) : null
      const sent = req.body.sent_at ? new Date(req.body.sent_at) : null

      let invoiceNumber: string | null = req.body.invoice_number ?? null
      if (!invoiceNumber) {
        const existing = await findMany<{ invoice_number: string | null }>('invoices', {
          where: [{ field: 'user_id', operator: '=', value: userId }],
          orderBy: [{ field: 'created_at', direction: 'desc' }],
        })
        let maxSeq = 0
        for (const row of existing) {
          const m = /^INV-(\d+)$/.exec(row.invoice_number ?? '')
          if (m) maxSeq = Math.max(maxSeq, Number(m[1]))
        }
        invoiceNumber = `INV-${String(maxSeq + 1).padStart(4, '0')}`
      }

      // Seed the tax rate from the company's stored "Default tax rate" (Settings →
      // company_profile.default_tax_rate_pct) when the request omits one; any
      // client-supplied breakdown wins, missing pieces are computed from it.
      const company = await findOne<{ default_tax_rate_pct?: number | null }>('company_profile', [
        { field: 'user_id', operator: '=', value: userId },
      ])
      const totals = resolveInvoiceTotals(req.body, Number(company?.default_tax_rate_pct ?? 0))

      const result = await create<RawInvoiceRow>('invoices', {
        user_id: userId,
        invoice_number: invoiceNumber,
        customer_id: req.body.customer_id ?? null,
        customer_name: req.body.customer_name ?? null,
        status: req.body.status ?? 'draft',
        issue_date: issue,
        due_date: due,
        paid_at: paid,
        sent_at: sent,
        tax_jurisdiction: req.body.tax_jurisdiction ?? null,
        // JSONB columns must be passed as a JSON string — node-postgres serialises
        // raw JS arrays as PG arrays (`{...}`) which fails on jsonb columns.
        line_items: JSON.stringify(req.body.line_items ?? []),
        subtotal_cents: totals.subtotal_cents,
        tax_rate_pct: totals.tax_rate_pct,
        tax_cents: totals.tax_cents,
        total_cents: totals.total_cents,
        amount_cents: totals.amount_cents,
        currency: req.body.currency ?? 'USD',
        notes: req.body.notes ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      if (!result.data) return res.status(500).json({ error: t('errors.internalServer') })
      const created = result.data
      const customers = await loadCustomersByIds(userId, [created.customer_id])
      const customer = created.customer_id ? (customers.get(created.customer_id) ?? null) : null
      res.status(201).json(serializeInvoice(created, customer))
    } catch (error) {
      logger.error('invoices.create', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put('/:id', validateBody(updateInvoiceSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('invoices', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('invoices.notFound') })
    }

    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date() }
    if (typeof req.body.issue_date === 'string') updates.issue_date = new Date(req.body.issue_date)
    if (typeof req.body.due_date === 'string') updates.due_date = new Date(req.body.due_date)
    if (typeof req.body.paid_at === 'string') updates.paid_at = new Date(req.body.paid_at)
    if (typeof req.body.sent_at === 'string') updates.sent_at = new Date(req.body.sent_at)
    if (req.body.line_items !== undefined) {
      updates.line_items = JSON.stringify(req.body.line_items)
    }

    const result = await updateById<RawInvoiceRow>('invoices', id, updates)
    if (!result.data) return res.status(500).json({ error: t('errors.internalServer') })
    const updated = result.data
    const customers = await loadCustomersByIds(userId, [updated.customer_id])
    const customer = updated.customer_id ? (customers.get(updated.customer_id) ?? null) : null
    res.json(serializeInvoice(updated, customer))
  } catch (error) {
    logger.error('invoices.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('invoices', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('invoices.notFound') })
    }
    await deleteById('invoices', id)
    res.status(204).end()
  } catch (error) {
    logger.error('invoices.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
