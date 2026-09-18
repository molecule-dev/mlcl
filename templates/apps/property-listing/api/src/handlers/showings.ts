/**
 * Showings handler — agent-scoped property tour scheduling.
 *
 * Read / mutate are scoped by `agent_id == userId` (v1 collapses agent
 * and user identity, same as `leads.ts`). Public POST is intentionally
 * NOT exposed — the lead-capture form creates a `lead`; the agent then
 * schedules a showing from `/admin/showings`.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const showingStatusEnum = z.enum(['scheduled', 'completed', 'canceled', 'no_show'])

const createShowingSchema = z.object({
  property_id: z.string().min(1),
  lead_id: z.string().nullable().optional(),
  scheduled_at: z.string().datetime(),
  duration_min: z.number().int().min(5).max(480).optional().default(30),
  notes: z.string().max(2000).optional(),
})

const updateShowingSchema = z.object({
  scheduled_at: z.string().datetime().optional(),
  duration_min: z.number().int().min(5).max(480).optional(),
  status: showingStatusEnum.optional(),
  notes: z.string().max(2000).optional(),
})

const listShowingsQuery = z.object({
  status: showingStatusEnum.optional(),
  property_id: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
})

// ---------------------------------------------------------------------------
// POST / — Agent-only: schedule a showing.
// ---------------------------------------------------------------------------

router.post('/', validateBody(createShowingSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const data = req.body as z.infer<typeof createShowingSchema>
    const result = await create('showings', {
      ...data,
      agent_id: userId,
      lead_id: data.lead_id ?? null,
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('showings.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// GET / — Agent-only: list MY showings.
// ---------------------------------------------------------------------------

router.get('/', validateQuery(listShowingsQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { status, property_id, page, limit } = req.query as unknown as z.infer<
      typeof listShowingsQuery
    >
    const where: WhereCondition[] = [{ field: 'agent_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (property_id) where.push({ field: 'property_id', operator: '=', value: property_id })
    const showings = await findMany('showings', {
      where,
      orderBy: [{ field: 'scheduled_at', direction: 'asc' }],
      limit,
      offset: (page - 1) * limit,
    })
    const total = await count('showings', where)
    res.json({ data: showings, total, page })
  } catch (error) {
    logger.error('showings.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// GET /:id — Agent-only: read MY showing.
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const showing = await findById<Record<string, unknown>>('showings', req.params.id as string)
    if (!showing) {
      return res
        .status(404)
        .json({ error: t('showing.notFound', {}, { defaultValue: 'Showing not found' }) })
    }
    if (showing.agent_id !== userId) {
      return res
        .status(404)
        .json({ error: t('showing.notFound', {}, { defaultValue: 'Showing not found' }) })
    }
    res.json(showing)
  } catch (error) {
    logger.error('showings.getById', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// PUT /:id — Agent-only: reschedule / mark completed.
// ---------------------------------------------------------------------------

router.put('/:id', validateBody(updateShowingSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('showings', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('showing.notFound', {}, { defaultValue: 'Showing not found' }) })
    }
    if (existing.agent_id !== userId) {
      return res
        .status(404)
        .json({ error: t('showing.notFound', {}, { defaultValue: 'Showing not found' }) })
    }
    const result = await updateById('showings', id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('showings.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// DELETE /:id — Agent-only: cancel a showing.
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('showings', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('showing.notFound', {}, { defaultValue: 'Showing not found' }) })
    }
    if (existing.agent_id !== userId) {
      return res
        .status(404)
        .json({ error: t('showing.notFound', {}, { defaultValue: 'Showing not found' }) })
    }
    await deleteById('showings', id)
    res.status(204).send()
  } catch (error) {
    logger.error('showings.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
