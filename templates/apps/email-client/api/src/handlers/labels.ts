/**
 * Email labels handler — owner-scoped CRUD on labels and label assignments.
 *
 * @module
 */
import { type RequestHandler, Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  deleteMany,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'

import type { EmailClientLimits } from '../tiers.js'

const labelSchema = z.object({
  name: z.string().min(1).max(120),
  color: z.string().max(32).optional(),
})

const labelPatchSchema = labelSchema.partial()

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
    const labels = await findMany('email_labels', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json(labels)
  } catch (err) {
    console.error('[labels.list] failed', err)
    res.status(500).json({
      error: t('labels.listError', undefined, { defaultValue: 'Failed to list labels' }),
    })
  }
})

// Enforce the per-tier labels cap (tiers.ts maxLabels) — defined + shown on Pricing (CATALOG claims
// it gated) but the create route never enforced it, so any tier could create unlimited.
const enforceLabelLimit = enforceLimit<EmailClientLimits>({
  limitType: 'maxLabels',
  getLimit: (limits) => limits.maxLabels,
  getCurrent: async (userId) =>
    count('email_labels', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', requireAuth, enforceLabelLimit, async (req, res) => {
  const userId = res.locals.session.userId as string
  const parsed = labelSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const result = await create('email_labels', {
      user_id: userId,
      name: parsed.data.name,
      color: parsed.data.color ?? '#666666',
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    console.error('[labels.create] failed', err)
    res.status(500).json({
      error: t('labels.createError', undefined, { defaultValue: 'Failed to create label' }),
    })
  }
})

router.put('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  const parsed = labelPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const existing = await findById<Record<string, unknown>>(
      'email_labels',
      req.params.id as string,
    )
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('labels.notFound', undefined, { defaultValue: 'Label not found' }),
      })
    }
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (parsed.data.name !== undefined) patch.name = parsed.data.name
    if (parsed.data.color !== undefined) patch.color = parsed.data.color
    const result = await updateById('email_labels', req.params.id as string, patch)
    res.json(result.data)
  } catch (err) {
    console.error('[labels.update] failed', err)
    res.status(500).json({
      error: t('labels.updateError', undefined, { defaultValue: 'Failed to update label' }),
    })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  try {
    const existing = await findById<Record<string, unknown>>(
      'email_labels',
      req.params.id as string,
    )
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('labels.notFound', undefined, { defaultValue: 'Label not found' }),
      })
    }
    await deleteMany('email_label_assignments', [
      { field: 'label_id', operator: '=', value: req.params.id as string },
    ])
    await deleteById('email_labels', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    console.error('[labels.delete] failed', err)
    res.status(500).json({
      error: t('labels.deleteError', undefined, { defaultValue: 'Failed to delete label' }),
    })
  }
})

router.post('/:labelId/emails/:emailId', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  try {
    const label = await findById<Record<string, unknown>>(
      'email_labels',
      req.params.labelId as string,
    )
    if (!label || label.user_id !== userId) {
      return res.status(404).json({
        error: t('labels.notFound', undefined, { defaultValue: 'Label not found' }),
      })
    }
    const email = await findById<Record<string, unknown>>('emails', req.params.emailId as string)
    if (!email || email.user_id !== userId) {
      return res.status(404).json({
        error: t('emails.notFound', undefined, { defaultValue: 'Email not found' }),
      })
    }
    const existing = await findOne('email_label_assignments', [
      { field: 'label_id', operator: '=', value: req.params.labelId as string },
      { field: 'email_id', operator: '=', value: req.params.emailId as string },
    ])
    if (existing) {
      return res.status(200).json({ assigned: true })
    }
    await create('email_label_assignments', {
      label_id: req.params.labelId as string,
      email_id: req.params.emailId as string,
      created_at: new Date().toISOString(),
    })
    res.status(201).json({ assigned: true })
  } catch (err) {
    console.error('[labels.assign] failed', err)
    res.status(500).json({
      error: t('labels.assignError', undefined, { defaultValue: 'Failed to assign label' }),
    })
  }
})

router.delete('/:labelId/emails/:emailId', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  try {
    const label = await findById<Record<string, unknown>>(
      'email_labels',
      req.params.labelId as string,
    )
    if (!label || label.user_id !== userId) {
      return res.status(404).json({
        error: t('labels.notFound', undefined, { defaultValue: 'Label not found' }),
      })
    }
    await deleteMany('email_label_assignments', [
      { field: 'label_id', operator: '=', value: req.params.labelId as string },
      { field: 'email_id', operator: '=', value: req.params.emailId as string },
    ])
    res.status(204).end()
  } catch (err) {
    console.error('[labels.unassign] failed', err)
    res.status(500).json({
      error: t('labels.unassignError', undefined, { defaultValue: 'Failed to unassign label' }),
    })
  }
})

export default router
