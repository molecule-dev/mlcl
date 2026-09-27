/**
 * Notification handlers — the in-app record of everything the agent did on the
 * user's behalf (bookings, rebookings, delays, shares paid).
 */

import { Router } from 'express'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

interface NotificationRow {
  id: string
  user_id: string
  kind: string
  title: string
  body: string
  link: string | null
  read_at: string | null
  created_at: string
}

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const rows = await findMany<NotificationRow>('notifications', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 50,
    })
    res.json(rows)
  } catch (error) {
    logger.error('notifications.list', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

router.put('/:id/read', async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params)
    if (!params.success) {
      res.status(400).json({ error: t('errors.badRequest', {}, { defaultValue: 'Bad request' }) })
      return
    }
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const row = await findById<NotificationRow>('notifications', params.data.id)
    if (!row || row.user_id !== userId) {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    const result = await updateById<NotificationRow>('notifications', row.id, {
      read_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('notifications.read', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

export default router
