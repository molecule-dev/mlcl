import type { Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const createSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(320).optional(),
  phone: z.string().min(1).max(50).optional(),
  company: z.string().min(1).max(200).optional(),
  tags: z.array(z.string()).optional(),
})

const updateSchema = createSchema.partial()

const router = Router()

const ensureOwnership = async (
  id: string,
  userId: string,
  res: Response,
): Promise<Record<string, unknown> | null> => {
  const target = await findById<Record<string, unknown>>('contacts', id)
  if (!target) {
    res
      .status(404)
      .json({ error: t('contacts.notFound', undefined, { defaultValue: 'Contact not found' }) })
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
    const contacts = await findMany('contacts', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'last_seen_at', direction: 'desc' }],
      limit: 500,
    })
    res.json(contacts)
  } catch (error) {
    logger.error('contacts.list failed', error)
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
    logger.error('contacts.read failed', error)
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
    const now = new Date().toISOString()
    const result = await create('contacts', {
      name: parsed.data.name ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      company: parsed.data.company ?? null,
      tags: parsed.data.tags ?? [],
      total_conversations: 0,
      first_seen_at: now,
      last_seen_at: now,
      user_id: userId,
      created_at: now,
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('contacts.create failed', error)
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
    const result = await updateById('contacts', req.params.id as string, {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('contacts.update failed', error)
    next(error)
  }
})

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = res.locals.session.userId as string
    const owned = await ensureOwnership(req.params.id as string, userId, res)
    if (!owned) return
    await deleteById('contacts', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('contacts.delete failed', error)
    next(error)
  }
})

export default router
