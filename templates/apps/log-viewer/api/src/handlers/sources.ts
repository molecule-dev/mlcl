/**
 * log-viewer — log_sources CRUD.
 *
 * Each handler:
 *   - Authenticates the request via the user-resource verifyMiddleware.
 *   - Resolves session.userId from res.locals (the molecule auth contract).
 *   - Scopes every read/write by user_id (no IDOR).
 *   - Validates request bodies/queries with zod via @molecule/api-middleware-validation.
 *   - Routes through the abstract DataStore (no raw SQL here).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  type OrderBy,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { getEffectiveTier } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { LogViewerLimits } from '../tiers.js'

const router = Router()

const createSourceSchema = z.object({
  name: z.string().min(1).max(255),
  format: z.string().min(1).max(64).optional(),
  source: z.string().max(255).optional(),
  type: z.string().min(1).max(64).optional(),
  environment: z.string().min(1).max(64).optional(),
  retention_days: z.number().int().min(1).max(3650).optional(),
})

const updateSourceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  format: z.string().min(1).max(64).optional(),
  source: z.string().max(255).optional(),
  type: z.string().min(1).max(64).optional(),
  environment: z.string().min(1).max(64).optional(),
  retention_days: z.number().int().min(1).max(3650).optional(),
  is_active: z.boolean().optional(),
  status: z.string().min(1).max(64).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'name', direction: 'asc' }]
    const sources = await findMany('log_sources', { where, orderBy })
    res.json(sources)
  } catch (error) {
    logger.error('sources.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const id = getParamId(req)
    const source = await findById<Record<string, unknown>>('log_sources', id)
    if (!source || source.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('sources.notFound', {}, { defaultValue: 'Log source not found' }) })
      return
    }
    res.json(source)
  } catch (error) {
    logger.error('sources.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createSourceSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const body = req.body as z.infer<typeof createSourceSchema>
    // Enforce the per-tier source cap (tiers.ts maxSources). The sibling POST /streams enforces it,
    // but this create path (both write log_sources) did not — so it bypassed the cap.
    const existing = await count('log_sources', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    const tier = await getEffectiveTier<LogViewerLimits>(res)
    if (existing >= tier.limits.maxSources) {
      res.status(403).json({
        error: t(
          'sources.limitReached',
          {},
          { defaultValue: 'You have reached your source limit. Upgrade your plan to add more.' },
        ),
        limitType: 'maxSources',
        currentLimit: tier.limits.maxSources,
        category: tier.category,
      })
      return
    }
    const result = await create('log_sources', {
      user_id: userId,
      name: body.name,
      format: body.format ?? 'json',
      source: body.source ?? null,
      type: body.type ?? 'generic',
      environment: body.environment ?? 'production',
      retention_days: body.retention_days ?? 30,
      status: 'active',
      is_active: true,
      ingest_token: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('sources.create', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateSourceSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const id = getParamId(req)
    const source = await findById<Record<string, unknown>>('log_sources', id)
    if (!source || source.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('sources.notFound', {}, { defaultValue: 'Log source not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateSourceSchema>
    const update: Record<string, unknown> = { updated_at: new Date() }
    if (body.name !== undefined) update.name = body.name
    if (body.format !== undefined) update.format = body.format
    if (body.source !== undefined) update.source = body.source
    if (body.type !== undefined) update.type = body.type
    if (body.environment !== undefined) update.environment = body.environment
    if (body.retention_days !== undefined) update.retention_days = body.retention_days
    if (body.is_active !== undefined) update.is_active = body.is_active
    if (body.status !== undefined) update.status = body.status
    const result = await updateById('log_sources', id, update)
    res.json(result.data)
  } catch (error) {
    logger.error('sources.update', error)
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
    const source = await findById<Record<string, unknown>>('log_sources', id)
    if (!source || source.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('sources.notFound', {}, { defaultValue: 'Log source not found' }) })
      return
    }
    await deleteById('log_sources', id)
    res.status(204).end()
  } catch (error) {
    logger.error('sources.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
