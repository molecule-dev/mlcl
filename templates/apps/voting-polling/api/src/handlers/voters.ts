/**
 * Voters handler — eligibility roll for the signed-in user's organization.
 *
 * Backed by the `voters` table (migration 0010). Owner-scoped by user_id.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoOnSignup } from './_seed.js'

const router = Router()

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(200),
  q: z.string().trim().min(1).optional(),
})

const createSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(320),
  organization: z.string().trim().max(255).optional().nullable(),
  role: z.string().trim().max(255).optional().nullable(),
})

const updateSchema = createSchema.partial()

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    // Best-effort: seed the demo eligibility roll (4 voters) + starter
    // content on first GET so a fresh signup landing directly on /voters
    // sees a populated table without first having to hit /polls. Idempotent
    // on user_id, so repeat calls neither duplicate nor re-create voters.
    await seedDemoOnSignup(userId)

    const { page, limit, q } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (q) where.push({ field: 'email', operator: 'ilike', value: `%${q}%` })
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const items = await findMany('voters', {
      where,
      orderBy,
      limit,
      offset: (page - 1) * limit,
    })
    const total = await count('voters', where)
    res.json({ data: items, total })
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createSchema>
    const result = await create('voters', {
      user_id: userId,
      name: body.name,
      email: body.email,
      organization: body.organization ?? null,
      role: body.role ?? null,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const item = await findById<Record<string, unknown>>('voters', id)
    if (!item || item.user_id !== userId) {
      res.status(404).json({ error: t('voters.notFound', {}, { defaultValue: 'Voter not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateSchema>
    const result = await updateById('voters', id, { ...body })
    res.json(result.data)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const item = await findById<Record<string, unknown>>('voters', id)
    if (!item || item.user_id !== userId) {
      res.status(404).json({ error: t('voters.notFound', {}, { defaultValue: 'Voter not found' }) })
      return
    }
    await deleteById('voters', id)
    res.status(204).end()
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
