/**
 * Notifications handler — in-app feed (analysis_done / dataset_ready /
 * quota events).
 *
 * The list endpoint decorates each row with the shape Notifications.tsx
 * expects:
 *   { id, type, title, body, href, created_at, unread }
 *
 * Where:
 * - `type`   is the DB column `kind`
 * - `href`   is the DB column `link`
 * - `unread` is `read_at IS NULL`
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'

const router = Router()

interface NotifRow {
  id?: string
  user_id?: string
  kind?: string
  title?: string
  body?: string
  link?: string | null
  entity_id?: string | null
  read_at?: string | Date | null
  created_at?: string | Date | null
}

function decorate(row: NotifRow): Record<string, unknown> {
  return {
    id: row.id,
    type: row.kind ?? 'system_message',
    title: row.title ?? '',
    body: row.body ?? '',
    href: row.link ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
    unread: row.read_at == null,
  }
}

const listQuerySchema = z.object({
  unread: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const markReadSchema = z.object({
  read: z.boolean().optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  try {
    await seedDemoForUser(userId)
  } catch (err) {
    console.warn('seedDemoForUser failed', err)
  }
  const where: Array<{ field: string; operator: '=' | 'is_null'; value?: unknown }> = [
    { field: 'user_id', operator: '=', value: userId },
  ]
  if (String(req.query.unread) === 'true') {
    where.push({ field: 'read_at', operator: 'is_null' })
  }
  const limit = req.query.limit ? Number(req.query.limit) : 50
  const rows = await findMany<NotifRow>('notifications', {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit,
  })
  res.json(rows.map(decorate))
})

router.get('/unread_count', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  try {
    await seedDemoForUser(userId)
  } catch (err) {
    console.warn('seedDemoForUser failed', err)
  }
  const n = await count('notifications', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'read_at', operator: 'is_null' },
  ])
  res.json({ unread: n })
})

router.put('/:id/read', validateBody(markReadSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req, 'id')
  const row = await findById<NotifRow>('notifications', id)
  if (!row || row.user_id !== userId) {
    return res.status(404).json({ error: t('errors.notFound') })
  }
  const body = req.body as z.infer<typeof markReadSchema>
  const result = await updateById<NotifRow>('notifications', id, {
    read_at: body.read === false ? null : new Date(),
  })
  const persisted = (result as { data?: NotifRow }).data ?? (result as NotifRow)
  res.json(decorate(persisted))
})

router.put('/mark_all_read', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const unread = await findMany<NotifRow>('notifications', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'read_at', operator: 'is_null' },
    ],
    limit: 500,
  })
  for (const n of unread) {
    if (n.id) await updateById('notifications', n.id, { read_at: new Date() })
  }
  res.json({ markedRead: unread.length })
})

export default router
