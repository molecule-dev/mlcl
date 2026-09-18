/**
 * feature-flag-manager — flags + targeting-rules CRUD.
 *
 * Each handler:
 *   - Authenticates the request via the user-resource verifyMiddleware.
 *   - Resolves session.userId from res.locals (the molecule auth contract).
 *   - Scopes every read/write by user_id (no IDOR).
 *   - Validates request bodies with zod via @molecule/api-middleware-validation.
 *   - Routes through the abstract DataStore (no raw SQL here).
 */

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

const FLAG_TYPES = ['boolean', 'multivariate', 'string', 'number'] as const
const FLAG_STATES = ['on', 'off', 'killed', 'scheduled'] as const

type SessionLocals = { session?: { userId?: string; userEmail?: string } }
const getUserEmail = (res: Response): string | null =>
  (res.locals as SessionLocals).session?.userEmail ?? null

const listFlagsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  project_id: z.string().uuid().optional(),
  environment: z.string().min(1).max(64).optional(),
  state: z.enum(FLAG_STATES).optional(),
})

const createFlagSchema = z.object({
  project_id: z.string().uuid().optional(),
  key: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9_.-]+$/),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  flag_type: z.enum(FLAG_TYPES).optional(),
  default_value: z.unknown().optional(),
  rollout_percentage: z.number().int().min(0).max(100).optional(),
  is_enabled: z.boolean().optional(),
  environment: z.string().min(1).max(64).optional(),
  stale_days: z.number().int().min(0).optional(),
})

const updateFlagSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  default_value: z.unknown().optional(),
  rollout_percentage: z.number().int().min(0).max(100).optional(),
  is_enabled: z.boolean().optional(),
  state: z.enum(FLAG_STATES).optional(),
  environment: z.string().min(1).max(64).optional(),
  stale_days: z.number().int().min(0).optional(),
})

const ruleSchema = z.object({
  attribute: z.string().min(1).max(120),
  operator: z.string().min(1).max(40),
  value: z.unknown().optional(),
  serve_value: z.unknown().optional(),
  priority: z.number().int().min(0).max(10_000).optional(),
  description: z.string().max(2000).optional(),
})

async function recordAudit(
  userId: string,
  email: string | null,
  action: string,
  flagId: string | null,
  flagKey: string | null,
  message: string,
): Promise<void> {
  try {
    await create('audit_log', {
      user_id: userId,
      action,
      actor: userId,
      actor_email: email,
      target: flagKey,
      flag_id: flagId,
      message,
      metadata: JSON.stringify({}),
      occurred_at: new Date(),
      created_at: new Date(),
    })
  } catch (_error) {
    // Audit failures are non-fatal — never block the user-facing operation
    // because audit writes are observability, not business logic.
  }
}

router.get('/', validateQuery(listFlagsQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const q = req.query as unknown as z.infer<typeof listFlagsQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (q.project_id) where.push({ field: 'project_id', operator: '=', value: q.project_id })
    if (q.environment) where.push({ field: 'environment', operator: '=', value: q.environment })
    if (q.state) where.push({ field: 'state', operator: '=', value: q.state })

    const orderBy: OrderBy[] = [{ field: 'updated_at', direction: 'desc' }]
    const flags = await findMany('feature_flags', {
      where,
      orderBy,
      limit: q.limit,
      offset: (q.page - 1) * q.limit,
    })
    res.json(flags)
  } catch (error) {
    logger.error('flags.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function resolveFlag(
  userId: string,
  idOrKey: string,
): Promise<Record<string, unknown> | null> {
  if (UUID_RE.test(idOrKey)) {
    const flag = await findById<Record<string, unknown>>('feature_flags', idOrKey)
    if (flag && flag.user_id === userId) return flag
    return null
  }
  const matches = await findMany<Record<string, unknown>>('feature_flags', {
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
    const flag = await resolveFlag(userId, idOrKey)
    if (!flag) {
      res.status(404).json({ error: t('flags.notFound', {}, { defaultValue: 'Flag not found' }) })
      return
    }
    const rules = await findMany('targeting_rules', {
      where: [{ field: 'flag_id', operator: '=', value: flag.id as string }],
      orderBy: [{ field: 'priority', direction: 'asc' }],
    })
    res.json({ ...flag, rules })
  } catch (error) {
    logger.error('flags.getById', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createFlagSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const email = getUserEmail(res)
    const body = req.body as z.infer<typeof createFlagSchema>

    const existing = await count('feature_flags', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    const tier = await getEffectiveTier<FeatureFlagManagerLimits>(res)
    if (existing >= tier.limits.maxFlags) {
      res.status(403).json({
        error: t(
          'flags.limitReached',
          {},
          {
            defaultValue: 'You have reached your flag limit. Upgrade your plan to add more.',
          },
        ),
        limitType: 'maxFlags',
        currentLimit: tier.limits.maxFlags,
        category: tier.category,
      })
      return
    }

    const result = await create('feature_flags', {
      user_id: userId,
      project_id: body.project_id ?? null,
      key: body.key,
      name: body.name,
      description: body.description ?? '',
      flag_type: body.flag_type ?? 'boolean',
      default_value: JSON.stringify(body.default_value ?? false),
      state: body.is_enabled ? 'on' : 'off',
      rollout_percentage: body.rollout_percentage ?? 0,
      environments: JSON.stringify({}),
      is_enabled: body.is_enabled ?? false,
      stale_days: body.stale_days ?? 30,
      environment: body.environment ?? null,
      updated_by: userId,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const flag = result.data ?? null
    const flagId = flag && typeof flag.id === 'string' ? flag.id : null
    await recordAudit(userId, email, 'created', flagId, body.key, 'created flag')
    res.status(201).json(flag)
  } catch (error) {
    logger.error('flags.create', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const email = getUserEmail(res)
    const id = getParamId(req)
    const flag = await findById<Record<string, unknown>>('feature_flags', id)
    if (!flag || flag.user_id !== userId) {
      res.status(404).json({ error: t('flags.notFound', {}, { defaultValue: 'Flag not found' }) })
      return
    }
    const next = !flag.is_enabled
    const result = await updateById('feature_flags', id, {
      is_enabled: next,
      state: next ? 'on' : 'off',
      updated_at: new Date(),
      updated_by: userId,
    })
    await recordAudit(
      userId,
      email,
      next ? 'toggled_on' : 'toggled_off',
      id,
      typeof flag.key === 'string' ? flag.key : null,
      `toggled flag ${next ? 'on' : 'off'}`,
    )
    res.json(result.data)
  } catch (error) {
    logger.error('flags.toggle', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateFlagSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const email = getUserEmail(res)
    const id = getParamId(req)
    const flag = await findById<Record<string, unknown>>('feature_flags', id)
    if (!flag || flag.user_id !== userId) {
      res.status(404).json({ error: t('flags.notFound', {}, { defaultValue: 'Flag not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateFlagSchema>
    const update: Record<string, unknown> = {
      updated_at: new Date(),
      updated_by: userId,
    }
    if (body.name !== undefined) update.name = body.name
    if (body.description !== undefined) update.description = body.description
    if (body.default_value !== undefined) update.default_value = JSON.stringify(body.default_value)
    if (body.rollout_percentage !== undefined) update.rollout_percentage = body.rollout_percentage
    if (body.is_enabled !== undefined) update.is_enabled = body.is_enabled
    if (body.state !== undefined) update.state = body.state
    if (body.environment !== undefined) update.environment = body.environment
    if (body.stale_days !== undefined) update.stale_days = body.stale_days

    const result = await updateById('feature_flags', id, update)
    const isStateChange = body.state === 'killed'
    await recordAudit(
      userId,
      email,
      isStateChange ? 'killed' : 'updated',
      id,
      typeof flag.key === 'string' ? flag.key : null,
      isStateChange ? 'killed flag' : 'updated flag',
    )
    res.json(result.data)
  } catch (error) {
    logger.error('flags.update', error)
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
    const email = getUserEmail(res)
    const id = getParamId(req)
    const flag = await findById<Record<string, unknown>>('feature_flags', id)
    if (!flag || flag.user_id !== userId) {
      res.status(404).json({ error: t('flags.notFound', {}, { defaultValue: 'Flag not found' }) })
      return
    }
    await recordAudit(
      userId,
      email,
      'deleted',
      id,
      typeof flag.key === 'string' ? flag.key : null,
      'deleted flag',
    )
    await deleteById('feature_flags', id)
    res.status(204).end()
  } catch (error) {
    logger.error('flags.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/rules', validateBody(ruleSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const id = getParamId(req)
    const flag = await findById<Record<string, unknown>>('feature_flags', id)
    if (!flag || flag.user_id !== userId) {
      res.status(404).json({ error: t('flags.notFound', {}, { defaultValue: 'Flag not found' }) })
      return
    }
    const email = getUserEmail(res)
    const body = req.body as z.infer<typeof ruleSchema>
    const result = await create('targeting_rules', {
      user_id: userId,
      flag_id: id,
      attribute: body.attribute,
      operator: body.operator,
      value: JSON.stringify(body.value ?? []),
      serve_value: JSON.stringify(body.serve_value ?? null),
      priority: body.priority ?? 0,
      description: body.description ?? '',
      created_at: new Date(),
      updated_at: new Date(),
    })
    await recordAudit(
      userId,
      email,
      'targeting_changed',
      id,
      typeof flag.key === 'string' ? flag.key : null,
      `added rule ${body.attribute} ${body.operator}`,
    )
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('flags.createRule', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id/rules/:ruleId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const id = getParamId(req)
    const ruleId = getParamId(req, 'ruleId')
    const flag = await findById<Record<string, unknown>>('feature_flags', id)
    if (!flag || flag.user_id !== userId) {
      res.status(404).json({ error: t('flags.notFound', {}, { defaultValue: 'Flag not found' }) })
      return
    }
    const rule = await findById<Record<string, unknown>>('targeting_rules', ruleId)
    if (!rule || rule.flag_id !== id) {
      res.status(404).json({ error: t('rules.notFound', {}, { defaultValue: 'Rule not found' }) })
      return
    }
    const email = getUserEmail(res)
    await deleteById('targeting_rules', ruleId)
    await recordAudit(
      userId,
      email,
      'targeting_changed',
      id,
      typeof flag.key === 'string' ? flag.key : null,
      'removed rule',
    )
    res.status(204).end()
  } catch (error) {
    logger.error('flags.deleteRule', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
