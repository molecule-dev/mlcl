import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'

const router = Router()

const ALLOWED_KINDS = [
  'share_invite',
  'share_revoked',
  'visit_reminder',
  'lab_result',
  'medication_refill',
  'system',
] as const

const createSchema = z.object({
  kind: z.enum(ALLOWED_KINDS),
  payload: z.record(z.string(), z.unknown()).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    await seedDemoForUser(userId)
    const rows = await findMany('notifications', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(rows)
  } catch (error) {
    logger.error('notifications.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const body = req.body as z.infer<typeof createSchema>
    const result = await create('notifications', {
      user_id: userId,
      kind: body.kind,
      payload: JSON.stringify(body.payload ?? {}),
      read_at: null,
      created_at: new Date(),
    })
    res.status(201).json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('notifications.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found.' }),
      })
    }
    const result = await updateById('notifications', id, { read_at: new Date() })
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('notifications.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found.' }),
      })
    }
    await deleteById('notifications', id)
    res.status(204).end()
  } catch (error) {
    logger.error('notifications.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
