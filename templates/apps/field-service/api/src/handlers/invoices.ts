import { type Request, type Response, Router } from 'express'

import type { WhereCondition } from '@molecule/api-database'
import { deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership } from '../lib/authz.js'
import { seedDemoForUser } from './_seed.js'
import { asMap, shapeInvoice } from './_shape.js'

const router = Router()

const INVOICE_STATUSES = ['draft', 'sent', 'paid'] as const
type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

/** Fetch items for many invoices at once, grouped by invoice_id. */
async function itemsByInvoice(
  invoiceIds: readonly string[],
): Promise<Map<string, Array<Record<string, unknown>>>> {
  const grouped = new Map<string, Array<Record<string, unknown>>>()
  if (invoiceIds.length === 0) return grouped
  const items = await findMany('invoice_items', {
    where: [{ field: 'invoice_id', operator: 'in', value: [...invoiceIds] }],
    orderBy: [{ field: 'position', direction: 'asc' }],
  })
  for (const it of items as Array<Record<string, unknown>>) {
    const iid = typeof it.invoice_id === 'string' ? it.invoice_id : ''
    const bucket = grouped.get(iid)
    if (bucket) bucket.push(it)
    else grouped.set(iid, [it])
  }
  return grouped
}

router.use(authorizers.auth())

// List invoices — owner-scoped, optional status filter. Seeds demo data on
// first authenticated call.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)
    const { status, page = '1', limit = '100' } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (status && INVOICE_STATUSES.includes(String(status) as InvoiceStatus)) {
      where.push({ field: 'status', operator: '=', value: String(status) })
    }

    const invoices = await findMany('invoices', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const [customers, jobs] = await Promise.all([
      findMany('customers', { where: [{ field: 'owner_id', operator: '=', value: userId }] }),
      findMany('jobs', { where: [{ field: 'owner_id', operator: '=', value: userId }] }),
    ])
    const customerById = asMap(customers as Array<Record<string, unknown>>, 'id')
    const jobTitleById = new Map<string, string>()
    for (const j of jobs as Array<Record<string, unknown>>) {
      if (typeof j.id === 'string') jobTitleById.set(j.id, String(j.title ?? ''))
    }
    const items = await itemsByInvoice(
      invoices.map((i) => String((i as Record<string, unknown>).id)),
    )
    res.json(
      invoices.map((i) => {
        const id = String((i as Record<string, unknown>).id)
        return shapeInvoice(
          i as Record<string, unknown>,
          customerById,
          items.get(id) ?? [],
          jobTitleById,
        )
      }),
    )
  } catch (err) {
    logger.error('[invoices] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get invoice details (with line items) — owner-only.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('invoices', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('invoices.notFound', {}, { defaultValue: 'Invoice not found' }),
      })
      return
    }
    const [customers, jobs] = await Promise.all([
      findMany('customers', { where: [{ field: 'owner_id', operator: '=', value: userId }] }),
      findMany('jobs', { where: [{ field: 'owner_id', operator: '=', value: userId }] }),
    ])
    const customerById = asMap(customers as Array<Record<string, unknown>>, 'id')
    const jobTitleById = new Map<string, string>()
    for (const j of jobs as Array<Record<string, unknown>>) {
      if (typeof j.id === 'string') jobTitleById.set(j.id, String(j.title ?? ''))
    }
    const items =
      (await itemsByInvoice([req.params.id as string])).get(req.params.id as string) ?? []
    res.json(shapeInvoice(check.row as Record<string, unknown>, customerById, items, jobTitleById))
  } catch (err) {
    logger.error('[invoices] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Send invoice — draft → sent. Status is data only; no payment processing.
router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('invoices', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('invoices.notFound', {}, { defaultValue: 'Invoice not found' }),
      })
      return
    }
    const row = check.row as Record<string, unknown>
    if (row.status !== 'draft') {
      res.status(409).json({
        error: t(
          'invoices.sendWrongState',
          {},
          { defaultValue: 'Only draft invoices can be sent' },
        ),
      })
      return
    }
    const now = new Date().toISOString()
    const result = await updateById('invoices', req.params.id as string, {
      status: 'sent',
      issued_at: now,
      sent_at: now,
      updated_at: now,
    })
    const customers = (await findMany('customers', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })) as Array<Record<string, unknown>>
    const items =
      (await itemsByInvoice([req.params.id as string])).get(req.params.id as string) ?? []
    res.json(shapeInvoice(result.data as Record<string, unknown>, asMap(customers, 'id'), items))
  } catch (err) {
    logger.error('[invoices] send failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Mark invoice paid — sent → paid. Status is data only; no payment processing.
router.post('/:id/pay', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('invoices', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('invoices.notFound', {}, { defaultValue: 'Invoice not found' }),
      })
      return
    }
    const row = check.row as Record<string, unknown>
    if (row.status !== 'sent') {
      res.status(409).json({
        error: t('invoices.payWrongState', {}, { defaultValue: 'Only sent invoices can be paid' }),
      })
      return
    }
    const now = new Date().toISOString()
    const result = await updateById('invoices', req.params.id as string, {
      status: 'paid',
      paid_at: now,
      updated_at: now,
    })
    const customers = (await findMany('customers', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })) as Array<Record<string, unknown>>
    const items =
      (await itemsByInvoice([req.params.id as string])).get(req.params.id as string) ?? []
    res.json(shapeInvoice(result.data as Record<string, unknown>, asMap(customers, 'id'), items))
  } catch (err) {
    logger.error('[invoices] pay failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete invoice — owner-only, draft only (sent/paid are financial records).
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('invoices', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('invoices.notFound', {}, { defaultValue: 'Invoice not found' }),
      })
      return
    }
    const row = check.row as Record<string, unknown>
    if (row.status !== 'draft') {
      res.status(409).json({
        error: t('invoices.deleteSent', {}, { defaultValue: 'Only draft invoices can be deleted' }),
      })
      return
    }
    const items = await findMany('invoice_items', {
      where: [{ field: 'invoice_id', operator: '=', value: req.params.id as string }],
    })
    for (const it of items) {
      const id = (it as Record<string, unknown>).id
      if (typeof id === 'string') await deleteById('invoice_items', id)
    }
    await deleteById('invoices', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[invoices] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
