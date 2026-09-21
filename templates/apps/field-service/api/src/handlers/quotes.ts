import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership } from '../lib/authz.js'
import type { FieldServiceLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'
import { asMap, shapeJob, shapeQuote } from './_shape.js'

const router = Router()

const itemSchema = z.object({
  description: z.string().min(1).max(500),
  qty: z.number().min(0).max(100000),
  unit: z.string().max(40).optional(),
  rate_cents: z.number().int().min(0).max(100_000_000),
})

const createQuoteSchema = z.object({
  customer_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  valid_until: z.string().datetime().optional().nullable(),
  notes: z.string().max(4000).optional(),
  items: z.array(itemSchema).min(1).max(50).optional(),
})

const updateQuoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  valid_until: z.string().datetime().optional().nullable(),
  notes: z.string().max(4000).optional(),
  items: z.array(itemSchema).min(1).max(50).optional(),
})

const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'declined'] as const
type QuoteStatus = (typeof QUOTE_STATUSES)[number]

const lineTotalCents = (items: Array<{ qty: number; rate_cents: number }>): number =>
  items.reduce((sum, it) => sum + Math.round(it.qty * it.rate_cents), 0)

/** Fetch items for many quotes at once, grouped by quote_id. */
async function itemsByQuote(
  quoteIds: readonly string[],
): Promise<Map<string, Array<Record<string, unknown>>>> {
  const grouped = new Map<string, Array<Record<string, unknown>>>()
  if (quoteIds.length === 0) return grouped
  const items = await findMany('quote_items', {
    where: [{ field: 'quote_id', operator: 'in', value: [...quoteIds] }],
    orderBy: [{ field: 'position', direction: 'asc' }],
  })
  for (const it of items as Array<Record<string, unknown>>) {
    const qid = typeof it.quote_id === 'string' ? it.quote_id : ''
    const bucket = grouped.get(qid)
    if (bucket) bucket.push(it)
    else grouped.set(qid, [it])
  }
  return grouped
}

async function loadLookups(userId: string): Promise<{
  customerById: Map<string, Record<string, unknown>>
  jobIdByQuoteId: Map<string, string>
}> {
  const [customers, jobs] = await Promise.all([
    findMany('customers', { where: [{ field: 'owner_id', operator: '=', value: userId }] }),
    findMany('jobs', { where: [{ field: 'owner_id', operator: '=', value: userId }] }),
  ])
  const jobIdByQuoteId = new Map<string, string>()
  for (const j of jobs as Array<Record<string, unknown>>) {
    const quoteId = typeof j.quote_id === 'string' ? j.quote_id : null
    const id = typeof j.id === 'string' ? j.id : null
    if (quoteId && id && !jobIdByQuoteId.has(quoteId)) jobIdByQuoteId.set(quoteId, id)
  }
  return {
    customerById: asMap(customers as Array<Record<string, unknown>>, 'id'),
    jobIdByQuoteId,
  }
}

/** Replace a quote's line items and recompute total_cents. */
async function replaceItems(
  quoteId: string,
  items: Array<{ description: string; qty: number; unit?: string; rate_cents: number }>,
): Promise<number> {
  const existing = await findMany('quote_items', {
    where: [{ field: 'quote_id', operator: '=', value: quoteId }],
  })
  for (const row of existing) {
    const id = (row as Record<string, unknown>).id
    if (typeof id === 'string') await deleteById('quote_items', id)
  }
  let position = 1
  for (const it of items) {
    await create('quote_items', {
      quote_id: quoteId,
      description: it.description,
      qty: it.qty,
      unit: it.unit ?? 'each',
      rate_cents: it.rate_cents,
      position: position++,
      created_at: new Date().toISOString(),
    })
  }
  return lineTotalCents(items)
}

/** Default checklist installed on the job created when a quote is accepted. */
const ACCEPT_JOB_CHECKLIST = [
  'Confirm scope with the customer on arrival',
  'Complete the quoted work',
  'Cleanup and customer walkthrough',
]

router.use(authorizers.auth())

// List quotes — owner-scoped, optionally by status. Seeds demo data on first
// authenticated call.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)
    const { status, page = '1', limit = '100' } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (status && QUOTE_STATUSES.includes(String(status) as QuoteStatus)) {
      where.push({ field: 'status', operator: '=', value: String(status) })
    }

    const quotes = await findMany('quotes', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const { customerById, jobIdByQuoteId } = await loadLookups(userId)
    const items = await itemsByQuote(quotes.map((q) => String((q as Record<string, unknown>).id)))
    res.json(
      quotes.map((q) =>
        shapeQuote(
          q as Record<string, unknown>,
          customerById,
          items.get(String((q as Record<string, unknown>).id)) ?? [],
          jobIdByQuoteId,
        ),
      ),
    )
  } catch (err) {
    logger.error('[quotes] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get quote details (with line items and linked job) — owner-only.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('quotes', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('quotes.notFound', {}, { defaultValue: 'Quote not found' }),
      })
      return
    }
    const { customerById, jobIdByQuoteId } = await loadLookups(userId)
    const items =
      (await itemsByQuote([req.params.id as string]).then((m) => m.get(req.params.id as string))) ??
      []
    res.json(shapeQuote(check.row as Record<string, unknown>, customerById, items, jobIdByQuoteId))
  } catch (err) {
    logger.error('[quotes] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create quote (with line items) — entitlement-gated by tier.
router.post(
  '/',
  enforceLimit<FieldServiceLimits>({
    limitType: 'maxQuotes',
    getLimit: (limits) => limits.maxQuotes,
    getCurrent: async (userId) =>
      count('quotes', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createQuoteSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const body = req.body as z.infer<typeof createQuoteSchema>
      // Customer must exist and belong to the caller.
      const customerCheck = await requireOwnership('customers', body.customer_id, userId)
      if (!customerCheck.ok) {
        res.status(customerCheck.status).json({
          error: t('quotes.customerNotFound', {}, { defaultValue: 'Customer not found' }),
        })
        return
      }
      const now = new Date().toISOString()
      const items = body.items ?? []
      const result = await create('quotes', {
        owner_id: userId,
        customer_id: body.customer_id,
        title: body.title,
        status: 'draft',
        valid_until: body.valid_until ?? null,
        total_cents: lineTotalCents(items),
        notes: body.notes ?? '',
        created_at: now,
        updated_at: now,
      })
      const quoteId = (result.data as { id?: string } | null)?.id
      if (quoteId && items.length > 0) await replaceItems(quoteId, items)
      const { customerById, jobIdByQuoteId } = await loadLookups(userId)
      const detailItems = quoteId ? ((await itemsByQuote([quoteId])).get(quoteId) ?? []) : []
      res
        .status(201)
        .json(
          shapeQuote(
            result.data as Record<string, unknown>,
            customerById,
            detailItems,
            jobIdByQuoteId,
          ),
        )
    } catch (err) {
      logger.error('[quotes] create failed', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update quote (draft only — sent/accepted/declined quotes are immutable).
router.put('/:id', validateBody(updateQuoteSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('quotes', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('quotes.notFound', {}, { defaultValue: 'Quote not found' }),
      })
      return
    }
    const row = check.row as Record<string, unknown>
    if (row.status !== 'draft') {
      res.status(409).json({
        error: t('quotes.notEditable', {}, { defaultValue: 'Only draft quotes can be edited' }),
      })
      return
    }
    const body = req.body as z.infer<typeof updateQuoteSchema>
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) updates.title = body.title
    if (body.valid_until !== undefined) updates.valid_until = body.valid_until
    if (body.notes !== undefined) updates.notes = body.notes
    if (body.items !== undefined)
      updates.total_cents = await replaceItems(req.params.id as string, body.items)

    const result = await updateById('quotes', req.params.id as string, updates)
    const { customerById, jobIdByQuoteId } = await loadLookups(userId)
    const detailItems =
      (await itemsByQuote([req.params.id as string])).get(req.params.id as string) ?? []
    res.json(
      shapeQuote(result.data as Record<string, unknown>, customerById, detailItems, jobIdByQuoteId),
    )
  } catch (err) {
    logger.error('[quotes] update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Send quote — draft → sent.
router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('quotes', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('quotes.notFound', {}, { defaultValue: 'Quote not found' }),
      })
      return
    }
    const row = check.row as Record<string, unknown>
    if (row.status !== 'draft') {
      res.status(409).json({
        error: t('quotes.sendWrongState', {}, { defaultValue: 'Only draft quotes can be sent' }),
      })
      return
    }
    const now = new Date().toISOString()
    const result = await updateById('quotes', req.params.id as string, {
      status: 'sent',
      sent_at: now,
      updated_at: now,
    })
    const { customerById, jobIdByQuoteId } = await loadLookups(userId)
    const detailItems =
      (await itemsByQuote([req.params.id as string])).get(req.params.id as string) ?? []
    res.json(
      shapeQuote(result.data as Record<string, unknown>, customerById, detailItems, jobIdByQuoteId),
    )
  } catch (err) {
    logger.error('[quotes] send failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Accept quote — sent → accepted, and converts it into a scheduled job with a
// starter checklist copied from the quote line items. The job starts
// unassigned and unscheduled; dispatch it from the Dispatch board.
router.post('/:id/accept', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('quotes', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('quotes.notFound', {}, { defaultValue: 'Quote not found' }),
      })
      return
    }
    const row = check.row as Record<string, unknown>
    if (row.status !== 'sent') {
      res.status(409).json({
        error: t(
          'quotes.acceptWrongState',
          {},
          { defaultValue: 'Only sent quotes can be accepted' },
        ),
      })
      return
    }

    const now = new Date().toISOString()
    const customerId = String(row.customer_id)
    const customerCheck = await requireOwnership('customers', customerId, userId)
    const customer = customerCheck.ok ? (customerCheck.row as Record<string, unknown>) : undefined

    const jobResult = await create('jobs', {
      owner_id: userId,
      customer_id: customerId,
      quote_id: req.params.id as string,
      title: String(row.title),
      description: String(row.notes ?? ''),
      address: customer ? String(customer.address ?? '') : '',
      scheduled_start: null,
      scheduled_end: null,
      status: 'scheduled',
      technician_id: null,
      created_at: now,
      updated_at: now,
    })
    const jobId = (jobResult.data as { id?: string } | null)?.id
    const items = (await itemsByQuote([req.params.id as string])).get(req.params.id as string) ?? []
    const checklist = [
      ...items.map((it) => `${it.qty} × ${it.unit} — ${it.description}`),
      ...ACCEPT_JOB_CHECKLIST,
    ]
    if (jobId) {
      // Distinct created_at per item (1ms apart): the checklist is read back
      // ordered by created_at, and items sharing one timestamp make the
      // order unstable — the list visibly re-sorts after every reload.
      const base = Date.parse(now)
      await Promise.all(
        checklist.map((label, i) =>
          create('job_checklist', {
            job_id: jobId,
            label,
            done: false,
            created_at: new Date(base + i).toISOString(),
          }),
        ),
      )
      await create('job_notes', {
        job_id: jobId,
        author: 'Office',
        body: 'Job created from the accepted quote.',
        created_at: now,
      })
    }

    const result = await updateById('quotes', req.params.id as string, {
      status: 'accepted',
      accepted_at: now,
      updated_at: now,
    })

    const technicians = await findMany('technicians', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const { customerById, jobIdByQuoteId } = await loadLookups(userId)
    const shapedQuote = shapeQuote(
      result.data as Record<string, unknown>,
      customerById,
      items,
      jobIdByQuoteId,
    )
    const shapedJob =
      jobId && jobResult.data
        ? shapeJob(
            jobResult.data as Record<string, unknown>,
            customerById,
            asMap(technicians as Array<Record<string, unknown>>, 'id'),
          )
        : null
    res.json({ quote: shapedQuote, job: shapedJob })
  } catch (err) {
    logger.error('[quotes] accept failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Decline quote — sent → declined.
router.post('/:id/decline', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('quotes', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('quotes.notFound', {}, { defaultValue: 'Quote not found' }),
      })
      return
    }
    const row = check.row as Record<string, unknown>
    if (row.status !== 'sent') {
      res.status(409).json({
        error: t(
          'quotes.declineWrongState',
          {},
          { defaultValue: 'Only sent quotes can be declined' },
        ),
      })
      return
    }
    const now = new Date().toISOString()
    const result = await updateById('quotes', req.params.id as string, {
      status: 'declined',
      declined_at: now,
      updated_at: now,
    })
    const { customerById, jobIdByQuoteId } = await loadLookups(userId)
    const detailItems =
      (await itemsByQuote([req.params.id as string])).get(req.params.id as string) ?? []
    res.json(
      shapeQuote(result.data as Record<string, unknown>, customerById, detailItems, jobIdByQuoteId),
    )
  } catch (err) {
    logger.error('[quotes] decline failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete quote — owner-only. Accepted quotes with a linked job are refused.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('quotes', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('quotes.notFound', {}, { defaultValue: 'Quote not found' }),
      })
      return
    }
    const row = check.row as Record<string, unknown>
    if (row.status === 'accepted') {
      res.status(409).json({
        error: t(
          'quotes.deleteAccepted',
          {},
          { defaultValue: 'Accepted quotes cannot be deleted — cancel the job instead' },
        ),
      })
      return
    }
    const items = await findMany('quote_items', {
      where: [{ field: 'quote_id', operator: '=', value: req.params.id as string }],
    })
    for (const it of items) {
      const id = (it as Record<string, unknown>).id
      if (typeof id === 'string') await deleteById('quote_items', id)
    }
    await deleteById('quotes', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[quotes] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
