import { createHash } from 'node:crypto'

import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { NewsletterLimits } from '../tiers.js'
import { recordClick } from './_deliver.js'

const router = Router()

/**
 * Deterministic unsubscribe token for a subscriber: the first 32 hex chars of
 * sha256("newsletter:" + subscriber id). DEMO-BY-DESIGN and documented as
 * such: a real ESP would mint an unguessable per-subscriber secret at rest
 * and rotate it on demand. This one is derived (not stored-random) so seeded
 * demo rows, the public unsubscribe link, and the track endpoints all agree
 * on the same token without an extra secrets surface in the template. It is
 * unique per subscriber (the id is a uuid) and stable across restarts.
 */
export function makeSubscriberToken(subscriberId: string): string {
  return createHash('sha256').update(`newsletter:${subscriberId}`).digest('hex').slice(0, 32)
}

// --- Schemas ---

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['subscribed', 'unsubscribed', 'pending']).optional(),
  tier: z.enum(['free', 'paid']).optional(),
  q: z.string().optional(),
})

const createSubscriberSchema = z.object({
  email: z.string().email().max(1023),
  tier: z.enum(['free', 'paid']).optional().default('free'),
  // Manual adds from the Subscribers page carry their source explicitly.
  source: z.string().max(100).optional().default('manual'),
})

const updateSubscriberSchema = z.object({
  status: z.enum(['subscribed', 'unsubscribed', 'pending']).optional(),
  tier: z.enum(['free', 'paid']).optional(),
})

const subscribeSchema = z.object({
  email: z.string().email().max(1023),
})

// --- Helpers ---

async function findByEmail(email: string): Promise<Record<string, unknown> | null> {
  const rows = (await findMany<Record<string, unknown>>('subscribers', {
    where: [{ field: 'email', operator: '=', value: email }],
    limit: 1,
  })) as Record<string, unknown>[]
  return rows[0] ?? null
}

// --- Routes ---

// List subscribers (creator view): filter by status/tier, search by email.
router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { page, limit, status, tier, q } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = []
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (tier) where.push({ field: 'tier', operator: '=', value: tier })
    if (q) where.push({ field: 'email', operator: 'ilike', value: `%${q}%` })

    const subscribers = await findMany('subscribers', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const total = await count('subscribers', where)
    res.json({ data: subscribers, total, page, limit })
  } catch (err) {
    console.error('[subscribers.list]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Manual add (no CSV import in this template — email + tier by hand). The
// subscriber starts `subscribed`; no confirmation mail is sent because this
// template sends no mail (see _deliver.ts for the emails-bond integration
// point where a welcome/confirm send would slot in).
router.post(
  '/',
  enforceLimit<NewsletterLimits>({
    limitType: 'maxSubscribers',
    getLimit: (limits) => limits.maxSubscribers,
    getCurrent: async () => count('subscribers', []),
  }) as unknown as RequestHandler,
  validateBody(createSubscriberSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const body = req.body as z.infer<typeof createSubscriberSchema>
      const existing = await findByEmail(body.email)
      if (existing) {
        res
          .status(409)
          .json({ error: t('subscribers.exists', {}, { defaultValue: 'Already subscribed' }) })
        return
      }
      const now = new Date().toISOString()
      // create() returns the row WITHOUT the DB-generated uuid, so the token
      // (derived from the id) is written in a second update. Read the id back
      // by email — the unique constraint makes this lookup unambiguous.
      const created = await create('subscribers', {
        email: body.email,
        status: 'subscribed',
        tier: body.tier,
        source: body.source ?? 'manual',
        token: 'pending',
        subscribed_at: now,
        created_at: now,
        updated_at: now,
      })
      const row = created.data as Record<string, unknown> | null
      const stored = row?.id ? row : await findByEmail(body.email)
      const id = String(stored?.id ?? '')
      if (id) {
        await updateById('subscribers', id, { token: makeSubscriberToken(id) })
      }
      res.status(201).json({ ...(stored ?? {}), token: id ? makeSubscriberToken(id) : null })
    } catch (err) {
      console.error('[subscribers.create]', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// PUBLIC subscribe form (Landing page). Single opt-in for demo simplicity —
// the status enum still carries 'pending' for apps that want double opt-in:
// set it here and confirm via a tokened link exactly like the unsubscribe
// route below. Idempotent: re-subscribing an existing (even unsubscribed)
// email flips it back to `subscribed` and returns ok.
router.post('/subscribe', validateBody(subscribeSchema), async (req: Request, res: Response) => {
  try {
    const body = req.body as z.infer<typeof subscribeSchema>
    const now = new Date().toISOString()
    const existing = await findByEmail(body.email)
    if (existing) {
      if (existing.status !== 'subscribed') {
        await updateById('subscribers', String(existing.id), {
          status: 'subscribed',
          subscribed_at: now,
          updated_at: now,
        })
      }
      res.status(200).json({ ok: true })
      return
    }
    const created = await create('subscribers', {
      email: body.email,
      status: 'subscribed',
      tier: 'free',
      source: 'landing',
      token: 'pending',
      subscribed_at: now,
      created_at: now,
      updated_at: now,
    })
    const row = created.data as Record<string, unknown> | null
    const id = String(row?.id ?? '')
    if (id) {
      await updateById('subscribers', id, { token: makeSubscriberToken(id) })
    }
    res.status(201).json({ ok: true })
  } catch (err) {
    console.error('[subscribers.subscribe]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// PUBLIC unsubscribe by token — the target of the unsubscribe link on the
// rendered public issue (`/unsubscribe/:token?issue=<id>`). Deterministic
// token = makeSubscriberToken(id) (see its doc comment). When the issue param
// is present and that subscriber got that issue, the click is recorded on the
// send before the flip — the unsubscribe link IS the only link this template
// puts in an issue, so it is what "clicked" honestly means here.
router.get('/unsubscribe/:token', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token ?? '')
    const rows = (await findMany<Record<string, unknown>>('subscribers', {
      where: [{ field: 'token', operator: '=', value: token }],
      limit: 1,
    })) as Record<string, unknown>[]
    const subscriber = rows[0]
    if (!subscriber) {
      res
        .status(404)
        .json({ error: t('subscribers.notFound', {}, { defaultValue: 'Subscriber not found' }) })
      return
    }
    const issueId = typeof req.query.issue === 'string' ? req.query.issue : null
    if (issueId) {
      try {
        await recordClick(issueId, String(subscriber.id))
      } catch (_clickError) {
        // Click bookkeeping is best-effort — the unsubscribe itself must win.
      }
    }
    const now = new Date().toISOString()
    await updateById('subscribers', String(subscriber.id), {
      status: 'unsubscribed',
      updated_at: now,
    })
    res.json({ ok: true, email: subscriber.email, status: 'unsubscribed' })
  } catch (err) {
    console.error('[subscribers.unsubscribe]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Update a subscriber (status flips from the Subscribers table, tier changes).
router.patch('/:id', validateBody(updateSubscriberSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const existing = await findById<Record<string, unknown>>('subscribers', getParamId(req))
    if (!existing) {
      res
        .status(404)
        .json({ error: t('subscribers.notFound', {}, { defaultValue: 'Subscriber not found' }) })
      return
    }
    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date().toISOString() }
    if (updates.status === 'subscribed' && existing.status !== 'subscribed') {
      updates.subscribed_at = updates.updated_at
    }
    const result = await updateById('subscribers', getParamId(req), updates)
    res.json(result.data)
  } catch (err) {
    console.error('[subscribers.update]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const existing = await findById<Record<string, unknown>>('subscribers', getParamId(req))
    if (!existing) {
      res
        .status(404)
        .json({ error: t('subscribers.notFound', {}, { defaultValue: 'Subscriber not found' }) })
      return
    }
    await deleteById('subscribers', getParamId(req))
    res.status(204).end()
  } catch (err) {
    console.error('[subscribers.delete]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
