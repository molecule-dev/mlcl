/**
 * Review handlers — quarterly performance reviews.
 *
 * The reviewer (= owner_id of the row) writes; the employee can read once
 * the review is submitted (status != draft). v1 keeps it simple: 1 reviewer
 * per employee per period.
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
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const reviewCreateSchema = z.object({
  period_id: z.string().uuid().nullable().optional(),
  employee_user_id: z.string().uuid(),
  reviewer_user_id: z.string().uuid().optional(),
  summary: z.string().max(50_000).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  status: z.enum(['draft', 'in_progress', 'completed']).optional(),
})

const reviewUpdateSchema = reviewCreateSchema
  .partial()
  .extend({ submitted_at: z.string().nullable().optional() })

const idParam = z.object({ id: z.string().uuid() })

interface ReviewRow {
  id: string
  owner_id: string
  period_id: string | null
  employee_user_id: string
  reviewer_user_id: string
  summary: string | null
  rating: number | null
  status: string
  submitted_at: string | null
  created_at: string
  updated_at: string
}

router.get('/', async (_req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  try {
    // List reviews where caller is either owner (reviewer) OR a non-draft
    // review where caller is the employee. Pull both then merge.
    const own = await findMany<ReviewRow>('reviews', {
      where: [{ field: 'owner_id', operator: '=', value: owner }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    const visible = await findMany<ReviewRow>('reviews', {
      where: [
        { field: 'employee_user_id', operator: '=', value: owner },
        { field: 'status', operator: '!=', value: 'draft' },
      ],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    const seen = new Set(own.map((r) => r.id))
    res.json([...own, ...visible.filter((r) => !seen.has(r.id))])
  } catch (error) {
    logger.error('reviews.list', error)
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
    const where: WhereCondition[] = [{ field: 'id', operator: '=', value: id.data.id }]
    const item = await findOne<ReviewRow>('reviews', where)
    if (!item) {
      res
        .status(404)
        .json({ error: t('review.notFound', {}, { defaultValue: 'Review not found' }) })
      return
    }
    const isOwner = item.owner_id === owner
    const isReviewer = item.reviewer_user_id === owner
    const isEmployeeReadable = item.employee_user_id === owner && item.status !== 'draft'
    if (!isOwner && !isReviewer && !isEmployeeReadable) {
      res.status(403).json({
        error: t('review.forbidden', {}, { defaultValue: 'You cannot read this review' }),
      })
      return
    }
    res.json(item)
  } catch (error) {
    logger.error('reviews.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const parsed = reviewCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const result = await create<ReviewRow>('reviews', {
      owner_id: owner,
      period_id: parsed.data.period_id ?? null,
      employee_user_id: parsed.data.employee_user_id,
      reviewer_user_id: parsed.data.reviewer_user_id ?? owner,
      summary: parsed.data.summary ?? null,
      rating: parsed.data.rating ?? null,
      status: parsed.data.status ?? 'draft',
      submitted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    if (!result.data) {
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
      return
    }
    const reviewRow = result.data

    try {
      if (parsed.data.employee_user_id !== owner) {
        await create('notifications', {
          user_id: parsed.data.employee_user_id,
          type: 'review_open',
          title: 'A performance review was opened for you',
          body: parsed.data.summary ?? null,
          data: { review_id: reviewRow.id },
          read_at: null,
          created_at: new Date(),
        })
      }
    } catch (_error) {
      // Best-effort; never block the review create on notification fanout.
    }

    res.status(201).json(reviewRow)
  } catch (error) {
    logger.error('reviews.create', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const id = idParam.safeParse(req.params)
  const body = reviewUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, !id.success ? id.error.issues : body.success ? [] : body.error.issues)
    return
  }
  try {
    const existing = await findOne<ReviewRow>('reviews', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: owner },
    ])
    if (!existing) {
      res
        .status(404)
        .json({ error: t('review.notFound', {}, { defaultValue: 'Review not found' }) })
      return
    }
    const updates: Record<string, unknown> = { ...body.data, updated_at: new Date() }
    if (body.data.status === 'completed' && !existing.submitted_at) {
      updates.submitted_at = new Date()
    }
    const result = await updateById<ReviewRow>('reviews', id.data.id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('reviews.update', error)
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
    const existing = await findOne<ReviewRow>('reviews', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: owner },
    ])
    if (!existing) {
      res
        .status(404)
        .json({ error: t('review.notFound', {}, { defaultValue: 'Review not found' }) })
      return
    }
    await deleteById('reviews', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('reviews.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
