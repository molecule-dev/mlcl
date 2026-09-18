import type { Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const createSchema = z.object({
  name: z.string().min(1).max(200),
  trigger: z.string().min(1).max(200),
  conditions: z.record(z.string(), z.unknown()).optional(),
  actions: z.array(z.unknown()).optional(),
  enabled: z.boolean().optional(),
})

const updateSchema = createSchema.partial()

const router = Router()

const ensureOwnership = async (
  id: string,
  userId: string,
  res: Response,
): Promise<Record<string, unknown> | null> => {
  const target = await findById<Record<string, unknown>>('automation_rules', id)
  if (!target) {
    res.status(404).json({
      error: t('automations.notFound', undefined, { defaultValue: 'Automation rule not found' }),
    })
    return null
  }
  if (target.user_id && target.user_id !== userId) {
    res.status(403).json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden' }) })
    return null
  }
  return target
}

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const userId = res.locals.session.userId as string
    const rules = await findMany('automation_rules', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(rules)
  } catch (error) {
    logger.error('automations.list failed', error)
    next(error)
  }
})

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = res.locals.session.userId as string
    const owned = await ensureOwnership(req.params.id as string, userId, res)
    if (!owned) return
    res.json(owned)
  } catch (error) {
    logger.error('automations.read failed', error)
    next(error)
  }
})

router.post('/', requireAuth, async (req, res, next) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const userId = res.locals.session.userId as string
    const result = await create('automation_rules', {
      name: parsed.data.name,
      trigger: parsed.data.trigger,
      conditions: parsed.data.conditions ?? {},
      actions: parsed.data.actions ?? [],
      enabled: parsed.data.enabled ?? true,
      created_by: userId,
      user_id: userId,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('automations.create failed', error)
    next(error)
  }
})

router.put('/:id', requireAuth, async (req, res, next) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const userId = res.locals.session.userId as string
    const owned = await ensureOwnership(req.params.id as string, userId, res)
    if (!owned) return
    const result = await updateById('automation_rules', req.params.id as string, {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('automations.update failed', error)
    next(error)
  }
})

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = res.locals.session.userId as string
    const owned = await ensureOwnership(req.params.id as string, userId, res)
    if (!owned) return
    await deleteById('automation_rules', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('automations.delete failed', error)
    next(error)
  }
})

export default router
