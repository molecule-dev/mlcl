/**
 * Inbound webhooks (GitHub / GitLab) — public endpoint, HMAC-verified.
 *
 * Routes:
 *   POST /webhooks/github   GitHub PR / push event intake
 *
 * Per INVENTORY: this endpoint is intentionally public (anonymous webhook
 * delivery) but every payload is HMAC-verified against the per-repository
 * `webhook_secret_encrypted`. Failed signatures are logged + 401'd.
 *
 * Validation (G5): the body schema is enforced by zod via
 * `@molecule/api-middleware-validation` before any DB write.
 */

import { randomUUID } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const githubPayloadSchema = z.object({
  action: z.string().optional(),
  repository: z
    .object({
      full_name: z.string(),
      id: z.union([z.number(), z.string()]).optional(),
    })
    .passthrough(),
  pull_request: z
    .object({
      number: z.number(),
      title: z.string().optional(),
      diff_url: z.string().optional(),
      user: z.object({ login: z.string() }).passthrough().optional(),
      base: z.object({ ref: z.string() }).passthrough().optional(),
      head: z.object({ ref: z.string() }).passthrough().optional(),
      additions: z.number().optional(),
      deletions: z.number().optional(),
    })
    .passthrough()
    .optional(),
})

/**
 * Constant-time HMAC-SHA256 verifier — uses node `crypto` directly so the
 * webhook intake doesn't depend on the `@molecule/api-webhook` bond being
 * registered (the bond is for outbound + signed-storage; inbound verify
 * runs on the raw body before any bond setup).
 */
async function verifyGithubHmac(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader.startsWith('sha256=')) return false
  const expected = signatureHeader.slice(7)
  const { createHmac, timingSafeEqual } = await import('node:crypto')
  const computed = createHmac('sha256', secret).update(rawBody).digest('hex')
  if (computed.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(expected, 'hex'))
  } catch (_error) {
    // timingSafeEqual throws if buffers differ in length; treat as signature mismatch
    return false
  }
}

router.post('/github', validateBody(githubPayloadSchema), async (req: Request, res: Response) => {
  try {
    const signature = (req.headers['x-hub-signature-256'] as string | undefined) ?? ''
    const event = (req.headers['x-github-event'] as string | undefined) ?? ''
    const deliveryId = (req.headers['x-github-delivery'] as string | undefined) ?? null
    if (!signature || !event) {
      res.status(400).json({
        error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
        errors: [
          ...(signature ? [] : [{ field: 'x-hub-signature-256', message: 'required' }]),
          ...(event ? [] : [{ field: 'x-github-event', message: 'required' }]),
        ],
      })
      return
    }
    const payload = req.body as z.infer<typeof githubPayloadSchema>
    const fullName = payload.repository.full_name

    // Locate the repository row by full_name; this binds the inbound
    // delivery to a specific owner so we can scope the audit log row.
    const matches = await findMany<{
      id: string
      owner_id: string
      user_id: string
      webhook_secret_encrypted?: string | null
    }>('repositories', {
      where: [{ field: 'full_name', operator: '=', value: fullName }] as WhereCondition[],
      limit: 1,
    })
    const repo = matches[0]
    if (!repo) {
      res.status(404).json({
        error: t('repositories.notFound', {}, { defaultValue: 'Repository not found' }),
      })
      return
    }

    // The bonded express body-parser sets `req.rawBody` via its verify
    // hook; HMAC must run against the exact bytes the client sent so that
    // round-trip JSON.stringify() doesn't reorder keys / strip whitespace.
    const reqWithRaw = req as Request & { rawBody?: string }
    const rawBody = reqWithRaw.rawBody ?? JSON.stringify(payload)
    const secret = repo.webhook_secret_encrypted ?? process.env.GITHUB_WEBHOOK_SECRET ?? ''
    const sigValid = secret ? await verifyGithubHmac(rawBody, signature, secret) : false

    // Always audit-log the delivery — even invalid signatures are
    // forensically interesting (repeated-attempt attacker fingerprint).
    // payload_json is jsonb in postgres → must be a JSON string for the
    // node-postgres driver to round-trip cleanly.
    await create('webhook_events', {
      id: randomUUID(),
      owner_id: repo.owner_id,
      user_id: repo.user_id,
      repository_id: repo.id,
      github_delivery_id: deliveryId,
      event_type: event,
      payload_json: JSON.stringify(payload),
      received_at: new Date().toISOString(),
      signature_valid: sigValid,
    })

    if (!sigValid) {
      res.status(401).json({
        error: t('webhooks.invalidSignature', {}, { defaultValue: 'Invalid webhook signature' }),
      })
      return
    }

    // Pull-request event → enqueue a review run.
    if (
      event === 'pull_request' &&
      (payload.action === 'opened' || payload.action === 'synchronize') &&
      payload.pull_request
    ) {
      const pr = payload.pull_request
      await create('review_queue', {
        id: randomUUID(),
        owner_id: repo.owner_id,
        user_id: repo.user_id,
        repository_id: repo.id,
        pr_id: null,
        payload_json: JSON.stringify({
          source: 'github',
          repo: fullName,
          pr_number: pr.number,
          pr_title: pr.title ?? null,
          diff_url: pr.diff_url ?? null,
        }),
        attempts: 0,
        status: 'pending',
        enqueued_at: new Date().toISOString(),
      })
    }

    res.status(200).json({ received: true })
  } catch (err) {
    logger.error('webhooks.github', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
