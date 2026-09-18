import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const preferencesSchema = z.object({
  email_on_delivered: z.boolean().optional(),
  email_on_exception: z.boolean().optional(),
  push_on_status_change: z.boolean().optional(),
})

interface NotificationLogRow {
  id: string
  user_id: string
  type: string
  payload: unknown
  sent_at: string | Date | null
  created_at: string | Date
}

function decodePayload(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch (_error) {
      // Non-JSON payload stored in DB; fall back to empty object
      return {}
    }
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>
  return {}
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const rows = await findMany<NotificationLogRow>('notification_log', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    const items = rows.map((r) => {
      const p = decodePayload(r.payload)
      return {
        id: r.id,
        type: r.type,
        title: typeof p.title === 'string' ? p.title : r.type,
        body: typeof p.body === 'string' ? p.body : '',
        href: typeof p.href === 'string' ? p.href : null,
        unread: p.unread !== false,
        created_at: r.created_at,
      }
    })
    res.json(items)
  } catch (_err) {
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
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const rows = await findMany<NotificationLogRow>('notification_log', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1000,
    })
    let updated = 0
    for (const row of rows) {
      const payload = decodePayload(row.payload)
      if (payload.unread === false) continue
      payload.unread = false
      await updateById<Record<string, unknown>>('notification_log', row.id, {
        payload: JSON.stringify(payload),
      })
      updated++
    }
    res.json({ updated })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/preferences', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const prefs = await findOne<Record<string, unknown>>('notification_preferences', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (!prefs) {
      res.json({
        email_on_delivered: true,
        email_on_exception: true,
        push_on_status_change: false,
      })
      return
    }
    res.json(prefs)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/preferences', validateBody(preferencesSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { email_on_delivered, email_on_exception, push_on_status_change } = req.body

    // Look for an existing row first. If one exists (from seed or a prior
    // save), update it in place. Otherwise create one. We retry the find
    // once on `create` failure because seedDemoForUser may race the PUT —
    // the unique(user_id) constraint on notification_preferences ensures
    // at most one row exists per user, so the loser of the race must
    // resolve the conflict by switching to an update path.
    const upsertPreferences = async (): Promise<Record<string, unknown> | null> => {
      const existing = await findOne<Record<string, unknown>>('notification_preferences', [
        { field: 'user_id', operator: '=', value: userId },
      ])
      if (existing?.id) {
        const result = await updateById<Record<string, unknown>>(
          'notification_preferences',
          String(existing.id),
          {
            email_on_delivered: email_on_delivered ?? existing.email_on_delivered,
            email_on_exception: email_on_exception ?? existing.email_on_exception,
            push_on_status_change: push_on_status_change ?? existing.push_on_status_change,
            updated_at: new Date(),
          },
        )
        return result.data
      }
      const result = await create<Record<string, unknown>>('notification_preferences', {
        user_id: userId,
        email_on_delivered: email_on_delivered ?? true,
        email_on_exception: email_on_exception ?? true,
        push_on_status_change: push_on_status_change ?? false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      return result.data
    }

    let row: Record<string, unknown> | null
    try {
      row = await upsertPreferences()
    } catch (err) {
      // Likely a unique_violation from a concurrent seed insert. Retry
      // once — this time the existing row exists and we update it.
      const msg =
        (err as { code?: string; message?: string })?.code === '23505' ||
        /duplicate key|unique constraint/i.test((err as Error)?.message ?? '')
      if (!msg) throw err
      row = await upsertPreferences()
    }
    res.json(row)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/log', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { page = '1', limit = '50' } = req.query
    const notifications = await findMany('notification_log', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
    })
    res.json(notifications)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
