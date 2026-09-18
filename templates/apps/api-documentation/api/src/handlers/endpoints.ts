import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { requireAdmin } from '../middleware/require-admin.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

const createEndpointSchema = z.object({
  spec_id: z.string().min(1),
  method: z.string().min(1),
  path: z.string().min(1),
  tag: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  parameters: z.array(z.unknown()).optional(),
  responses: z.unknown().optional(),
  samples: z.unknown().optional(),
  deprecated: z.boolean().optional(),
  resource: z.string().optional(),
})

const updateEndpointSchema = createEndpointSchema.partial()

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    // Seed demo content (one spec + ~14 endpoints + welcome notifications)
    // on the first /api/endpoints request after signup so the user lands
    // on /docs and /docs/endpoints with realistic content immediately.
    // Idempotent on user_id; cheap to re-check.
    try {
      await seedDemoForUser(userId)
    } catch (error) {
      logger.error(error)
    }
    const specId = req.query.spec_id as string | undefined
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (specId) where.push({ field: 'spec_id', operator: '=', value: specId })
    const orderBy: OrderBy[] = [{ field: 'path', direction: 'asc' }]
    const rows = await findMany('api_endpoints', { where, orderBy })
    res.json(rows)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const row = await findById<Record<string, unknown>>('api_endpoints', getParamId(req))
    if (!row || row.user_id !== userId) {
      return res.status(404).json({ error: t('endpoints.notFound') })
    }
    res.json(row)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/',
  requireAdmin,
  validateBody(createEndpointSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
      const { parameters, responses, samples, ...rest } = req.body
      const result = await create('api_endpoints', {
        ...rest,
        user_id: userId,
        parameters: JSON.stringify(parameters ?? []),
        responses: JSON.stringify(responses ?? {}),
        samples: JSON.stringify(samples ?? {}),
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json((result as { data?: unknown }).data ?? result)
    } catch (error) {
      logger.error(error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put(
  '/:id',
  requireAdmin,
  validateBody(updateEndpointSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
      const id = getParamId(req)
      const existing = await findById<Record<string, unknown>>('api_endpoints', id)
      if (!existing || existing.user_id !== userId) {
        return res.status(404).json({ error: t('endpoints.notFound') })
      }
      const { parameters, responses, samples, ...rest } = req.body
      const updates: Record<string, unknown> = { ...rest, updated_at: new Date() }
      if (parameters !== undefined) updates.parameters = JSON.stringify(parameters)
      if (responses !== undefined) updates.responses = JSON.stringify(responses)
      if (samples !== undefined) updates.samples = JSON.stringify(samples)
      const result = await updateById('api_endpoints', id, updates)
      res.json((result as { data?: unknown }).data ?? result)
    } catch (error) {
      logger.error(error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('api_endpoints', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('endpoints.notFound') })
    }
    await deleteById('api_endpoints', id)
    res.status(204).end()
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
