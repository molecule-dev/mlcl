import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { resolveCurrency } from '../lib/prefs.js'
import type { InvoiceBillingLimits } from '../tiers.js'
import { decorateInvoice } from './_decorate.js'
import { ensureDemoSeeded } from './_seed.js'

const router = Router()

/**
 * The invoice-number prefix is a saved user preference (Settings → "Invoice prefix",
 * persisted at users.oauthData.preferences.invoicePrefix, default "INV-"). Generated invoice
 * numbers used to hardcode "INV-", so the setting did nothing; resolve it here so both the
 * create and duplicate paths honor it.
 */
async function resolveInvoicePrefix(userId: string): Promise<string> {
  const user = await findById<{ oauthData?: { preferences?: { invoicePrefix?: string } } | null }>(
    'users',
    userId,
  )
  const prefix = user?.oauthData?.preferences?.invoicePrefix
  return typeof prefix === 'string' && prefix.length > 0 ? prefix : 'INV-'
}

/**
 * The default payment term (days until due) is a saved user preference
 * (users.oauthData.preferences.defaultDueDays, default 14). When a client creates an invoice
 * without an explicit due_date, invoice create used to store `null`, so the saved term did nothing —
 * the same drop invoicePrefix had before it was wired in above. Resolve it here.
 */
async function resolveDefaultDueDays(userId: string): Promise<number> {
  const user = await findById<{ oauthData?: { preferences?: { defaultDueDays?: number } } | null }>(
    'users',
    userId,
  )
  const days = user?.oauthData?.preferences?.defaultDueDays
  return typeof days === 'number' && Number.isFinite(days) && days >= 0 ? days : 14
}

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
})

const createInvoiceSchema = z.object({
  client_id: z.string().min(1),
  items: z.array(lineItemSchema).min(1),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  currency: z.string().min(3).max(8).optional(),
})

const updateInvoiceSchema = z.object({
  items: z.array(lineItemSchema).optional(),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  currency: z.string().min(3).max(8).optional(),
  status: z.enum(['draft', 'sent', 'partial', 'paid', 'overdue', 'void']).optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    await ensureDemoSeeded(userId)

    const { client_id, status } = req.query

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (client_id) {
      where.push({ field: 'client_id', operator: '=', value: client_id })
    }
    if (status) {
      where.push({ field: 'status', operator: '=', value: status })
    }

    const invoices = await findMany<Record<string, unknown>>('invoices', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })

    res.json(invoices.map((i) => decorateInvoice(i as never)))
  } catch (error) {
    logger.error('invoices.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const invoice = await findById<Record<string, unknown>>('invoices', id)
    if (!invoice || invoice.user_id !== userId) {
      return res.status(404).json({ error: t('invoices.notFound') })
    }
    let client: Record<string, unknown> | null = null
    if (invoice.client_id) {
      client = await findById<Record<string, unknown>>('clients', invoice.client_id as string)
    }
    res.json(decorateInvoice(invoice as never, client as never))
  } catch (error) {
    logger.error('invoices.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/',
  enforceLimit<InvoiceBillingLimits>({
    limitType: 'maxInvoices',
    getLimit: (limits) => limits.maxInvoices,
    getCurrent: async (userId) =>
      count('invoices', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createInvoiceSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({ error: t('auth.unauthorized') })
      }

      const { client_id, items, due_date, notes, tax_rate, currency } = req.body as {
        client_id: string
        items: Array<{ quantity: number; unit_price: number; description: string }>
        due_date?: string
        notes?: string
        tax_rate?: number
        currency?: string
      }

      const client = await findById<Record<string, unknown>>('clients', client_id)
      if (!client || client.user_id !== userId) {
        return res.status(400).json({
          error: t('payments.invoiceNotFound', undefined, { defaultValue: 'Client not found' }),
        })
      }

      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
      const rate = tax_rate ?? 0
      const tax = subtotal * (rate / 100)
      const total = subtotal + tax

      const invoicePrefix = await resolveInvoicePrefix(userId)
      const now = new Date()
      // Honor the saved default payment term when no explicit due_date is given (was dropped → null).
      const dueDate = due_date
        ? new Date(due_date)
        : new Date(now.getTime() + (await resolveDefaultDueDays(userId)) * 86_400_000)
      const result = await create('invoices', {
        user_id: userId,
        client_id,
        client_name: client.name ?? null,
        client_company: client.company ?? null,
        invoice_number: `${invoicePrefix}${Date.now()}`,
        items: JSON.stringify(items),
        subtotal,
        tax_rate: rate,
        tax_amount: tax,
        total,
        // Honor the saved default currency when the client omits one (was hardcoded 'USD').
        currency: currency || (await resolveCurrency(userId)),
        due_date: dueDate,
        notes: notes ?? null,
        status: 'draft',
        amount_paid: 0,
        created_at: now,
      })

      const created = result.data as Record<string, unknown> | null
      if (!created) return res.status(500).json({ error: t('errors.internalServer') })
      res.status(201).json(decorateInvoice(created as never, client as never))
    } catch (error) {
      logger.error('invoices.create', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put('/:id', validateBody(updateInvoiceSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('invoices', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('invoices.notFound') })
    }

    const { items, due_date, notes, tax_rate, currency, status } = req.body as {
      items?: Array<{ quantity: number; unit_price: number; description: string }>
      due_date?: string
      notes?: string
      tax_rate?: number
      currency?: string
      status?: string
    }

    const updates: Record<string, unknown> = {}
    if (items !== undefined) {
      const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
      const rate = tax_rate ?? Number(existing.tax_rate ?? 0)
      const tax = subtotal * (rate / 100)
      updates.items = JSON.stringify(items)
      updates.subtotal = subtotal
      updates.tax_amount = tax
      updates.total = subtotal + tax
      updates.tax_rate = rate
    } else if (tax_rate !== undefined) {
      const subtotal = Number(existing.subtotal ?? 0)
      const tax = subtotal * (tax_rate / 100)
      updates.tax_rate = tax_rate
      updates.tax_amount = tax
      updates.total = subtotal + tax
    }
    if (due_date !== undefined) updates.due_date = due_date ? new Date(due_date) : null
    if (notes !== undefined) updates.notes = notes
    if (currency !== undefined) updates.currency = currency
    if (status !== undefined) updates.status = status

    const result = await updateById('invoices', id, updates)
    const updated = result.data as Record<string, unknown> | null
    if (!updated) return res.status(500).json({ error: t('errors.internalServer') })
    let client: Record<string, unknown> | null = null
    if (updated.client_id) {
      client = await findById<Record<string, unknown>>('clients', updated.client_id as string)
    }
    res.json(decorateInvoice(updated as never, client as never))
  } catch (error) {
    logger.error('invoices.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

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

router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const invoice = await findById<Record<string, unknown>>('invoices', id)
    if (!invoice || invoice.user_id !== userId) {
      return res.status(404).json({ error: t('invoices.notFound') })
    }

    await updateById('invoices', id, {
      status: 'sent',
      sent_at: new Date(),
    })

    let emailDelivered = false
    if (invoice.client_id) {
      const client = await findById<Record<string, unknown>>('clients', invoice.client_id as string)
      if (client?.email) {
        const number = String(invoice.invoice_number ?? '')
        const total = String(invoice.total ?? '')
        try {
          await sendMail({
            from:
              process.env.EMAIL_FROM ?? `invoices@${process.env.MAILGUN_DOMAIN ?? 'flagship.test'}`,
            to: client.email as string,
            subject: t('invoices.emailSubject', { number }, { defaultValue: `Invoice ${number}` }),
            text: t(
              'invoices.emailBody',
              { number, total },
              { defaultValue: `Your invoice ${number} for $${total} is ready.` },
            ),
          })
          emailDelivered = true
        } catch (_error) {
          // Email send failure must not block the status flip — sandbox
          // domains may bounce. The status change above is the source of truth.
        }
      }
    }

    res.json({ success: true, status: 'sent', emailDelivered })
  } catch (error) {
    logger.error('invoices.send', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/:id/void', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const invoice = await findById<Record<string, unknown>>('invoices', id)
    if (!invoice || invoice.user_id !== userId) {
      return res.status(404).json({ error: t('invoices.notFound') })
    }

    const status = String(invoice.status ?? 'draft')
    // Voiding is idempotent for an already-void invoice. An invoice with recorded
    // payments cannot be voided — that would orphan the payment ledger rows (money
    // collected against a "void" invoice); it must be refunded first.
    if (status === 'void') {
      return res.json({ success: true, status: 'void' })
    }
    if (Number(invoice.amount_paid ?? 0) > 0 || status === 'paid' || status === 'partial') {
      return res.status(409).json({
        error: t(
          'invoices.cannotVoidPaid',
          {},
          {
            defaultValue: 'Cannot void an invoice with recorded payments — refund it first',
          },
        ),
      })
    }

    await updateById('invoices', id, { status: 'void' })
    res.json({ success: true, status: 'void' })
  } catch (error) {
    logger.error('invoices.void', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/:id/duplicate',
  enforceLimit<InvoiceBillingLimits>({
    limitType: 'maxInvoices',
    getLimit: (limits) => limits.maxInvoices,
    getCurrent: async (userId) =>
      count('invoices', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

      const id = getParamId(req)
      const source = await findById<Record<string, unknown>>('invoices', id)
      if (!source || source.user_id !== userId) {
        return res.status(404).json({ error: t('invoices.notFound') })
      }

      // `source.items` may come back from the DB as a parsed array (jsonb)
      // OR as a JSON-encoded string (text/json). Normalise to a JSON string
      // so the create() call doesn't double-encode and crash with
      // "invalid input syntax for type json".
      let normalisedItems: string
      if (typeof source.items === 'string') {
        normalisedItems = source.items
      } else {
        normalisedItems = JSON.stringify(source.items ?? [])
      }
      const invoicePrefix = await resolveInvoicePrefix(userId)
      const result = await create('invoices', {
        user_id: userId,
        client_id: source.client_id,
        client_name: source.client_name,
        client_company: source.client_company,
        invoice_number: `${invoicePrefix}${Date.now()}`,
        items: normalisedItems,
        subtotal: source.subtotal,
        tax_rate: source.tax_rate,
        tax_amount: source.tax_amount,
        total: source.total,
        currency: source.currency,
        due_date: null,
        notes: source.notes,
        status: 'draft',
        amount_paid: 0,
        created_at: new Date(),
      })
      const created = result.data as Record<string, unknown> | null
      if (!created) return res.status(500).json({ error: t('errors.internalServer') })
      res.status(201).json(decorateInvoice(created as never))
    } catch (error) {
      logger.error('invoices.duplicate', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.get('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const invoice = await findById<Record<string, unknown>>('invoices', id)
    if (!invoice || invoice.user_id !== userId) {
      return res.status(404).json({ error: t('invoices.notFound') })
    }

    let client: Record<string, unknown> | null = null
    if (invoice.client_id) {
      client = await findById<Record<string, unknown>>('clients', invoice.client_id as string)
    }

    const items: Array<{ description: string; quantity: number; unit_price: number }> = (() => {
      const raw = invoice.items
      if (Array.isArray(raw))
        return raw as Array<{ description: string; quantity: number; unit_price: number }>
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw) as Array<{
            description: string
            quantity: number
            unit_price: number
          }>
        } catch (_error) {
          // Raw string is not valid JSON; fall back to empty items list
          return []
        }
      }
      return []
    })()

    const fmtMoney = (n: unknown): string =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: String(invoice.currency ?? 'USD'),
      }).format(Number(n ?? 0))

    const fmtDate = (v: unknown): string =>
      v
        ? new Date(String(v)).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : '—'

    const escapeHtml = (s: unknown): string =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')

    const subtotal = Number(invoice.subtotal ?? 0)
    const tax = Number(invoice.tax_amount ?? 0)
    const total = Number(invoice.total ?? 0)
    const amountPaid = Number(invoice.amount_paid ?? 0)
    const balance = total - amountPaid

    const itemsHtml = items
      .map(
        (item) => `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9">${escapeHtml(item.description)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;text-align:right">${item.quantity}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;text-align:right">${fmtMoney(item.unit_price)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600">${fmtMoney(item.quantity * item.unit_price)}</td>
        </tr>`,
      )
      .join('')

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice ${escapeHtml(invoice.invoice_number)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1a1a2e; padding: 40px; max-width: 760px; margin: 0 auto; }
  h1 { color: #0a5c5f; font-size: 28px; margin: 0; letter-spacing: -0.02em; }
  .meta { color: #64748b; font-size: 13px; margin-top: 6px; }
  .panel { background: #f7fafa; padding: 16px; border-radius: 10px; margin: 18px 0; }
  table { width: 100%; border-collapse: collapse; margin: 18px 0; }
  th { background: #f7fafa; text-align: left; padding: 10px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
  th.right { text-align: right; }
  .total-row { font-weight: 700; color: #0a5c5f; font-size: 18px; padding-top: 12px; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; background: #dcfce7; color: #16804a; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
</style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <h1>Invoice ${escapeHtml(invoice.invoice_number)}</h1>
      <div class="meta">Issued ${fmtDate(invoice.created_at)} · Due ${fmtDate(invoice.due_date)}</div>
    </div>
    <span class="badge">${escapeHtml(String(invoice.status ?? 'draft').toUpperCase())}</span>
  </div>
  <div class="panel">
    <strong>Bill to:</strong> ${escapeHtml(client?.name ?? invoice.client_name ?? 'Client')}
    ${client?.email ? `<br>${escapeHtml(client.email)}` : ''}
    ${client?.phone ? `<br>${escapeHtml(client.phone)}` : ''}
  </div>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="right">Qty</th>
        <th class="right">Rate</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml || '<tr><td colspan="4" style="padding:20px;text-align:center;color:#94a3b8">No line items</td></tr>'}
    </tbody>
  </table>
  <div style="display:flex;justify-content:flex-end">
    <table style="width:300px">
      <tr>
        <td style="padding:6px 8px;color:#64748b">Subtotal</td>
        <td style="padding:6px 8px;text-align:right">${fmtMoney(subtotal)}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px;color:#64748b">Tax (${escapeHtml(invoice.tax_rate)}%)</td>
        <td style="padding:6px 8px;text-align:right">${fmtMoney(tax)}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:12px">Amount paid</td>
        <td style="padding:6px 8px;text-align:right;border-top:1px solid #e2e8f0;padding-top:12px">${fmtMoney(amountPaid)}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px" class="total-row">Balance due</td>
        <td style="padding:6px 8px;text-align:right" class="total-row">${fmtMoney(balance)}</td>
      </tr>
    </table>
  </div>
  ${invoice.notes ? `<div class="panel">${escapeHtml(invoice.notes)}</div>` : ''}
  <p style="margin-top:36px;color:#94a3b8;font-size:11px;text-align:center">Generated ${fmtDate(new Date())}</p>
</body>
</html>`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${String(invoice.invoice_number ?? id)}.html"`,
    )
    res.send(html)
  } catch (error) {
    logger.error('invoices.pdf', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
