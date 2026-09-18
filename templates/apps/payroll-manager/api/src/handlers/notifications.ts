/**
 * Notifications handler — user-scoped activity feed.
 *
 * Sources:
 *   - The seed writes 4 starter notifications on first sign-up
 *   - pay-runs/process writes one when stubs are generated
 *   - tier-upgrade flow writes one on plan-change
 *
 * Routes:
 *   GET    /notifications              — list all (newest first)
 *   PATCH  /notifications/:id/read     — mark a single notification read
 *   POST   /notifications/mark-all-read — mark every unread row read
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { seedDemoForUser } from './_seed.js'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  await seedDemoForUser(userId)

  const where: Array<{ field: string; operator: '='; value: unknown }> = [
    { field: 'user_id', operator: '=' as const, value: userId },
  ]
  if (req.query.unread === '1') {
    where.push({ field: 'unread', operator: '=' as const, value: true })
  }
  const rows = await findMany<Record<string, unknown>>('notifications', {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 100,
  })
  res.json(rows)
})

router.patch('/:id/read', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const row = await findById<Record<string, unknown>>('notifications', id)
  if (!row || row.user_id !== userId) {
    return res.status(404).json({ error: t('notifications.notFound') })
  }
  const result = await updateById('notifications', id, { unread: false })
  res.json(result.data)
})

router.post('/mark-all-read', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const result = await updateMany(
    'notifications',
    [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'unread', operator: '=', value: true },
    ],
    { unread: false },
  )
  res.json({ updated: result.affected })
})

export default router
