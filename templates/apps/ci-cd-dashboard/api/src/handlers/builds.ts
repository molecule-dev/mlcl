/**
 * Builds handler — runtime instances of pipelines, plus per-line log
 * append + status transitions. When a build moves to a terminal state
 * (`success` / `failed` / `cancelled`) the parent pipeline's `status` is
 * synced for the Pipelines list. Validation via zod, ownership scoped by
 * `user_id` (no IDOR).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const TERMINAL = new Set(['success', 'failed', 'cancelled'])

const listQuerySchema = z.object({
  pipeline_id: z.string().optional(),
  status: z.enum(['queued', 'running', 'success', 'failed', 'cancelled']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const appendLogSchema = z.object({
  level: z.enum(['debug', 'info', 'warning', 'error']).optional(),
  message: z.string().min(1),
  step_name: z.string().optional(),
})

const updateStatusSchema = z.object({
  status: z.enum(['queued', 'running', 'success', 'failed', 'cancelled']),
  duration_ms: z.number().int().min(0).optional(),
  exit_code: z.number().int().optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (req.query.pipeline_id) {
      where.push({ field: 'pipeline_id', operator: '=', value: String(req.query.pipeline_id) })
    }
    if (req.query.status) {
      where.push({ field: 'status', operator: '=', value: String(req.query.status) })
    }
    const limit = req.query.limit ? Number(req.query.limit) : 50
    const builds = await findMany('builds', {
      where,
      orderBy: [{ field: 'started_at', direction: 'desc' }],
      limit,
    })
    res.json(builds)
  } catch (err) {
    logger.error(err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
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
    const build = await findById<Record<string, unknown>>('builds', id)
    if (!build || build.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('builds.notFound', {}, { defaultValue: 'Build not found' }) })
    }
    const logs = await findMany('build_logs', {
      where: [
        { field: 'build_id', operator: '=', value: id },
        { field: 'user_id', operator: '=', value: userId },
      ],
      orderBy: [{ field: 'timestamp', direction: 'asc' }],
      limit: 1000,
    })
    res.json({ ...build, logs })
  } catch (err) {
    logger.error(err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const id = getParamId(req)
    const build = await findById<Record<string, unknown>>('builds', id)
    if (!build || build.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('builds.notFound', {}, { defaultValue: 'Build not found' }) })
    }
    const logs = await findMany('build_logs', {
      where: [
        { field: 'build_id', operator: '=', value: id },
        { field: 'user_id', operator: '=', value: userId },
      ],
      orderBy: [{ field: 'timestamp', direction: 'asc' }],
      limit: 1000,
    })
    res.json(logs)
  } catch (err) {
    logger.error(err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/logs', validateBody(appendLogSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const id = getParamId(req)
    const build = await findById<Record<string, unknown>>('builds', id)
    if (!build || build.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('builds.notFound', {}, { defaultValue: 'Build not found' }) })
    }
    const body = req.body as z.infer<typeof appendLogSchema>
    const log = await create('build_logs', {
      user_id: userId,
      build_id: id,
      level: body.level ?? 'info',
      message: body.message,
      step_name: body.step_name ?? '',
      timestamp: new Date(),
    })
    res.status(201).json(log.data)
  } catch (err) {
    logger.error(err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id/status', validateBody(updateStatusSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const id = getParamId(req)
    const build = await findById<Record<string, unknown>>('builds', id)
    if (!build || build.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('builds.notFound', {}, { defaultValue: 'Build not found' }) })
    }
    const body = req.body as z.infer<typeof updateStatusSchema>
    const updates: Record<string, unknown> = {
      status: body.status,
      updated_at: new Date(),
    }
    if (body.duration_ms !== undefined) updates.duration_ms = body.duration_ms
    if (body.exit_code !== undefined) updates.exit_code = body.exit_code
    if (TERMINAL.has(body.status)) {
      updates.finished_at = new Date()
    }
    const result = await updateById('builds', id, updates)
    // Sync the parent pipeline's status off the build's terminal transition.
    if (TERMINAL.has(body.status) && build.pipeline_id) {
      const pipelineId = String(build.pipeline_id)
      const pipelineStatus =
        body.status === 'success' ? 'success' : body.status === 'failed' ? 'failed' : 'idle'
      await updateById('pipelines', pipelineId, {
        status: pipelineStatus,
        updated_at: new Date(),
      })
    }
    res.json(result.data)
  } catch (err) {
    logger.error(err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const id = getParamId(req)
    const build = await findById<Record<string, unknown>>('builds', id)
    if (!build || build.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('builds.notFound', {}, { defaultValue: 'Build not found' }) })
    }
    if (build.status !== 'running' && build.status !== 'queued') {
      return res.status(400).json({
        error: t(
          'builds.cannotCancel',
          {},
          { defaultValue: 'Build cannot be cancelled in its current state' },
        ),
      })
    }
    const result = await updateById('builds', id, {
      status: 'cancelled',
      finished_at: new Date(),
      updated_at: new Date(),
    })
    if (build.pipeline_id) {
      await updateById('pipelines', String(build.pipeline_id), {
        status: 'idle',
        updated_at: new Date(),
      })
    }
    res.json(result.data)
  } catch (err) {
    logger.error(err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
