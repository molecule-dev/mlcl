/**
 * feature-flag-manager — segment CRUD.
 *
 * Segments are reusable predicate sets ("beta-users", "enterprise-US")
 * that can be referenced from a flag's targeting rules. Stored as JSONB
 * so callers can express arbitrary attribute / operator / value chains.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

type SessionLocals = { session?: { userId?: string; userEmail?: string } }
const getUserEmail = (res: Response): string | null =>
  (res.locals as SessionLocals).session?.userEmail ?? null

async function recordSegmentAudit(
  userId: string,
  email: string | null,
  action: string,
  segmentKey: string,
  message: string,
): Promise<void> {
  try {
    await create('audit_log', {
      user_id: userId,
      action,
      actor: userId,
      actor_email: email,
      target: segmentKey,
      flag_id: null,
      message,
      metadata: JSON.stringify({}),
      occurred_at: new Date(),
      created_at: new Date(),
    })
  } catch (_error) {
    // non-fatal — audit write failures must not block the user-facing operation
  }
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  project_id: z.string().uuid().optional(),
})

const createSchema = z.object({
  project_id: z.string().uuid().optional(),
  key: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  conditions: z.array(z.unknown()).optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  conditions: z.array(z.unknown()).optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const q = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (q.project_id) where.push({ field: 'project_id', operator: '=', value: q.project_id })
    const orderBy: OrderBy[] = [{ field: 'name', direction: 'asc' }]
    const segments = await findMany('segments', {
      where,
      orderBy,
      limit: q.limit,
      offset: (q.page - 1) * q.limit,
    })
    res.json(segments)
  } catch (error) {
    logger.error('segments.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function resolveSegment(
  userId: string,
  idOrKey: string,
): Promise<Record<string, unknown> | null> {
  if (UUID_RE.test(idOrKey)) {
    const seg = await findById<Record<string, unknown>>('segments', idOrKey)
    if (seg && seg.user_id === userId) return seg
    return null
  }
  const matches = await findMany<Record<string, unknown>>('segments', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'key', operator: '=', value: idOrKey },
    ],
    limit: 1,
  })
  return matches[0] ?? null
}

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const idOrKey = getParamId(req)
    const segment = await resolveSegment(userId, idOrKey)
    if (!segment) {
      res
        .status(404)
        .json({ error: t('segments.notFound', {}, { defaultValue: 'Segment not found' }) })
      return
    }
    res.json(segment)
  } catch (error) {
    logger.error('segments.getById', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const body = req.body as z.infer<typeof createSchema>
    const email = getUserEmail(res)
    const result = await create('segments', {
      user_id: userId,
      project_id: body.project_id ?? null,
      key: body.key,
      name: body.name,
      description: body.description ?? '',
      conditions: JSON.stringify(body.conditions ?? []),
      created_at: new Date(),
      updated_at: new Date(),
    })
    await recordSegmentAudit(userId, email, 'created', body.key, `created segment ${body.key}`)
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('segments.create', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const id = getParamId(req)
    const segment = await findById<Record<string, unknown>>('segments', id)
    if (!segment || segment.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('segments.notFound', {}, { defaultValue: 'Segment not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateSchema>
    const email = getUserEmail(res)
    const update: Record<string, unknown> = { updated_at: new Date() }
    if (body.name !== undefined) update.name = body.name
    if (body.description !== undefined) update.description = body.description
    if (body.conditions !== undefined) update.conditions = JSON.stringify(body.conditions)
    const result = await updateById('segments', id, update)
    const segKey = typeof segment.key === 'string' ? segment.key : ''
    const isTargetingChange = body.conditions !== undefined
    await recordSegmentAudit(
      userId,
      email,
      isTargetingChange ? 'targeting_changed' : 'updated',
      segKey,
      isTargetingChange ? `updated segment rules` : `updated segment`,
    )
    res.json(result.data)
  } catch (error) {
    logger.error('segments.update', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const id = getParamId(req)
    const segment = await findById<Record<string, unknown>>('segments', id)
    if (!segment || segment.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('segments.notFound', {}, { defaultValue: 'Segment not found' }) })
      return
    }
    const email = getUserEmail(res)
    const segKey = typeof segment.key === 'string' ? segment.key : ''
    await deleteById('segments', id)
    await recordSegmentAudit(userId, email, 'deleted', segKey, `deleted segment ${segKey}`)
    res.status(204).end()
  } catch (error) {
    logger.error('segments.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
