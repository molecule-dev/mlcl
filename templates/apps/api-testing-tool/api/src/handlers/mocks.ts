/**
 * mocks handler — user-defined mock-server fixture rows.
 *
 * Mocks are owner-scoped for mutation; if `is_public = true` and a
 * `public_token` is set, the mock can be hit anonymously via the public
 * route exposed by `routes/public-mocks.ts` (registered separately).
 *
 * @module
 */
import { randomUUID } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

function asJson(value: unknown): string {
  if (value == null) return '{}'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

const createMockSchema = z.object({
  name: z.string().min(1).max(255),
  path_pattern: z.string().min(1).max(2048),
  method: z.string().min(1).max(16).optional(),
  response_status: z.number().int().min(100).max(599).optional(),
  response_headers: z.record(z.string(), z.string()).optional(),
  response_body: z.string().optional(),
  latency_ms: z.number().int().min(0).max(60_000).optional(),
  is_public: z.boolean().optional(),
})

const updateMockSchema = createMockSchema.partial()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const rows = await findMany('mocks', { where, orderBy })
    res.json(rows)
  } catch (error) {
    logger.error('mocks.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const row = await findById<Record<string, unknown>>('mocks', getParamId(req))
    if (!row || row.user_id !== userId) {
      return res.status(404).json({ error: t('mocks.notFound') })
    }
    res.json(row)
  } catch (error) {
    logger.error('mocks.getById', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createMockSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const result = await create('mocks', {
      user_id: userId,
      name: req.body.name,
      path_pattern: req.body.path_pattern,
      method: (req.body.method ?? 'GET').toUpperCase(),
      response_status: req.body.response_status ?? 200,
      response_headers: asJson(req.body.response_headers),
      response_body: req.body.response_body ?? '',
      latency_ms: req.body.latency_ms ?? 0,
      is_public: req.body.is_public ?? false,
      public_token: req.body.is_public ? randomUUID() : null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json((result as { data?: unknown }).data ?? result)
  } catch (error) {
    logger.error('mocks.create', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/:id', validateBody(updateMockSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('mocks', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('mocks.notFound') })
    }
    const updates: Record<string, unknown> = { updated_at: new Date() }
    for (const key of Object.keys(req.body)) {
      if (key === 'response_headers' && req.body[key] !== undefined) {
        updates[key] = asJson(req.body[key])
      } else if (key === 'method' && typeof req.body.method === 'string') {
        updates.method = req.body.method.toUpperCase()
      } else if (req.body[key] !== undefined) {
        updates[key] = req.body[key]
      }
    }
    if (req.body.is_public === true && !existing.public_token) {
      updates.public_token = randomUUID()
    }
    const result = await updateById('mocks', id, updates)
    res.json((result as { data?: unknown }).data ?? result)
  } catch (error) {
    logger.error('mocks.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('mocks', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('mocks.notFound') })
    }
    await deleteById('mocks', id)
    res.status(204).end()
  } catch (error) {
    logger.error('mocks.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
