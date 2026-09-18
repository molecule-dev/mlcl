/**
 * Pipelines handler — configured pipelines + manual triggers.
 *
 * A pipeline is the *configuration*; each invocation is a `build` row in
 * `builds`. The trigger endpoint creates a queued build and flips the
 * pipeline's `status` to `running`. Validation via zod +
 * `@molecule/api-middleware-validation`; authorization scopes by `user_id`
 * to prevent IDOR.
 *
 * `GET /` and `GET /:id` return decorated rows (via decorators.ts) with
 * commit_sha / commit_message / author / duration_seconds / repository
 * pre-joined from the latest build, and (for `:id`) stages + artifacts +
 * coverage_pct so the PipelineDetail page renders without any client-side
 * stitching. List responses also lazily seed demo data on first hit so a
 * fresh signup doesn't land on an empty page.
 *
 * Errors are surfaced (not swallowed) so the frontend can show useful
 * messages.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, findById, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { CiCdDashboardLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'
import { listDecoratedPipelines, readDecoratedPipeline } from './decorators.js'

const router = Router()

const listQuerySchema = z.object({
  project_id: z.string().optional(),
  repository_id: z.string().optional(),
  status: z.enum(['idle', 'running', 'failed', 'success', 'queued']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const createSchema = z.object({
  project_id: z.string().optional(),
  repository_id: z.string().optional(),
  name: z.string().min(1),
  branch: z.string().optional(),
  trigger_type: z.enum(['manual', 'push', 'cron']).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
})

const updateSchema = createSchema.partial()

const triggerSchema = z.object({
  commit_sha: z.string().optional(),
  commit_message: z.string().optional(),
  author: z.string().optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    await seedDemoForUser(userId).catch((err) => logger.warn(err))
    const pipelines = await listDecoratedPipelines(userId, {
      project_id: req.query.project_id as string | undefined,
      repository_id: req.query.repository_id as string | undefined,
      status: req.query.status as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    })
    res.json(pipelines)
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
    const pipeline = await readDecoratedPipeline(userId, id)
    if (!pipeline) {
      return res
        .status(404)
        .json({ error: t('pipelines.notFound', {}, { defaultValue: 'Pipeline not found' }) })
    }
    res.json(pipeline)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// Enforce the per-tier pipeline cap (tiers.ts maxPipelines) — defined + advertised in Pricing/CATALOG
// but enforceLimit was never called, so any tier could create unlimited pipelines. (maxBuilds +
// maxArtifacts are intentionally NOT enforced: builds accumulate per trigger and artifacts per build,
// so a total-count cap would break CI after a few runs — only pipelines is a bounded per-user entity.)
const enforcePipelineLimit = enforceLimit<CiCdDashboardLimits>({
  limitType: 'maxPipelines',
  getLimit: (limits) => limits.maxPipelines,
  getCurrent: async (userId) =>
    count('pipelines', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforcePipelineLimit,
  validateBody(createSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId)
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      const body = req.body as z.infer<typeof createSchema>
      const result = await create('pipelines', {
        user_id: userId,
        project_id: body.project_id ?? null,
        repository_id: body.repository_id ?? null,
        name: body.name,
        branch: body.branch ?? 'main',
        trigger_type: body.trigger_type ?? 'manual',
        config: body.config ?? {},
        status: 'idle',
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
  },
)

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('pipelines', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('pipelines.notFound', {}, { defaultValue: 'Pipeline not found' }) })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    for (const k of [
      'name',
      'branch',
      'trigger_type',
      'config',
      'project_id',
      'repository_id',
    ] as const) {
      if (body[k] !== undefined) updates[k] = body[k]
    }
    const result = await updateById('pipelines', id, updates)
    res.json(result.data ?? result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/trigger', validateBody(triggerSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const id = getParamId(req)
    const pipeline = await findById<Record<string, unknown>>('pipelines', id)
    if (!pipeline || pipeline.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('pipelines.notFound', {}, { defaultValue: 'Pipeline not found' }) })
    }
    const body = req.body as z.infer<typeof triggerSchema>
    const build = await create<Record<string, unknown>>('builds', {
      user_id: userId,
      pipeline_id: id,
      status: 'queued',
      branch: pipeline.branch ?? 'main',
      commit_sha: body.commit_sha ?? '',
      commit_message: body.commit_message ?? '',
      author: body.author ?? null,
      triggered_by: 'manual',
      started_at: new Date(),
    })
    await updateById('pipelines', id, {
      status: 'running',
      last_build_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(build.data ?? build)
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
    const existing = await findById<Record<string, unknown>>('pipelines', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('pipelines.notFound', {}, { defaultValue: 'Pipeline not found' }) })
    }
    // Cascade: delete steps, artifacts, builds, then the pipeline itself.
    const { query } = await import('@molecule/api-database')
    await query(`DELETE FROM public.pipeline_steps WHERE pipeline_id = $1 AND user_id = $2`, [
      id,
      userId,
    ])
    await query(`DELETE FROM public.artifacts WHERE pipeline_id = $1 AND user_id = $2`, [
      id,
      userId,
    ])
    await query(`DELETE FROM public.builds WHERE pipeline_id = $1 AND user_id = $2`, [id, userId])
    await query(`DELETE FROM public.pipelines WHERE id = $1 AND user_id = $2`, [id, userId])
    res.status(204).end()
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
