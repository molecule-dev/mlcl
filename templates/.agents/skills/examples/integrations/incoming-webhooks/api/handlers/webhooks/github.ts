import type { Request, Response } from 'express'
import express, { Router } from 'express'

import { create, findMany } from '@molecule/api-database'

import { verifyHmac } from '../../lib/webhook-verify.js'

const router = Router()

router.post('/github', express.raw({ type: '*/*' }), async (req: Request, res: Response) => {
  const signature = String(req.header('x-hub-signature-256') ?? '')
  const eventId = String(req.header('x-github-delivery') ?? '')
  const eventType = String(req.header('x-github-event') ?? '')
  const secret = process.env.GITHUB_WEBHOOK_SECRET

  if (!secret) {
    return res.status(500).json({ error: 'Webhook not configured' })
  }
  if (!verifyHmac({ rawBody: req.body, secret, signature })) {
    return res.status(401).json({ error: 'Bad signature' })
  }

  // Idempotency — drop duplicates from retries.
  const [seen] = await findMany('webhook_events', {
    where: [{ field: 'event_id', operator: '=', value: eventId }],
    limit: 1,
  })
  if (seen) {
    return res.status(200).json({ ok: true, deduped: true })
  }

  let payload: unknown
  try {
    payload = JSON.parse(req.body.toString('utf-8'))
  } catch (_error) {
    // malformed JSON body — reject as 400 (the raw parse error isn't actionable)
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  await create('webhook_events', {
    provider: 'github',
    event_id: eventId,
    event_type: eventType,
    payload,
    received_at: new Date().toISOString(),
  })

  // Respond fast — heavy work happens in a background job.
  res.status(200).json({ ok: true })
})

export default router
