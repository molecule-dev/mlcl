/**
 * Webhook delivery events list. Returns the most recent webhook delivery
 * attempts across the authenticated user's webhook endpoints, joined with
 * the endpoint URL so the Webhooks page can render a consolidated feed.
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

interface WebhookRow {
  id: string
  user_id: string
  url: string
  events?: unknown
}
interface WebhookEventRow {
  id: string
  webhook_id: string
  event_type: string
  status: string
  status_code: number | null
  attempts: number | null
  payload: unknown
  created_at: string | Date
  delivered_at: string | Date | null
}

function previewPayload(raw: unknown): string {
  if (!raw) return ''
  let text: string
  if (typeof raw === 'string') text = raw
  else {
    try {
      text = JSON.stringify(raw)
    } catch (_error) {
      // Non-serialisable payload; fall back to empty preview
      text = ''
    }
  }
  return text.length > 140 ? `${text.slice(0, 137)}…` : text
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
    const hooks = await findMany<WebhookRow>('webhooks', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 200,
    })
    if (hooks.length === 0) {
      res.json([])
      return
    }
    const ids = hooks.map((h) => h.id)
    const events = await findMany<WebhookEventRow>('webhook_events', {
      where: [{ field: 'webhook_id', operator: 'in', value: ids }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 100,
    })
    const urlById = new Map(hooks.map((h) => [h.id, h.url]))
    const out = events.map((e) => {
      const attempts = Number(e.attempts ?? 1)
      return {
        id: e.id,
        endpoint_id: e.webhook_id,
        endpoint_url: urlById.get(e.webhook_id) ?? '',
        event_type: e.event_type,
        status: e.status,
        http_status: e.status_code,
        payload_preview: previewPayload(e.payload),
        delivered_at: e.delivered_at ?? e.created_at,
        retry_count: Math.max(0, attempts - 1),
      }
    })
    res.json(out)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
