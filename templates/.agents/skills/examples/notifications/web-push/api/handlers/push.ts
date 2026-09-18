import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { getProvider, send } from '@molecule/api-push-notifications'

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

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

// The VAPID PUBLIC key is public by design — the browser needs it as the
// `applicationServerKey` to create a subscription (Chromium rejects keyless
// ones). Serve it so the client can fetch it right before subscribing; no auth
// needed. Ask the bonded provider (not `process.env` directly) so provider
// knowledge stays in the bond; a 503 (never a crash) when push is unconfigured.
router.get('/public-key', (_req, res) => {
  const publicKey = getProvider()?.getPublicKey()
  if (!publicKey) {
    return res.status(503).json({
      error: t('push.notConfigured', undefined, {
        defaultValue: 'Push notifications are not configured (VAPID_PUBLIC_KEY unset).',
      }),
    })
  }
  res.json({ publicKey })
})

router.post('/subscribe', requireAuth, async (req, res) => {
  const parsed = subscribeSchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: t('push.invalid', undefined, { defaultValue: 'Invalid subscription' }) })
  }
  const userId = res.locals.session.userId as string

  // Dedup by endpoint — a single browser only registers one.
  const existing = await findMany('push_subscriptions', {
    where: [{ field: 'endpoint', operator: '=', value: parsed.data.endpoint }],
    limit: 1,
  })
  if (existing.length > 0) {
    return res.json({ ok: true, deduped: true })
  }

  await create('push_subscriptions', {
    user_id: userId,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    created_at: new Date().toISOString(),
  })
  res.status(201).json({ ok: true })
})

const testSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
})

router.post('/test', requireAuth, async (req, res) => {
  const parsed = testSchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: t('push.invalid', undefined, { defaultValue: 'Invalid payload' }) })
  }
  const userId = res.locals.session.userId as string
  const subs = (await findMany('push_subscriptions', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 100,
  })) as { id: string; endpoint: string; p256dh: string; auth: string }[]

  let sent = 0
  let dead = 0
  for (const sub of subs) {
    try {
      await send(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        { title: parsed.data.title, options: { body: parsed.data.body } },
      )
      sent++
    } catch (err) {
      // A dead/expired subscription surfaces as 404 (endpoint gone) or 410 (Gone) from
      // the push service. `send()` throws the web-push library's WebPushError, which
      // carries the code on `.statusCode` — its `.message` is a generic "Received
      // unexpected response code" with NO number in it, so scanning the message text
      // NEVER matches and the dead row is never pruned. Read `.statusCode` (fall back to
      // `.status` in case a different push bond is swapped in).
      const code =
        (err as { statusCode?: number; status?: number }).statusCode ??
        (err as { status?: number }).status
      if (code === 404 || code === 410) {
        await deleteById('push_subscriptions', sub.id)
        dead++
      } else {
        // Other errors: log and move on.
        console.error('push send failed', { id: sub.id, err })
      }
    }
  }
  res.json({ sent, dead })
})

export default router
