import { type Request, type Response, Router } from 'express'

import { t } from '@molecule/api-i18n'

const router = Router()

interface WebhookEvent {
  id: string
  name: string
  description: string
  payload: string
  retry_policy: string
}

// Read-only catalog of webhook event types. These are reference docs
// describing the integration contract, not per-user data. Update this
// list when adding new webhook events to the platform.
const EVENTS: WebhookEvent[] = [
  {
    id: 'account-created',
    name: 'account.created',
    description:
      'Fires when a new account is provisioned. Includes the account id and provisioning metadata.',
    payload: `{
  "event": "account.created",
  "id": "evt_2K8hTw3pNc",
  "created_at": "2026-04-26T15:42:00Z",
  "data": {
    "account_id": "acc_xCqA4Zr2",
    "owner_email": "user@example.com",
    "plan": "pro"
  }
}`,
    retry_policy: 'Up to 24 retries with exponential backoff (max 6h)',
  },
  {
    id: 'invoice-paid',
    name: 'invoice.paid',
    description: 'Fires when a subscription invoice transitions to paid.',
    payload: `{
  "event": "invoice.paid",
  "id": "evt_7gQF1r8Hxw",
  "created_at": "2026-04-26T14:18:00Z",
  "data": {
    "invoice_id": "in_42891",
    "amount_cents": 2900,
    "currency": "usd"
  }
}`,
    retry_policy: 'Up to 24 retries with exponential backoff',
  },
  {
    id: 'request-failed',
    name: 'request.failed',
    description: 'Fires for 5xx responses on production keys. Useful for alerting integrations.',
    payload: `{
  "event": "request.failed",
  "id": "evt_92cBNxK1r3",
  "created_at": "2026-04-26T13:54:00Z",
  "data": {
    "request_id": "req_6PqL3v",
    "endpoint": "POST /v3/charges",
    "status": 503,
    "duration_ms": 12480
  }
}`,
    retry_policy: 'No retry — drop after first delivery attempt',
  },
  {
    id: 'rate-limit-tripped',
    name: 'rate_limit.tripped',
    description: 'Fires when an API key crosses 80% of its rate window. Lets you preempt 429s.',
    payload: `{
  "event": "rate_limit.tripped",
  "id": "evt_aBcDe1Fg4H",
  "created_at": "2026-04-26T12:31:00Z",
  "data": {
    "api_key_id": "key_test_xK2",
    "window_seconds": 60,
    "used": 480,
    "limit": 600
  }
}`,
    retry_policy: 'Up to 12 retries within 1h',
  },
]

router.get('/', (_req: Request, res: Response) => {
  res.json(EVENTS)
})

router.get('/:id', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  const evt = EVENTS.find((e) => e.id === id || e.name === id)
  if (!evt) {
    return res.status(404).json({ error: t('webhooks.notFound') })
  }
  res.json(evt)
})

export default router
