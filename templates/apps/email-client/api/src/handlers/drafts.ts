/**
 * Drafts handler — drafts live in the same `emails` table with `folder='drafts'`.
 *
 * Owner-scoped reads/writes via `user_id` from session (no IDOR — gate G6).
 *
 * @module
 */
import { type RequestHandler, Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'

import type { EmailClientLimits } from '../tiers.js'

const recipientsSchema = z.union([z.string(), z.array(z.string())])

const upsertSchema = z.object({
  to: recipientsSchema.optional(),
  cc: recipientsSchema.optional(),
  bcc: recipientsSchema.optional(),
  from: z.string().optional(),
  subject: z.string().max(998).optional(),
  body: z.string().max(1_000_000).optional(),
  thread_id: z.string().min(1).optional().nullable(),
})

const router = Router()

async function ensureSeedSafe(userId: string): Promise<void> {
  try {
    const { ensureSeedForUser } = await import('./_seed.js')
    await ensureSeedForUser(userId)
  } catch (_error) {
    // ignore — best-effort seeding; failures must not block the request
  }
}

router.get('/', requireAuth, async (_req, res) => {
  const userId = res.locals.session.userId as string
  await ensureSeedSafe(userId)
  try {
    const drafts = await findMany('emails', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'folder', operator: '=', value: 'drafts' },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(drafts)
  } catch (err) {
    console.error('[drafts.list] failed', err)
    res.status(500).json({
      error: t('drafts.listError', undefined, { defaultValue: 'Failed to list drafts' }),
    })
  }
})

router.get('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  try {
    const draft = await findById<Record<string, unknown>>('emails', req.params.id as string)
    if (!draft || draft.user_id !== userId || draft.folder !== 'drafts') {
      return res.status(404).json({
        error: t('drafts.notFound', undefined, { defaultValue: 'Draft not found' }),
      })
    }
    res.json(draft)
  } catch (err) {
    console.error('[drafts.read] failed', err)
    res.status(500).json({
      error: t('drafts.readError', undefined, { defaultValue: 'Failed to read draft' }),
    })
  }
})

// Enforce the per-tier drafts cap (tiers.ts maxDrafts) — defined + shown on Pricing (CATALOG claims
// it gated) but the create route never enforced it. Drafts share the `emails` table, so count only
// the user's rows in the drafts folder.
const enforceDraftLimit = enforceLimit<EmailClientLimits>({
  limitType: 'maxDrafts',
  getLimit: (limits) => limits.maxDrafts,
  getCurrent: async (userId) =>
    count('emails', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'folder', operator: '=', value: 'drafts' },
    ]),
}) as unknown as RequestHandler

router.post('/', requireAuth, enforceDraftLimit, async (req, res) => {
  const userId = res.locals.session.userId as string
  const parsed = upsertSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const { to, cc, bcc, from, subject, body, thread_id } = parsed.data
    // JSONB columns: stringify arrays so node-postgres doesn't send them as
    // PG array literals (which jsonb rejects).
    const result = await create('emails', {
      user_id: userId,
      from: from ?? '',
      to: JSON.stringify(to ? (Array.isArray(to) ? to : [to]) : []),
      cc: JSON.stringify(cc ? (Array.isArray(cc) ? cc : [cc]) : []),
      bcc: JSON.stringify(bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : []),
      subject: subject ?? '',
      body: body ?? '',
      folder: 'drafts',
      thread_id: thread_id ?? null,
      is_read: true,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    console.error('[drafts.create] failed', err)
    res.status(500).json({
      error: t('drafts.createError', undefined, { defaultValue: 'Failed to create draft' }),
    })
  }
})

router.put('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  const parsed = upsertSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const existing = await findById<Record<string, unknown>>('emails', req.params.id as string)
    if (!existing || existing.user_id !== userId || existing.folder !== 'drafts') {
      return res.status(404).json({
        error: t('drafts.notFound', undefined, { defaultValue: 'Draft not found' }),
      })
    }
    const { to, cc, bcc, from, subject, body, thread_id } = parsed.data
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (from !== undefined) patch.from = from
    if (to !== undefined) patch.to = JSON.stringify(Array.isArray(to) ? to : [to])
    if (cc !== undefined) patch.cc = JSON.stringify(Array.isArray(cc) ? cc : [cc])
    if (bcc !== undefined) patch.bcc = JSON.stringify(Array.isArray(bcc) ? bcc : [bcc])
    if (subject !== undefined) patch.subject = subject
    if (body !== undefined) patch.body = body
    if (thread_id !== undefined) patch.thread_id = thread_id
    const result = await updateById('emails', req.params.id as string, patch)
    res.json(result.data)
  } catch (err) {
    console.error('[drafts.update] failed', err)
    res.status(500).json({
      error: t('drafts.updateError', undefined, { defaultValue: 'Failed to update draft' }),
    })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  try {
    const draft = await findById<Record<string, unknown>>('emails', req.params.id as string)
    if (!draft || draft.user_id !== userId || draft.folder !== 'drafts') {
      return res.status(404).json({
        error: t('drafts.notFound', undefined, { defaultValue: 'Draft not found' }),
      })
    }
    await deleteById('emails', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    console.error('[drafts.delete] failed', err)
    res.status(500).json({
      error: t('drafts.deleteError', undefined, { defaultValue: 'Failed to delete draft' }),
    })
  }
})

export default router
