import { randomBytes, randomUUID } from 'node:crypto'

import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { deliverWebhook } from '../lib/deliver-webhook.js'

/**
 * Outbound webhooks — users register a URL, we deliver signed events to it.
 *
 * Schema:
 *   webhook_endpoints(id, user_id, url TEXT, events TEXT[]/JSON, secret TEXT, created_at)
 *
 * The signing `secret` is returned ONCE at registration (like an API key) and
 * never again — the receiver stores it to verify our X-Webhook-Signature.
 * Delivery itself is SSRF-guarded + signed in lib/deliver-webhook.ts.
 */

const registerSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string().min(1).max(80)).min(1).max(50),
})

type EndpointRow = {
  id: string
  user_id: string
  url: string
  events: string[]
  secret: string
  created_at: string
}

const requireAuth = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

const router = Router()

// Register an endpoint. Returns the signing secret ONCE.
router.post('/', requireAuth, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
  }
  // Require https so events aren't delivered in cleartext. (The resolved-IP SSRF
  // check still runs at delivery time — a URL can rebind after registration.)
  if (new URL(parsed.data.url).protocol !== 'https:') {
    return res.status(400).json({
      error: t('webhooks.httpsRequired', undefined, {
        defaultValue: 'Webhook URL must be https',
      }),
    })
  }
  const secret = randomBytes(24).toString('hex')
  const result = await create('webhook_endpoints', {
    user_id: res.locals.session.userId,
    url: parsed.data.url,
    events: parsed.data.events,
    secret,
    created_at: new Date().toISOString(),
  })
  const row = result.data as EndpointRow
  // Secret shown once — the caller must store it now.
  res.status(201).json({ id: row.id, url: row.url, events: parsed.data.events, secret })
})

// List the caller's endpoints — never re-expose the secret.
router.get('/', requireAuth, async (req, res) => {
  const rows = (await findMany('webhook_endpoints', {
    where: [{ field: 'user_id', operator: '=', value: res.locals.session.userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 100,
  })) as EndpointRow[]
  res.json(rows.map((r) => ({ id: r.id, url: r.url, events: r.events, created_at: r.created_at })))
})

// Delete one (owner-scoped — 404 for missing OR another user's, so existence isn't leaked).
router.delete('/:id', requireAuth, async (req, res) => {
  const row = (await findById('webhook_endpoints', req.params.id as string)) as EndpointRow | null
  if (!row || row.user_id !== res.locals.session.userId) {
    return res
      .status(404)
      .json({ error: t('webhooks.notFound', undefined, { defaultValue: 'Endpoint not found' }) })
  }
  await deleteById('webhook_endpoints', row.id)
  res.json({ ok: true })
})

export default router

/**
 * Fan an event out to every one of a user's endpoints subscribed to it. Call
 * from the feature that produces the event. Failures are logged, not thrown — a
 * bad receiver must never break the caller. In production, enqueue each delivery
 * on a background job (jobs/scheduled-tasks) with bounded retries + backoff
 * rather than awaiting inline, so a slow receiver can't stall the request.
 */
export async function dispatchEvent(userId: string, event: string, data: unknown): Promise<void> {
  const endpoints = (await findMany('webhook_endpoints', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 100,
  })) as EndpointRow[]
  await Promise.all(
    endpoints
      .filter((e) => e.events.includes(event))
      .map(async (e) => {
        // One stable id per logical delivery. If you move this to a background
        // job with retries, generate it ONCE and reuse it on every retry so the
        // receiver dedups the at-least-once redeliveries.
        const deliveryId = randomUUID()
        const result = await deliverWebhook({
          url: e.url,
          secret: e.secret,
          event,
          payload: data,
          deliveryId,
        })
        if (!result.ok) {
          console.error('webhook delivery failed', {
            url: e.url,
            event,
            status: result.status,
            error: result.error,
          })
        }
      }),
  )
}
