/**
 * Notifications handler — owner only.
 *
 * In-app notification feed. Authorization: every read/write is scoped by
 * the authenticated session userId.
 */

import { type Request, type Response, Router } from 'express'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import { deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

/**
 * Map a stored notification row (`{kind, payload}`) into the UI shape
 * (`{type, title, body, href, unread, created_at}`) the frontend
 * Notifications page renders.
 *
 * Doing the shape-translation here (server-side) instead of in the page
 * means new notification kinds added later get title/body wording in
 * one place and stay localizable.
 */
function presentNotification(n: Record<string, unknown>): Record<string, unknown> {
  const kind = String(n.kind ?? '')
  const payload = (n.payload as Record<string, unknown> | null) ?? {}
  let title: string
  let body: string
  let href = ''
  switch (kind) {
    case 'new_episode':
      title = t('notifications.newEpisode', undefined, { defaultValue: 'New episode' })
      body = String(payload.title ?? '')
      href = payload.episode_id ? `/episodes/${String(payload.episode_id)}` : ''
      break
    case 'new_subscriber':
      title = t('notifications.newSubscriber', undefined, { defaultValue: 'New subscriber' })
      body = String(payload.show_title ?? '')
      href = payload.show_id ? `/shows/${String(payload.show_id)}` : ''
      break
    case 'welcome':
      title = t('notifications.welcome', undefined, { defaultValue: 'Welcome' })
      body = String(payload.message ?? payload.title ?? '')
      break
    default: {
      // Humanise unknown kinds (`some_event` -> `Some event`) so the UI
      // never renders a raw machine identifier.
      const fallback = kind.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      title = t(`notifications.${kind}`, undefined, { defaultValue: fallback })
      body = String(payload.title ?? payload.message ?? '')
    }
  }
  return {
    id: n.id,
    type: kind,
    title,
    body,
    href,
    unread: n.read_at == null,
    created_at: n.created_at,
  }
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const items = await findMany<Record<string, unknown>>('notifications', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(items.map(presentNotification))
  } catch (error) {
    logger.error('notifications.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/read', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const item = await findById<Record<string, unknown>>('notifications', idOf(req))
    if (!item) {
      res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found' }),
      })
      return
    }
    if (item.user_id !== userId) {
      res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found' }),
      })
      return
    }
    const result = await updateById('notifications', idOf(req), { read_at: new Date() })
    res.json(result.data ?? result)
  } catch (error) {
    logger.error('notifications.markRead', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/read-all', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const unread = await findMany<Record<string, unknown>>('notifications', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'read_at', operator: '=', value: null },
      ],
    })
    for (const n of unread) {
      await updateById('notifications', String(n.id), { read_at: new Date() })
    }
    res.json({ marked: unread.length })
  } catch (error) {
    logger.error('notifications.readAll', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const item = await findById<Record<string, unknown>>('notifications', idOf(req))
    if (!item) {
      res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found' }),
      })
      return
    }
    if (item.user_id !== userId) {
      res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found' }),
      })
      return
    }
    await deleteById('notifications', idOf(req))
    res.status(204).end()
  } catch (error) {
    logger.error('notifications.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
