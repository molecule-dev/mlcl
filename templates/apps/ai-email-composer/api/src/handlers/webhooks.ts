import crypto from 'crypto'
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

/**
 * Mailgun delivery webhooks. Mailgun signs each payload with the webhook
 * signing key; we verify the HMAC-SHA256 before accepting the event and
 * persist the raw payload to `webhook_events` for audit. Per-recipient
 * status updates are pushed onto the corresponding `sent_emails` row.
 */
const router = Router()

function handleError(res: Response, err: unknown, where: string): void {
  console.error(`[webhooks:${where}]`, err)
  res.status(500).json({
    error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
  })
}

const MAILGUN_WEBHOOK_KEY = process.env.MAILGUN_WEBHOOK_SIGNING_KEY ?? process.env.MAILGUN_API_KEY

interface MailgunSignature {
  timestamp: string
  token: string
  signature: string
}

interface MailgunEventData {
  event: string
  message?: { headers?: { 'message-id'?: string } }
  recipient?: string
  timestamp?: number
}

interface MailgunWebhookBody {
  signature?: MailgunSignature
  'event-data'?: MailgunEventData
}

function verifyMailgunSignature(sig: MailgunSignature | undefined): boolean {
  if (!sig || !MAILGUN_WEBHOOK_KEY) return false
  try {
    const hmac = crypto.createHmac('sha256', MAILGUN_WEBHOOK_KEY)
    hmac.update(sig.timestamp + sig.token)
    const expected = hmac.digest('hex')
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig.signature))
  } catch (_error) {
    // HMAC computation failed (e.g. invalid key format); treat signature as invalid
    return false
  }
}

const STATUS_MAP: Record<string, string> = {
  delivered: 'delivered',
  opened: 'opened',
  clicked: 'clicked',
  failed: 'bounced',
  complained: 'complained',
  unsubscribed: 'complained',
}

router.post('/mailgun', async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as MailgunWebhookBody
    const valid = verifyMailgunSignature(body.signature)
    const event = body['event-data']

    // Persist the raw event for audit. `user_id` is resolved below from the
    // matching sent_emails row(s) so each owner can inspect only their own
    // delivery events; it stays null for unsigned/unmatched events.
    const created = await create<{ id: string }>('webhook_events', {
      source: 'mailgun',
      event_type: event?.event ?? null,
      payload: JSON.stringify(body),
      signature_valid: valid,
      processed_at: valid ? new Date() : null,
      created_at: new Date(),
    })

    if (!valid) {
      res.status(401).json({
        error: t('webhooks.invalidSignature', {}, { defaultValue: 'Invalid Mailgun signature' }),
      })
      return
    }

    const messageId = event?.message?.headers?.['message-id']
    const recipient = event?.recipient
    const newStatus = event ? STATUS_MAP[event.event] : undefined

    if (messageId && recipient && newStatus) {
      const matches = await findMany<Record<string, unknown>>('sent_emails', {
        where: [
          { field: 'mailgun_message_id', operator: '=', value: messageId },
          { field: 'recipient_email', operator: '=', value: recipient },
        ],
      })
      const updates: Record<string, unknown> = {
        status: newStatus,
        mailgun_event: JSON.stringify(event),
        updated_at: new Date(),
      }
      if (newStatus === 'opened') updates.opened_at = new Date()
      if (newStatus === 'clicked') updates.clicked_at = new Date()
      if (newStatus === 'bounced') updates.bounced_at = new Date()
      if (newStatus === 'complained') updates.complained_at = new Date()
      for (const row of matches) {
        await updateById('sent_emails', String(row.id), updates)
      }
      // Tenant-scope the audit event to the owner of the matched send so the
      // GET routes can filter it. Recipient PII must not be readable by other
      // tenants. All matches for one message-id belong to the same sender.
      const ownerId = matches[0]?.user_id
      if (ownerId !== undefined && ownerId !== null && created.data?.id) {
        await updateById('webhook_events', String(created.data.id), {
          user_id: String(ownerId),
        })
      }
    }

    res.json({ ok: true })
  } catch (err) {
    handleError(res, err, 'webhooks')
  }
})

const querySchema = z.object({
  source: z.string().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    // Webhook event log — the recipient PII in these events belongs to the
    // user who sent the email, so scope every read to the caller's own rows
    // (mirrors drafts.ts). Never expose other tenants' delivery events.
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const parsed = querySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: t('errors.validation', {}, { defaultValue: 'Invalid query' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (parsed.data.source) {
      where.push({ field: 'source', operator: '=', value: parsed.data.source })
    }
    const events = await findMany('webhook_events', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 100,
    })
    res.json(events)
  } catch (err) {
    handleError(res, err, 'webhooks')
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const row = await findById<Record<string, unknown>>('webhook_events', id)
    // 404 (not 403) on a cross-owner id so existence isn't probeable.
    if (!row || row.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('webhooks.notFound', {}, { defaultValue: 'Webhook event not found' }) })
      return
    }
    res.json(row)
  } catch (err) {
    handleError(res, err, 'webhooks')
  }
})

export default router
