import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership, requireParentOwnership } from '../lib/authz.js'
import type { FieldServiceLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'
import { asMap, shapeInvoice, shapeJob } from './_shape.js'

const router = Router()

const JOB_STATUSES = ['scheduled', 'en_route', 'in_progress', 'completed', 'cancelled'] as const
type JobStatus = (typeof JOB_STATUSES)[number]

/** Which status transitions the workflow allows. */
const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  scheduled: ['en_route', 'in_progress', 'cancelled'],
  en_route: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

const createJobSchema = z.object({
  customer_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  address: z.string().max(500).optional(),
  scheduled_start: z.string().datetime().optional().nullable(),
  scheduled_end: z.string().datetime().optional().nullable(),
  technician_id: z.string().uuid().optional().nullable(),
  checklist: z.array(z.string().min(1).max(300)).max(30).optional(),
})

const updateJobSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).optional(),
  address: z.string().max(500).optional(),
  scheduled_start: z.string().datetime().optional().nullable(),
  scheduled_end: z.string().datetime().optional().nullable(),
  technician_id: z.string().uuid().optional().nullable(),
})

const assignSchema = z.object({
  technician_id: z.string().uuid().nullable(),
  scheduled_start: z.string().datetime().optional().nullable(),
  scheduled_end: z.string().datetime().optional().nullable(),
})

const statusSchema = z.object({
  status: z.enum(JOB_STATUSES),
})

const checklistAddSchema = z.object({
  label: z.string().min(1).max(300),
})

const noteAddSchema = z.object({
  body: z.string().min(1).max(4000),
})

/** Local YYYY-MM-DD for an ISO string (server timezone — demo filter only). */
function localDay(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function loadLookups(userId: string): Promise<{
  customerById: Map<string, Record<string, unknown>>
  technicianById: Map<string, Record<string, unknown>>
}> {
  const [customers, technicians] = await Promise.all([
    findMany('customers', { where: [{ field: 'owner_id', operator: '=', value: userId }] }),
    findMany('technicians', { where: [{ field: 'owner_id', operator: '=', value: userId }] }),
  ])
  return {
    customerById: asMap(customers as Array<Record<string, unknown>>, 'id'),
    technicianById: asMap(technicians as Array<Record<string, unknown>>, 'id'),
  }
}

/** Fetch checklist + notes rows for many jobs at once, grouped by job_id. */
async function childrenByJob(jobIds: readonly string[]): Promise<{
  checklistByJob: Map<string, Array<Record<string, unknown>>>
  notesByJob: Map<string, Array<Record<string, unknown>>>
}> {
  const checklistByJob = new Map<string, Array<Record<string, unknown>>>()
  const notesByJob = new Map<string, Array<Record<string, unknown>>>()
  if (jobIds.length === 0) return { checklistByJob, notesByJob }
  const [checklist, notes] = await Promise.all([
    findMany('job_checklist', {
      where: [{ field: 'job_id', operator: 'in', value: [...jobIds] }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    }),
    findMany('job_notes', {
      where: [{ field: 'job_id', operator: 'in', value: [...jobIds] }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    }),
  ])
  for (const c of checklist as Array<Record<string, unknown>>) {
    const jid = typeof c.job_id === 'string' ? c.job_id : ''
    const bucket = checklistByJob.get(jid)
    if (bucket) bucket.push(c)
    else checklistByJob.set(jid, [c])
  }
  for (const n of notes as Array<Record<string, unknown>>) {
    const jid = typeof n.job_id === 'string' ? n.job_id : ''
    const bucket = notesByJob.get(jid)
    if (bucket) bucket.push(n)
    else notesByJob.set(jid, [n])
  }
  return { checklistByJob, notesByJob }
}

router.use(authorizers.auth())

// List jobs — owner-scoped, optional status/day filters. Seeds demo data on
// first authenticated call.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)
    const { status, day, page = '1', limit = '200' } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (status && JOB_STATUSES.includes(String(status) as JobStatus)) {
      where.push({ field: 'status', operator: '=', value: String(status) })
    }

    let jobs = await findMany('jobs', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'scheduled_start', direction: 'asc' }],
    })
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(String(day))) {
      const wanted = String(day)
      jobs = jobs.filter(
        (j) => localDay((j as Record<string, unknown>).scheduled_start as string) === wanted,
      )
    }

    const { customerById, technicianById } = await loadLookups(userId)
    const { checklistByJob, notesByJob } = await childrenByJob(
      jobs.map((j) => String((j as Record<string, unknown>).id)),
    )
    res.json(
      jobs.map((j) => {
        const id = String((j as Record<string, unknown>).id)
        return shapeJob(
          j as Record<string, unknown>,
          customerById,
          technicianById,
          checklistByJob.get(id) ?? [],
          notesByJob.get(id) ?? [],
        )
      }),
    )
  } catch (err) {
    logger.error('[jobs] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get job details (checklist + notes timeline) — owner-only.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('jobs', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('jobs.notFound', {}, { defaultValue: 'Job not found' }),
      })
      return
    }
    const { customerById, technicianById } = await loadLookups(userId)
    const { checklistByJob, notesByJob } = await childrenByJob([req.params.id as string])
    res.json(
      shapeJob(
        check.row as Record<string, unknown>,
        customerById,
        technicianById,
        checklistByJob.get(req.params.id as string) ?? [],
        notesByJob.get(req.params.id as string) ?? [],
      ),
    )
  } catch (err) {
    logger.error('[jobs] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create job directly (with optional starter checklist) — entitlement-gated.
router.post(
  '/',
  enforceLimit<FieldServiceLimits>({
    limitType: 'maxJobs',
    getLimit: (limits) => limits.maxJobs,
    getCurrent: async (userId) =>
      count('jobs', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createJobSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const body = req.body as z.infer<typeof createJobSchema>
      const customerCheck = await requireOwnership('customers', body.customer_id, userId)
      if (!customerCheck.ok) {
        res.status(customerCheck.status).json({
          error: t('jobs.customerNotFound', {}, { defaultValue: 'Customer not found' }),
        })
        return
      }
      const address = body.address ?? String(customerCheck.row.address ?? '')
      const now = new Date().toISOString()
      const result = await create('jobs', {
        owner_id: userId,
        customer_id: body.customer_id,
        quote_id: null,
        title: body.title,
        description: body.description ?? '',
        address,
        scheduled_start: body.scheduled_start ?? null,
        scheduled_end: body.scheduled_end ?? null,
        status: 'scheduled',
        technician_id: body.technician_id ?? null,
        created_at: now,
        updated_at: now,
      })
      const jobId = (result.data as { id?: string } | null)?.id ?? ''
      if (jobId && body.checklist?.length) {
        // Distinct created_at per item (1ms apart) — the checklist is read
        // back ordered by created_at, and one shared timestamp makes the
        // order unstable across reloads.
        const base = Date.parse(now)
        await Promise.all(
          body.checklist.map((label, i) =>
            create('job_checklist', {
              job_id: jobId,
              label,
              done: false,
              created_at: new Date(base + i).toISOString(),
            }),
          ),
        )
      }
      const { customerById, technicianById } = await loadLookups(userId)
      const { checklistByJob, notesByJob } = await childrenByJob([jobId])
      res
        .status(201)
        .json(
          shapeJob(
            result.data as Record<string, unknown>,
            customerById,
            technicianById,
            checklistByJob.get(jobId) ?? [],
            notesByJob.get(jobId) ?? [],
          ),
        )
    } catch (err) {
      logger.error('[jobs] create failed', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update job fields — owner-only. Status changes go through /status.
router.put('/:id', validateBody(updateJobSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('jobs', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('jobs.notFound', {}, { defaultValue: 'Job not found' }),
      })
      return
    }
    const body = req.body as z.infer<typeof updateJobSchema>
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.address !== undefined) updates.address = body.address
    if (body.scheduled_start !== undefined) updates.scheduled_start = body.scheduled_start
    if (body.scheduled_end !== undefined) updates.scheduled_end = body.scheduled_end
    if (body.technician_id !== undefined) updates.technician_id = body.technician_id

    const result = await updateById('jobs', req.params.id as string, updates)
    const { customerById, technicianById } = await loadLookups(userId)
    const { checklistByJob, notesByJob } = await childrenByJob([req.params.id as string])
    res.json(
      shapeJob(
        result.data as Record<string, unknown>,
        customerById,
        technicianById,
        checklistByJob.get(req.params.id as string) ?? [],
        notesByJob.get(req.params.id as string) ?? [],
      ),
    )
  } catch (err) {
    logger.error('[jobs] update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Dispatch action — assign a technician and (optionally) a schedule window.
// Works for unscheduled jobs and for reassignment.
router.post('/:id/assign', validateBody(assignSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('jobs', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('jobs.notFound', {}, { defaultValue: 'Job not found' }),
      })
      return
    }
    const row = check.row as Record<string, unknown>
    if (row.status === 'completed' || row.status === 'cancelled') {
      res.status(409).json({
        error: t(
          'jobs.assignClosed',
          {},
          { defaultValue: 'Completed or cancelled jobs cannot be reassigned' },
        ),
      })
      return
    }
    const body = req.body as z.infer<typeof assignSchema>
    if (body.technician_id) {
      const techCheck = await requireOwnership('technicians', body.technician_id, userId)
      if (!techCheck.ok) {
        res.status(techCheck.status).json({
          error: t('jobs.technicianNotFound', {}, { defaultValue: 'Technician not found' }),
        })
        return
      }
    }
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    updates.technician_id = body.technician_id ?? null
    if (body.scheduled_start !== undefined) updates.scheduled_start = body.scheduled_start
    if (body.scheduled_end !== undefined) updates.scheduled_end = body.scheduled_end

    const result = await updateById('jobs', req.params.id as string, updates)
    const { customerById, technicianById } = await loadLookups(userId)
    const { checklistByJob, notesByJob } = await childrenByJob([req.params.id as string])
    res.json(
      shapeJob(
        result.data as Record<string, unknown>,
        customerById,
        technicianById,
        checklistByJob.get(req.params.id as string) ?? [],
        notesByJob.get(req.params.id as string) ?? [],
      ),
    )
  } catch (err) {
    logger.error('[jobs] assign failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Status transition — validates the workflow graph.
router.post('/:id/status', validateBody(statusSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('jobs', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('jobs.notFound', {}, { defaultValue: 'Job not found' }),
      })
      return
    }
    const row = check.row as Record<string, unknown>
    const current = String(row.status ?? 'scheduled') as JobStatus
    const next = (req.body as z.infer<typeof statusSchema>).status
    if (!ALLOWED_TRANSITIONS[current].includes(next)) {
      res.status(409).json({
        error: t(
          'jobs.invalidTransition',
          { from: current, to: next },
          { defaultValue: 'Cannot move a {{from}} job to {{to}}' },
        ),
      })
      return
    }
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { status: next, updated_at: now }
    if (next === 'completed') updates.completed_at = now
    if (next === 'cancelled') updates.cancelled_at = now

    const result = await updateById('jobs', req.params.id as string, updates)
    const { customerById, technicianById } = await loadLookups(userId)
    const { checklistByJob, notesByJob } = await childrenByJob([req.params.id as string])
    res.json(
      shapeJob(
        result.data as Record<string, unknown>,
        customerById,
        technicianById,
        checklistByJob.get(req.params.id as string) ?? [],
        notesByJob.get(req.params.id as string) ?? [],
      ),
    )
  } catch (err) {
    logger.error('[jobs] status failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Add a checklist item.
router.post(
  '/:id/checklist',
  validateBody(checklistAddSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const check = await requireOwnership('jobs', req.params.id as string, userId)
      if (!check.ok) {
        res.status(check.status).json({
          error: t('jobs.notFound', {}, { defaultValue: 'Job not found' }),
        })
        return
      }
      const body = req.body as z.infer<typeof checklistAddSchema>
      await create('job_checklist', {
        job_id: req.params.id as string,
        label: body.label,
        done: false,
        created_at: new Date().toISOString(),
      })
      res.status(201).json({ ok: true })
    } catch (err) {
      logger.error('[jobs] checklist add failed', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Toggle a checklist item's done flag.
router.post('/:id/checklist/:itemId/toggle', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireParentOwnership(
      'job_checklist',
      req.params.itemId as string,
      'jobs',
      'job_id',
      userId,
    )
    if (!check.ok) {
      res.status(check.status).json({
        error: t('jobs.checklistNotFound', {}, { defaultValue: 'Checklist item not found' }),
      })
      return
    }
    const item = await findById('job_checklist', req.params.itemId as string)
    const done = !(item as Record<string, unknown> | null)?.done
    await updateById('job_checklist', req.params.itemId as string, {
      done,
      done_at: done ? new Date().toISOString() : null,
    })
    res.json({ ok: true, done })
  } catch (err) {
    logger.error('[jobs] checklist toggle failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Remove a checklist item.
router.delete('/:id/checklist/:itemId', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireParentOwnership(
      'job_checklist',
      req.params.itemId as string,
      'jobs',
      'job_id',
      userId,
    )
    if (!check.ok) {
      res.status(check.status).json({
        error: t('jobs.checklistNotFound', {}, { defaultValue: 'Checklist item not found' }),
      })
      return
    }
    await deleteById('job_checklist', req.params.itemId as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[jobs] checklist delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Add a note to the job timeline. Author = the calling user's display name.
router.post('/:id/notes', validateBody(noteAddSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('jobs', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('jobs.notFound', {}, { defaultValue: 'Job not found' }),
      })
      return
    }
    const body = req.body as z.infer<typeof noteAddSchema>
    const me = (await findById('users', userId)) as Record<string, unknown> | null
    const author = typeof me?.name === 'string' && me.name ? me.name : 'Office'
    const now = new Date().toISOString()
    const result = await create('job_notes', {
      job_id: req.params.id as string,
      author,
      body: body.body,
      created_at: now,
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('[jobs] note add failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Generate the draft invoice for a completed job. Line items are copied from
// the linked quote when there is one; otherwise a single placeholder line.
router.post('/:id/invoice', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('jobs', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('jobs.notFound', {}, { defaultValue: 'Job not found' }),
      })
      return
    }
    const row = check.row as Record<string, unknown>
    if (row.status !== 'completed') {
      res.status(409).json({
        error: t(
          'jobs.invoiceNotCompleted',
          {},
          { defaultValue: 'Only completed jobs can be invoiced' },
        ),
      })
      return
    }
    const existing = await findMany('invoices', {
      where: [{ field: 'job_id', operator: '=', value: req.params.id as string }],
    })
    if (existing.length > 0) {
      res.status(409).json({
        error: t('jobs.invoiceExists', {}, { defaultValue: 'This job already has an invoice' }),
      })
      return
    }

    // Line items: quote items when the job came from a quote.
    type ItemRow = { description: string; qty: number; unit: string; rate_cents: number }
    let items: ItemRow[] = []
    if (typeof row.quote_id === 'string' && row.quote_id) {
      const quoteItems = await findMany('quote_items', {
        where: [{ field: 'quote_id', operator: '=', value: row.quote_id }],
        orderBy: [{ field: 'position', direction: 'asc' }],
      })
      items = (quoteItems as Array<Record<string, unknown>>).map((it) => ({
        description: String(it.description ?? ''),
        qty: Number(it.qty ?? 1),
        unit: String(it.unit ?? 'each'),
        rate_cents: Number(it.rate_cents ?? 0),
      }))
    }
    if (items.length === 0) {
      items = [
        {
          description: String(row.title ?? 'Service'),
          qty: 1,
          unit: 'each',
          rate_cents: 0,
        },
      ]
    }
    const totalCents = items.reduce((sum, it) => sum + Math.round(it.qty * it.rate_cents), 0)
    const invoiceCount = await count('invoices', [
      { field: 'owner_id', operator: '=', value: userId },
    ])
    const now = new Date().toISOString()
    const result = await create('invoices', {
      owner_id: userId,
      job_id: req.params.id as string,
      customer_id: String(row.customer_id),
      number: `INV-${1040 + invoiceCount}`,
      status: 'draft',
      total_cents: totalCents,
      issued_at: null,
      sent_at: null,
      paid_at: null,
      notes: '',
      created_at: now,
      updated_at: now,
    })
    const invoiceId = (result.data as { id?: string } | null)?.id
    if (invoiceId) {
      let position = 1
      for (const it of items) {
        await create('invoice_items', {
          invoice_id: invoiceId,
          description: it.description,
          qty: it.qty,
          unit: it.unit,
          rate_cents: it.rate_cents,
          position: position++,
          created_at: now,
        })
      }
    }

    const customers = (await findMany('customers', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })) as Array<Record<string, unknown>>
    const customerById = asMap(customers, 'id')
    const invoiceItems = invoiceId
      ? ((await findMany('invoice_items', {
          where: [{ field: 'invoice_id', operator: '=', value: invoiceId }],
          orderBy: [{ field: 'position', direction: 'asc' }],
        })) as Array<Record<string, unknown>>)
      : []
    const jobTitleById = new Map<string, string>([
      [req.params.id as string, String(row.title ?? '')],
    ])
    res
      .status(201)
      .json(
        shapeInvoice(
          result.data as Record<string, unknown>,
          customerById,
          invoiceItems,
          jobTitleById,
        ),
      )
  } catch (err) {
    logger.error('[jobs] invoice generate failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete job — owner-only.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('jobs', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('jobs.notFound', {}, { defaultValue: 'Job not found' }),
      })
      return
    }
    const { checklistByJob, notesByJob } = await childrenByJob([req.params.id as string])
    for (const c of checklistByJob.get(req.params.id as string) ?? []) {
      if (typeof c.id === 'string') await deleteById('job_checklist', c.id)
    }
    for (const n of notesByJob.get(req.params.id as string) ?? []) {
      if (typeof n.id === 'string') await deleteById('job_notes', n.id)
    }
    await deleteById('jobs', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[jobs] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
