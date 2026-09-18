import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number(),
  rate_cents: z.number().int().nonnegative(),
  amount_cents: z.number().int().nonnegative(),
  source_entry_ids: z.array(z.string().uuid()).optional(),
})

const createInvoiceSchema = z.object({
  client_id: z.string().uuid(),
  number: z.string().optional(),
  issued_at: z.string().optional(),
  due_at: z.string().optional().nullable(),
  currency: z.string().optional(),
  notes: z.string().optional().nullable(),
  line_items: z.array(lineItemSchema).optional(),
  source_entry_ids: z.array(z.string().uuid()).optional(),
  tax_cents: z.number().int().nonnegative().optional(),
})

const updateInvoiceSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'cancelled']).optional(),
  due_at: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  pdf_url: z.string().optional().nullable(),
  paid_at: z.string().optional().nullable(),
})

function generateInvoiceNumber(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `INV-${ts}-${rand}`
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const { client_id, status } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (client_id) where.push({ field: 'client_id', operator: '=', value: client_id })
    if (status) where.push({ field: 'status', operator: '=', value: status })

    const orderBy: OrderBy[] = [{ field: 'issued_at', direction: 'desc' }]
    const items = await findMany('invoices', { where, orderBy })
    res.json(items)
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const invoice = await findById<Record<string, unknown>>('invoices', id)
    if (!invoice || invoice.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('invoice.notFound', {}, { defaultValue: 'Invoice not found' }) })
    }

    const lineItems = await findMany('invoice_line_items', {
      where: [{ field: 'invoice_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })

    res.json({ ...invoice, line_items: lineItems })
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createInvoiceSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const {
      client_id,
      number,
      issued_at,
      due_at,
      currency,
      notes,
      line_items,
      source_entry_ids,
      tax_cents,
    } = req.body

    // Verify the client belongs to the user.
    const client = await findById<Record<string, unknown>>('clients', client_id)
    if (!client || client.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('client.notFound', {}, { defaultValue: 'Client not found' }) })
    }

    // If source_entry_ids provided but no explicit line_items, derive lines
    // from billable entries (each unique project becomes one line).
    let lines = line_items as
      | Array<{
          description: string
          quantity: number
          rate_cents: number
          amount_cents: number
          source_entry_ids?: string[]
        }>
      | undefined

    if (
      (!lines || lines.length === 0) &&
      Array.isArray(source_entry_ids) &&
      source_entry_ids.length > 0
    ) {
      const entries = await findMany<{
        id: string
        owner_id: string
        project_id: string | null
        description: string
        duration_seconds: number | null
        is_billable: boolean
      }>('time_entries', {
        where: [
          { field: 'owner_id', operator: '=', value: userId },
          { field: 'id', operator: 'in', value: source_entry_ids },
        ],
      })
      // Pull projects referenced by the selected entries so we can prefer
      // the project's hourly rate over the client's. A user who set
      // hourly_rate_cents on the project expects that rate to apply.
      const projectIds = Array.from(
        new Set(entries.map((e) => e.project_id).filter((p): p is string => !!p)),
      )
      const projectRates = new Map<string, number>()
      const projectNames = new Map<string, string>()
      if (projectIds.length > 0) {
        const projects = await findMany<{
          id: string
          owner_id: string
          name: string
          hourly_rate_cents: number | null
        }>('projects', {
          where: [
            { field: 'owner_id', operator: '=', value: userId },
            { field: 'id', operator: 'in', value: projectIds },
          ],
        })
        for (const p of projects) {
          if (typeof p.hourly_rate_cents === 'number') projectRates.set(p.id, p.hourly_rate_cents)
          projectNames.set(p.id, p.name)
        }
      }
      const clientRate = (client.hourly_rate_cents as number | null) ?? 0
      const byProject = new Map<
        string,
        { description: string; seconds: number; ids: string[]; rate: number }
      >()
      for (const e of entries) {
        if (e.owner_id !== userId || !e.is_billable) continue
        const k = e.project_id ?? 'unbilled'
        // Prefer project rate, fall back to client rate. Stored on the
        // bucket so multi-project invoices correctly bill each line at
        // the rate the project owner configured.
        const rate = e.project_id ? (projectRates.get(e.project_id) ?? clientRate) : clientRate
        const description = e.project_id
          ? (projectNames.get(e.project_id) ?? e.description ?? k)
          : (e.description ?? k)
        const existing = byProject.get(k) ?? { description, seconds: 0, ids: [], rate }
        existing.seconds += e.duration_seconds ?? 0
        existing.ids.push(e.id)
        byProject.set(k, existing)
      }
      lines = []
      for (const [, agg] of byProject) {
        const hours = agg.seconds / 3600
        const amount = Math.round(hours * agg.rate)
        lines.push({
          description: agg.description,
          quantity: hours,
          rate_cents: agg.rate,
          amount_cents: amount,
          source_entry_ids: agg.ids,
        })
      }
    }

    const subtotal = (lines ?? []).reduce((acc, l) => acc + (l.amount_cents ?? 0), 0)
    const tax = tax_cents ?? 0
    const total = subtotal + tax

    const invoice = await create('invoices', {
      owner_id: userId,
      client_id,
      number: number ?? generateInvoiceNumber(),
      issued_at: issued_at ? new Date(issued_at) : new Date(),
      due_at: due_at ? new Date(due_at) : null,
      currency: currency ?? (client.billing_currency as string) ?? 'USD',
      subtotal_cents: subtotal,
      tax_cents: tax,
      total_cents: total,
      status: 'draft',
      notes: notes ?? null,
      pdf_url: null,
      paid_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    })

    const created = ((invoice as { data?: unknown }).data ?? invoice) as { id: string }
    const invoiceId = created.id

    if (Array.isArray(lines)) {
      for (const line of lines) {
        await create('invoice_line_items', {
          invoice_id: invoiceId,
          description: line.description,
          quantity: line.quantity,
          rate_cents: line.rate_cents,
          amount_cents: line.amount_cents,
          source_entry_ids: line.source_entry_ids ?? [],
          created_at: new Date(),
        })
      }
    }

    // Mark linked time entries as invoiced so they don't get billed twice.
    const allEntryIds = new Set<string>()
    for (const line of lines ?? []) {
      for (const eid of line.source_entry_ids ?? []) allEntryIds.add(eid)
    }
    for (const eid of Array.isArray(source_entry_ids) ? source_entry_ids : []) allEntryIds.add(eid)
    for (const eid of allEntryIds) {
      await updateById('time_entries', eid, { invoiced: true, updated_at: new Date() })
    }

    res.status(201).json(created)
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateInvoiceSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('invoices', id)
    if (!existing || existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('invoice.notFound', {}, { defaultValue: 'Invoice not found' }) })
    }

    const updates: Record<string, unknown> = { updated_at: new Date() }
    for (const field of ['status', 'notes', 'pdf_url']) {
      if (field in req.body) updates[field] = req.body[field]
    }
    if ('due_at' in req.body) {
      updates.due_at = req.body.due_at == null ? null : new Date(req.body.due_at)
    }
    if ('paid_at' in req.body) {
      updates.paid_at = req.body.paid_at == null ? null : new Date(req.body.paid_at)
    }
    // Auto-set paid_at when transitioning to paid.
    if (updates.status === 'paid' && !('paid_at' in req.body)) {
      updates.paid_at = new Date()
    }

    const result = await updateById('invoices', id, updates)

    // When invoice goes to paid, mark underlying entries as invoiced.
    if (updates.status === 'paid') {
      const lineItems = await findMany<{ source_entry_ids: string[] | null }>(
        'invoice_line_items',
        {
          where: [{ field: 'invoice_id', operator: '=', value: id }],
        },
      )
      const entryIds: string[] = []
      for (const li of lineItems) {
        for (const eid of li.source_entry_ids ?? []) entryIds.push(eid)
      }
      for (const eid of entryIds) {
        await updateById('time_entries', eid, { invoiced: true, updated_at: new Date() })
      }
    }

    res.json((result as { data?: unknown }).data ?? result)
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('invoices', id)
    if (!existing || existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('invoice.notFound', {}, { defaultValue: 'Invoice not found' }) })
    }
    // Un-invoice any linked entries so they show up again as billable.
    const lineItems = await findMany<{ id: string; source_entry_ids: string[] | null }>(
      'invoice_line_items',
      {
        where: [{ field: 'invoice_id', operator: '=', value: id }],
      },
    )
    const entryIds: string[] = []
    for (const li of lineItems) {
      for (const eid of li.source_entry_ids ?? []) entryIds.push(eid)
    }
    for (const eid of entryIds) {
      await updateById('time_entries', eid, { invoiced: false, updated_at: new Date() })
    }
    for (const li of lineItems) {
      await deleteById('invoice_line_items', li.id)
    }
    await deleteById('invoices', id)
    res.status(204).end()
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
