/**
 * feature-flag-manager — flag environments CRUD.
 *
 * Environments scope flag state per (project, env). Each environment also
 * carries its own SDK key + client key for consumer SDKs to read flag
 * evaluations.
 */

import { randomBytes } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { getEffectiveTier } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { FeatureFlagManagerLimits } from '../tiers.js'

const router = Router()

type SessionLocals = { session?: { userId?: string; userEmail?: string } }
const getUserEmail = (res: Response): string | null =>
  (res.locals as SessionLocals).session?.userEmail ?? null

async function recordEnvAudit(
  userId: string,
  email: string | null,
  action: string,
  envKey: string,
  message: string,
): Promise<void> {
  try {
    await create('audit_log', {
      user_id: userId,
      action,
      actor: userId,
      actor_email: email,
      target: envKey,
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
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().min(1).max(128),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  is_production: z.boolean().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  is_production: z.boolean().optional(),
  rotate_keys: z.boolean().optional(),
})

const generateKey = (prefix: string): string => `${prefix}_${randomBytes(24).toString('hex')}`

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
    const envs = await findMany('flag_environments', {
      where,
      orderBy,
      limit: q.limit,
      offset: (q.page - 1) * q.limit,
    })
    res.json(envs)
  } catch (error) {
    logger.error('environments.list', error)
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
    const env = await findById<Record<string, unknown>>('flag_environments', id)
    if (!env || env.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('environments.notFound', {}, { defaultValue: 'Environment not found' }) })
      return
    }
    res.json(env)
  } catch (error) {
    logger.error('environments.getById', error)
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

    const existing = await count('flag_environments', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    const tier = await getEffectiveTier<FeatureFlagManagerLimits>(res)
    if (existing >= tier.limits.maxEnvironments) {
      res.status(403).json({
        error: t(
          'environments.limitReached',
          {},
          {
            defaultValue: 'You have reached your environment limit. Upgrade your plan to add more.',
          },
        ),
        limitType: 'maxEnvironments',
        currentLimit: tier.limits.maxEnvironments,
        category: tier.category,
      })
      return
    }

    const email = getUserEmail(res)
    const result = await create('flag_environments', {
      user_id: userId,
      project_id: body.project_id ?? null,
      key: body.key,
      name: body.name,
      color: body.color ?? '#3b82f6',
      is_production: body.is_production ?? false,
      sdk_key: generateKey('sdk'),
      client_key: generateKey('clt'),
      flag_count: 0,
      active_flag_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    await recordEnvAudit(userId, email, 'created', body.key, `created environment ${body.key}`)
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('environments.create', error)
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
    const env = await findById<Record<string, unknown>>('flag_environments', id)
    if (!env || env.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('environments.notFound', {}, { defaultValue: 'Environment not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateSchema>
    const update: Record<string, unknown> = { updated_at: new Date() }
    if (body.name !== undefined) update.name = body.name
    if (body.color !== undefined) update.color = body.color
    if (body.is_production !== undefined) update.is_production = body.is_production
    if (body.rotate_keys) {
      update.sdk_key = generateKey('sdk')
      update.client_key = generateKey('clt')
    }
    const result = await updateById('flag_environments', id, update)
    const email = getUserEmail(res)
    const envKey = typeof env.key === 'string' ? env.key : ''
    const action = body.rotate_keys ? 'updated' : 'updated'
    const msg = body.rotate_keys ? `rotated keys for ${envKey}` : `updated environment ${envKey}`
    await recordEnvAudit(userId, email, action, envKey, msg)
    res.json(result.data)
  } catch (error) {
    logger.error('environments.update', error)
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
    const env = await findById<Record<string, unknown>>('flag_environments', id)
    if (!env || env.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('environments.notFound', {}, { defaultValue: 'Environment not found' }) })
      return
    }
    const email = getUserEmail(res)
    const envKey = typeof env.key === 'string' ? env.key : ''
    await deleteById('flag_environments', id)
    await recordEnvAudit(userId, email, 'deleted', envKey, `deleted environment ${envKey}`)
    res.status(204).end()
  } catch (error) {
    logger.error('environments.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
