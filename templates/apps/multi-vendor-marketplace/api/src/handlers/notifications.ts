/**
 * Per-user notifications. Frontend Notifications page expects:
 *   GET    /api/notifications              → list newest-first with read state
 *   POST   /api/notifications/read-all     → mark all as read
 *   POST   /api/notifications/:id/read     → mark one as read
 *   DELETE /api/notifications/:id          → remove
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { requireUser } from '@molecule/api-bonds-default-express'
import { count, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { seedDemoForUser } from './_seed.js'

const router = Router()

interface ViewNotification {
  id: string
  type: string
  title: string
  body: string
  href: string | null
  unread: boolean
  created_at: string
}

function decorateOne(row: Record<string, unknown>): ViewNotification {
  const payload = (row.payload as Record<string, unknown> | null) ?? {}
  return {
    id: String(row.id),
    type: String(row.type ?? 'system_message'),
    title: String(payload.title ?? row.title ?? ''),
    body: String(payload.body ?? row.body ?? ''),
    href: payload.href ? String(payload.href) : row.href ? String(row.href) : null,
    unread: row.read_at == null,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at ?? new Date().toISOString()),
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) {
    res.status(401).json({
      error: t('common.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  // Lazy seed: if user has no notifications, seed a starter set so the page
  // isn't blank on first load. Idempotent.
  const total = await count('notifications', [{ field: 'user_id', operator: '=', value: userId }])
  if (total === 0) {
    try {
      await seedDemoForUser(userId)
    } catch (_error) {
      // best-effort seed; do not block list response
    }
  }
  const rows = await findMany<Record<string, unknown>>('notifications', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 100,
  })
  const data = rows.map(decorateOne)
  const unread = data.filter((n) => n.unread).length
  res.json({ data, total: data.length, unread })
})

router.post('/read-all', async (_req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) {
    res.status(401).json({
      error: t('common.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const rows = await findMany<Record<string, unknown>>('notifications', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'read_at', operator: 'is_null', value: null },
    ],
    limit: 500,
  })
  for (const r of rows) {
    await updateById('notifications', String(r.id), { read_at: new Date() })
  }
  res.json({ updated: rows.length })
})

router.post('/:id/read', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) {
    res.status(401).json({
      error: t('common.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const id = String(req.params.id)
  const n = await findById<Record<string, unknown>>('notifications', id)
  if (!n || n.user_id !== userId) {
    res.status(404).json({ error: t('common.notFound', undefined, { defaultValue: 'Not found.' }) })
    return
  }
  await updateById('notifications', id, { read_at: new Date() })
  res.json({ updated: true })
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) {
    res.status(401).json({
      error: t('common.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const id = String(req.params.id)
  const n = await findById<Record<string, unknown>>('notifications', id)
  if (!n || n.user_id !== userId) {
    res.status(404).json({ error: t('common.notFound', undefined, { defaultValue: 'Not found.' }) })
    return
  }
  await deleteById('notifications', id)
  res.json({ removed: true })
})

export default router
