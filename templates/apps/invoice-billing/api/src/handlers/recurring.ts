import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { resolveCurrency } from '../lib/prefs.js'
import type { InvoiceBillingLimits } from '../tiers.js'
import { ensureDemoSeeded } from './_seed.js'

const router = Router()

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
})

const cadenceEnum = z.enum(['weekly', 'monthly', 'quarterly', 'yearly'])

const createRecurringSchema = z.object({
  client_id: z.string().min(1),
  items: z.array(lineItemSchema).min(1),
  frequency: cadenceEnum.optional(),
  cadence: cadenceEnum.optional(),
  start_date: z.string().optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  label: z.string().optional(),
  currency: z.string().min(3).max(8).optional(),
})

const updateRecurringSchema = z.object({
  items: z.array(lineItemSchema).optional(),
  frequency: cadenceEnum.optional(),
  cadence: cadenceEnum.optional(),
  start_date: z.string().optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
  is_active: z.boolean().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    await ensureDemoSeeded(userId)

    const recurring = await findMany('recurring_invoices', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'next_run_at', direction: 'asc' }],
    })
    res.json(recurring)
  } catch (error) {
    logger.error('recurring.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/',
  enforceLimit<InvoiceBillingLimits>({
    limitType: 'maxRecurring',
    getLimit: (limits) => limits.maxRecurring,
    getCurrent: async (userId) =>
      count('recurring_invoices', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createRecurringSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({ error: t('auth.unauthorized') })
      }

      const { client_id, items, frequency, cadence, start_date, tax_rate, notes, label, currency } =
        req.body as {
          client_id: string
          items: Array<{ quantity: number; unit_price: number; description: string }>
          frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          cadence?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          start_date?: string
          tax_rate?: number
          notes?: string
          label?: string
          currency?: string
        }

      const startDate = start_date ? new Date(start_date) : new Date()
      const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
      const rate = tax_rate ?? 0
      const total = subtotal * (1 + rate / 100)
      const effectiveCadence = cadence ?? frequency ?? 'monthly'

      const result = await create('recurring_invoices', {
        user_id: userId,
        client_id,
        items: JSON.stringify(items),
        amount: total,
        // Honor the saved default currency when the client omits one (was hardcoded 'USD').
        currency: currency || (await resolveCurrency(userId)),
        cadence: effectiveCadence,
        frequency: effectiveCadence,
        start_date: startDate,
        next_run_at: startDate,
        next_date: startDate,
        tax_rate: rate,
        notes: notes ?? null,
        label: label ?? null,
        active: true,
        is_active: true,
        created_at: new Date(),
      })

      res.status(201).json(result.data)
    } catch (error) {
      logger.error('recurring.create', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put('/:id', validateBody(updateRecurringSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('recurring_invoices', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('recurring.notFound') })
    }

    const { items, frequency, cadence, start_date, tax_rate, notes, active, is_active } =
      req.body as {
        items?: Array<{ quantity: number; unit_price: number; description: string }>
        frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
        cadence?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
        start_date?: string
        tax_rate?: number
        notes?: string
        active?: boolean
        is_active?: boolean
      }
    const updates: Record<string, unknown> = {}
    if (items !== undefined) updates.items = JSON.stringify(items)
    if (frequency !== undefined) {
      updates.frequency = frequency
      updates.cadence = frequency
    }
    if (cadence !== undefined) {
      updates.cadence = cadence
      updates.frequency = cadence
    }
    if (start_date !== undefined) {
      const sd = new Date(start_date)
      updates.start_date = sd
      updates.next_run_at = sd
      updates.next_date = sd
    }
    if (tax_rate !== undefined) updates.tax_rate = tax_rate
    if (notes !== undefined) updates.notes = notes
    if (active !== undefined) {
      updates.active = active
      updates.is_active = active
    }
    if (is_active !== undefined) {
      updates.is_active = is_active
      updates.active = is_active
    }

    const result = await updateById('recurring_invoices', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('recurring.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('recurring_invoices', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('recurring.notFound') })
    }

    const next = !(existing.active ?? existing.is_active)
    const result = await updateById('recurring_invoices', id, {
      active: next,
      is_active: next,
    })
    res.json(result.data)
  } catch (error) {
    logger.error('recurring.toggle', error)
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
    const existing = await findById<Record<string, unknown>>('recurring_invoices', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('recurring.notFound') })
    }

    await deleteById('recurring_invoices', id)
    res.status(204).end()
  } catch (error) {
    logger.error('recurring.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
