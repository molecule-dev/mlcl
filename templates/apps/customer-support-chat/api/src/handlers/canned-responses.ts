import type { RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import type { CustomerSupportChatLimits } from '../tiers.js'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  shortcut: z.string().min(1).max(40).optional(),
  content: z.string().min(1).max(10_000),
  category: z.string().min(1).max(100).optional(),
})

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  shortcut: z.string().min(1).max(40).optional(),
  content: z.string().min(1).max(10_000).optional(),
  category: z.string().min(1).max(100).optional(),
})

const router = Router()

const ensureOwnership = async (
  id: string,
  userId: string,
  res: Response,
): Promise<Record<string, unknown> | null> => {
  const target = await findById<Record<string, unknown>>('canned_responses', id)
  if (!target) {
    res.status(404).json({
      error: t('cannedResponses.notFound', undefined, {
        defaultValue: 'Canned response not found',
      }),
    })
    return null
  }
  if (target.user_id && target.user_id !== userId) {
    res.status(403).json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden' }) })
    return null
  }
  return target
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = res.locals.session.userId as string
    const { category } = req.query
    const where: { field: string; operator: '='; value: unknown }[] = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (category) where.push({ field: 'category', operator: '=', value: category })
    const responses = await findMany('canned_responses', {
      where,
      orderBy: [{ field: 'title', direction: 'asc' }],
      limit: 200,
    })
    res.json(responses)
  } catch (error) {
    logger.error('cannedResponses.list failed', error)
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
    logger.error('cannedResponses.read failed', error)
    next(error)
  }
})

router.post(
  '/',
  requireAuth,
  enforceLimit<CustomerSupportChatLimits>({
    limitType: 'maxCannedResponses',
    getLimit: (limits) => limits.maxCannedResponses,
    getCurrent: (userId) =>
      count('canned_responses', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  async (req, res, next) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
        errors: parsed.error.issues,
      })
    }
    try {
      const userId = res.locals.session.userId as string
      const result = await create('canned_responses', {
        title: parsed.data.title,
        shortcut: parsed.data.shortcut ?? null,
        content: parsed.data.content,
        category: parsed.data.category ?? 'general',
        created_by: userId,
        user_id: userId,
        created_at: new Date().toISOString(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('cannedResponses.create failed', error)
      next(error)
    }
  },
)

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
    const result = await updateById('canned_responses', req.params.id as string, {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    if (!result.data) {
      return res.status(404).json({
        error: t('cannedResponses.notFound', undefined, {
          defaultValue: 'Canned response not found',
        }),
      })
    }
    res.json(result.data)
  } catch (error) {
    logger.error('cannedResponses.update failed', error)
    next(error)
  }
})

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = res.locals.session.userId as string
    const owned = await ensureOwnership(req.params.id as string, userId, res)
    if (!owned) return
    await deleteById('canned_responses', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('cannedResponses.delete failed', error)
    next(error)
  }
})

export default router
