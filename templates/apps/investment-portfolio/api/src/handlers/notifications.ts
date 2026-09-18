import { type NextFunction, type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, findById, findMany, updateById, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

interface NotificationRow {
  id?: string
  user_id?: string
  type?: string
  title?: string
  body?: string
  href?: string | null
  unread?: boolean
  read?: boolean
  data?: unknown
  created_at?: string | Date
}

interface NotificationItem {
  id: string | undefined
  type: string
  title: string
  body: string
  href: string | null
  created_at: string | Date
  unread: boolean
}

const toItem = (row: NotificationRow): NotificationItem => ({
  id: row.id,
  type: row.type ?? 'system_message',
  title: row.title ?? '',
  body: row.body ?? '',
  href: row.href ?? null,
  created_at: row.created_at ?? new Date(),
  unread: row.unread ?? !(row.read ?? false),
})

// Seed a small set of welcome notifications the first time a user fetches
// notifications. Without this, freshly-signed-up users see an empty inbox
// and have no way to click a notification through to the rest of the app.
async function seedDefaultNotifications(userId: string): Promise<void> {
  const existing = await count('notifications', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existing > 0) return

  const now = Date.now()
  const seeds: NotificationRow[] = [
    {
      type: 'system_message',
      title: 'Welcome to Argent',
      body: 'Your portfolio is now wired up. Open Holdings to add positions or import a brokerage statement from Settings → Linked accounts.',
      href: '/holdings',
      unread: true,
      read: false,
      created_at: new Date(now - 30 * 60_000),
    },
    {
      type: 'rebalance_drift',
      title: 'Rebalance check ready',
      body: 'Argent will compare your current allocation to your target allocation any time you visit /rebalance. No drift warnings yet — set targets in Settings to enable alerts.',
      href: '/rebalance',
      unread: true,
      read: false,
      created_at: new Date(now - 60 * 60_000),
    },
    {
      type: 'tax_doc_ready',
      title: 'Last year’s 1099-B is ready',
      body: 'Your prior-year tax documents are available under Reports → Tax documents.',
      href: '/reports',
      unread: true,
      read: false,
      created_at: new Date(now - 6 * 60 * 60_000),
    },
  ]

  for (const seed of seeds) {
    try {
      await create('notifications', {
        user_id: userId,
        ...seed,
      })
    } catch (err) {
      logger.warn('seedDefaultNotifications insert failed', err)
    }
  }
}

const listSchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
})

router.get(
  '/',
  validateQuery(listSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({ error: t('auth.unauthorized') })
        return
      }

      await seedDefaultNotifications(userId)

      const { limit, offset } = req.query
      const rows = (await findMany<NotificationRow>('notifications', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: Number(limit) || 50,
        offset: Number(offset) || 0,
      })) as NotificationRow[]
      res.json(rows.map(toItem))
    } catch (error) {
      logger.error('notifications list failed', error)
      next(error)
    }
  },
)

router.post(
  '/read-all',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({ error: t('auth.unauthorized') })
        return
      }

      await updateMany('notifications', [{ field: 'user_id', operator: '=', value: userId }], {
        unread: false,
        read: true,
      })
      res.json({ ok: true })
    } catch (error) {
      logger.error('notifications read-all failed', error)
      next(error)
    }
  },
)

router.put('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized') })
      return
    }

    const id = getParamId(req)
    const existing = await findById<NotificationRow>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({ error: t('notifications.notFound') })
      return
    }
    const body = req.body as { unread?: boolean; read?: boolean }
    const unread = body.unread ?? !(body.read ?? false)
    const result = await updateById<NotificationRow>('notifications', id, {
      unread,
      read: !unread,
    })
    res.json(toItem((result as { data?: NotificationRow }).data ?? existing))
  } catch (error) {
    logger.error('notifications update failed', error)
    next(error)
  }
})

export default router
