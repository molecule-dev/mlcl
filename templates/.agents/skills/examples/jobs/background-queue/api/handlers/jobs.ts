import { Router } from 'express'
import { z } from 'zod'

import { t } from '@molecule/api-i18n'
import { send } from '@molecule/api-queue'

const router = Router()

const enqueueSchema = z.object({
  kind: z.enum(['process-upload', 'send-digest']),
  refId: z.string().max(200).optional(),
})

/**
 * `POST /jobs { kind, refId? }` — enqueue background work and return IMMEDIATELY.
 *
 * The #1 mistake is awaiting the heavy work inline, which defeats the queue and
 * blocks the request. `send()` persists the job and returns fast; the worker
 * (api/lib/worker.ts) processes it in the background. The body carries only the
 * owner id + a kind + a ref id — never secrets or a full record (it is persisted
 * in the queue backend, and the worker re-loads + re-scopes on the current data).
 */
router.post('/', async (req, res) => {
  const userId = res.locals?.session?.userId
  if (!userId) {
    return res.status(401).json({
      error: t('jobs.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }
  const parsed = enqueueSchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: t('jobs.invalid', undefined, { defaultValue: 'Unknown job kind.' }) })
  }

  await send('jobs', {
    body: { userId, kind: parsed.data.kind, refId: parsed.data.refId },
  })

  // 202 Accepted: the work is queued, not done. The client polls its own status
  // resource (if you track one) rather than waiting on this response.
  return res.status(202).json({ queued: true })
})

export default router
