import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

function verifyHmac(secret: string, payload: string, signature: string | undefined): boolean {
  if (!signature) return false
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  const incoming = signature.replace(/^sha256=/, '')
  if (expected.length !== incoming.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(incoming))
  } catch (_error) {
    // Buffers differ in length or encoding; treat as signature mismatch
    return false
  }
}

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).default([]),
})

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  status: z.string().optional(),
})

interface WebhookListRow {
  id: string
  user_id: string
  url: string
  events?: unknown
  status?: string
  created_at: string | Date
  updated_at: string | Date
}

interface LatestEventRow {
  webhook_id: string
  delivered_at: string | Date | null
  created_at: string | Date
}

function decodeEvents(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch (_error) {
      // Non-JSON events column value; fall back to empty array
      return []
    }
  }
  return []
}

async function decorateWebhooks(rows: WebhookListRow[]): Promise<Array<Record<string, unknown>>> {
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)
  const recent = await findMany<LatestEventRow>('webhook_events', {
    where: [{ field: 'webhook_id', operator: 'in', value: ids }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 500,
  })
  const lastByHook = new Map<string, string | Date | null>()
  for (const e of recent) {
    if (!lastByHook.has(e.webhook_id)) {
      lastByHook.set(e.webhook_id, e.delivered_at ?? e.created_at)
    }
  }
  return rows.map((row) => ({
    ...row,
    events: decodeEvents(row.events),
    active: row.status !== 'inactive',
    last_delivery: lastByHook.get(row.id) ?? null,
  }))
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
    const webhooks = await findMany<WebhookListRow>('webhooks', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(await decorateWebhooks(webhooks))
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createWebhookSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { url, events } = req.body
    const secret = `whsec_${randomBytes(24).toString('hex')}`
    const result = await create<WebhookListRow>('webhooks', {
      user_id: userId,
      url,
      events: JSON.stringify(events ?? []),
      secret,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    })
    const created = result.data ?? undefined
    if (!created) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
      return
    }
    const [decorated] = await decorateWebhooks([created])
    res.status(201).json({ ...decorated, secret })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateWebhookSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('webhooks', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('webhooks.notFound', undefined, { defaultValue: 'Webhook not found' }) })
      return
    }
    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date() }
    if (Array.isArray(updates.events)) {
      updates.events = JSON.stringify(updates.events)
    }
    const result = await updateById<Record<string, unknown>>('webhooks', id, updates)
    res.json(result.data)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('webhooks', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('webhooks.notFound', undefined, { defaultValue: 'Webhook not found' }) })
      return
    }
    await deleteById('webhooks', id)
    res.status(204).end()
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id/events', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('webhooks', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('webhooks.notFound', undefined, { defaultValue: 'Webhook not found' }) })
      return
    }
    const events = await findMany('webhook_events', {
      where: [{ field: 'webhook_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(events)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

// Public — carriers POST signed payloads here. We log the payload either way
// but reject with 401 on bad signature so the gate's "unhappy path" exists.
router.post('/:id/incoming', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const webhook = await findOne<Record<string, unknown>>('webhooks', [
      { field: 'id', operator: '=', value: id },
    ])
    if (!webhook) {
      res
        .status(404)
        .json({ error: t('webhooks.notFound', undefined, { defaultValue: 'Webhook not found' }) })
      return
    }
    const signature = req.header('X-Signature') ?? ''
    const rawPayload = JSON.stringify(req.body ?? {})
    const ok = verifyHmac(String(webhook.secret ?? ''), rawPayload, signature)
    if (!ok) {
      await create('webhook_events', {
        webhook_id: id,
        user_id: webhook.user_id,
        payload: JSON.stringify(req.body ?? {}),
        attempts: 1,
        last_error: 'invalid signature',
        created_at: new Date(),
      })
      res.status(401).json({
        error: t('webhooks.invalidSignature', undefined, { defaultValue: 'Invalid signature' }),
      })
      return
    }
    const result = await create<Record<string, unknown>>('webhook_events', {
      webhook_id: id,
      user_id: webhook.user_id,
      payload: JSON.stringify(req.body ?? {}),
      attempts: 1,
      delivered_at: new Date(),
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
