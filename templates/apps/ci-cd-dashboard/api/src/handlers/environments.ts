/**
 * Environments handler — deploy targets (production / staging / preview)
 * with current_deploy snapshot + recent_deploys ring buffer. The deploy
 * endpoint records a deploy event onto the environment without invoking
 * the actual deploy mechanism (handled out-of-band by the runner).
 *
 * `GET /` returns rows decorated by decorators.ts (parsed JSONB +
 * normalised health status). List responses lazily seed demo data on
 * first hit.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'
import { listDecoratedEnvironments } from './decorators.js'

const router = Router()

const listQuerySchema = z.object({
  status: z.enum(['healthy', 'degraded', 'down']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const createSchema = z.object({
  name: z.string().min(1),
  url: z.string().optional(),
  status: z.enum(['healthy', 'degraded', 'down']).optional(),
  traffic_pct: z.number().int().min(0).max(100).optional(),
})

const updateSchema = createSchema.partial()

const deploySchema = z.object({
  sha: z.string().min(1),
  branch: z.string().optional(),
  status: z.enum(['success', 'failed', 'rolled_back', 'queued', 'running', 'cancelled']).optional(),
  deployed_by: z.string().optional(),
  build_id: z.string().optional(),
  traffic_pct: z.number().int().min(0).max(100).optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    await seedDemoForUser(userId).catch((err) => logger.warn(err))
    const envs = await listDecoratedEnvironments(userId, {
      status: req.query.status as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    })
    res.json(envs)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const id = getParamId(req)
    const env = await findById<Record<string, unknown>>('environments', id)
    if (!env || env.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('environments.notFound', {}, { defaultValue: 'Environment not found' }) })
    }
    res.json(env)
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
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const body = req.body as z.infer<typeof createSchema>
    const result = await create('environments', {
      user_id: userId,
      name: body.name,
      url: body.url ?? '',
      status: body.status ?? 'healthy',
      traffic_pct: body.traffic_pct ?? 100,
      current_deploy: {},
      recent_deploys: JSON.stringify([]),
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data ?? result)
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
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const id = getParamId(req)
    const env = await findById<Record<string, unknown>>('environments', id)
    if (!env || env.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('environments.notFound', {}, { defaultValue: 'Environment not found' }) })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    for (const k of ['name', 'url', 'status', 'traffic_pct'] as const) {
      if (body[k] !== undefined) updates[k] = body[k]
    }
    const result = await updateById('environments', id, updates)
    res.json(result.data ?? result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/deploy', validateBody(deploySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const id = getParamId(req)
    const env = await findById<Record<string, unknown>>('environments', id)
    if (!env || env.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('environments.notFound', {}, { defaultValue: 'Environment not found' }) })
    }
    const body = req.body as z.infer<typeof deploySchema>
    const deploy = {
      sha: body.sha,
      branch: body.branch ?? 'main',
      status: body.status ?? 'success',
      deployed_by: body.deployed_by ?? null,
      build_id: body.build_id ?? null,
      deployed_at: new Date().toISOString(),
    }
    const rawRecent = env.recent_deploys
    const parsedRecent: unknown[] =
      typeof rawRecent === 'string'
        ? (JSON.parse(rawRecent) as unknown[])
        : Array.isArray(rawRecent)
          ? rawRecent
          : []
    const next = [deploy, ...parsedRecent].slice(0, 20)
    // Preserve the environment's stored traffic split (canary/preview %) across deploys — a
    // successful deploy must NOT silently reset it to 100%, which threw away the configured
    // percentage. Honor an explicit body.traffic_pct when the caller sets the rollout percentage.
    const trafficPct =
      body.traffic_pct !== undefined ? body.traffic_pct : Number(env.traffic_pct ?? 100)
    const result = await updateById('environments', id, {
      current_deploy: deploy,
      recent_deploys: JSON.stringify(next),
      traffic_pct: trafficPct,
      updated_at: new Date(),
    })
    res.status(201).json(result.data ?? result)
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
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const id = getParamId(req)
    const env = await findById<Record<string, unknown>>('environments', id)
    if (!env || env.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('environments.notFound', {}, { defaultValue: 'Environment not found' }) })
    }
    await deleteById('environments', id)
    res.status(204).end()
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
