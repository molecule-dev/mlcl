/**
 * Period handlers — owner-scoped CRUD for OKR cycles (e.g. "Q2 2026").
 *
 * Includes a rollover endpoint that closes the active period, archives
 * any non-completed objectives in it, and (optionally) creates a new
 * period spanning the next interval. Replaces the cron-based v2 flow
 * for v1 (no @molecule/api-cron in template — manual trigger only).
 *
 * Uses the abstract DataStore from @molecule/api-database (no raw SQL).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser, validationError } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findMany,
  findOne,
  updateById,
  updateMany,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const periodCreateSchema = z.object({
  name: z.string().min(1).max(64),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  is_active: z.boolean().optional(),
})

const periodUpdateSchema = periodCreateSchema.partial()

const idParam = z.object({ id: z.string().uuid() })

interface PeriodRow {
  id: string
  owner_id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

router.get('/', async (_req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  try {
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: owner }]
    const items = await findMany<PeriodRow>('periods', {
      where,
      orderBy: [{ field: 'start_date', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('periods.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const item = await findOne<PeriodRow>('periods', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: owner },
    ])
    if (!item) {
      res
        .status(404)
        .json({ error: t('period.notFound', {}, { defaultValue: 'Period not found' }) })
      return
    }
    res.json(item)
  } catch (error) {
    logger.error('periods.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const parsed = periodCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const result = await create<PeriodRow>('periods', {
      owner_id: owner,
      name: parsed.data.name,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      is_active: parsed.data.is_active ?? true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('periods.create', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const id = idParam.safeParse(req.params)
  const body = periodUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, !id.success ? id.error.issues : body.success ? [] : body.error.issues)
    return
  }
  try {
    const existing = await findOne<PeriodRow>('periods', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: owner },
    ])
    if (!existing) {
      res
        .status(404)
        .json({ error: t('period.notFound', {}, { defaultValue: 'Period not found' }) })
      return
    }
    const result = await updateById<PeriodRow>('periods', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('periods.update', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/rollover', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const existing = await findOne<PeriodRow>('periods', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: owner },
    ])
    if (!existing) {
      res
        .status(404)
        .json({ error: t('period.notFound', {}, { defaultValue: 'Period not found' }) })
      return
    }
    await updateById('periods', id.data.id, { is_active: false, updated_at: new Date() })
    await updateMany(
      'objectives',
      [
        { field: 'owner_id', operator: '=', value: owner },
        { field: 'period_id', operator: '=', value: id.data.id },
        { field: 'status', operator: '!=', value: 'completed' },
      ],
      { status: 'archived', archived_at: new Date(), updated_at: new Date() },
    )
    res.json({ rolledOver: true, periodId: id.data.id })
  } catch (error) {
    logger.error('periods.rollover', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const existing = await findOne<PeriodRow>('periods', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: owner },
    ])
    if (!existing) {
      res
        .status(404)
        .json({ error: t('period.notFound', {}, { defaultValue: 'Period not found' }) })
      return
    }
    await deleteById('periods', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('periods.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
