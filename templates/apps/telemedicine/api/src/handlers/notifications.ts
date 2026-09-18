/**
 * Telemedicine — notifications handler.
 *
 * In-app notifications are owner-scoped by `user_id`. This is a thin shim
 * over `findMany` / `updateById` for the notifications page; the heavy
 * lifting (delivery via push / email / sms) lives in the corresponding
 * @molecule/api-push-notifications-* / @molecule/api-emails-* /
 * @molecule/api-sms-* bonds.
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { findById, findMany, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { decorateNotifications } from './_lib/decorate.js'
import { getParamId, getUserId } from './_lib/shared.js'
import { seedForUser } from './_seed.js'

const router = Router()

const markReadSchema = z.object({
  read_at: z.string().optional(),
})

interface NotificationRow extends Record<string, unknown> {
  id: string
  user_id?: string
  kind?: string
  payload?: unknown
  read_at?: string | Date | null
  created_at?: string | Date
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    await seedForUser(userId)
    const rows = await findMany<NotificationRow>('notifications', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(decorateNotifications(rows as NotificationRow[]))
  } catch (error) {
    logger.error('telemedicine notifications get:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.put('/:id/read', validateBody(markReadSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    // Atomic, ownership-scoped write: only a row owned by the caller is
    // updated, so another tenant's notification is never mutated or disclosed.
    const where: WhereCondition[] = [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ]
    const result = await updateMany('notifications', where, { read_at: new Date() })
    if (!result.affected) {
      return res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found.' }),
      })
    }
    const updated = await findById<NotificationRow>('notifications', id)
    res.json(updated)
  } catch (error) {
    logger.error('telemedicine notifications mark-read:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
