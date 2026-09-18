/**
 * Email folders handler — owner-scoped CRUD on user-defined folders.
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

const folderSchema = z.object({
  name: z.string().min(1).max(120),
  color: z.string().max(32).optional().nullable(),
})

const folderPatchSchema = folderSchema.partial()

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
    const folders = await findMany('email_folders', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json(folders)
  } catch (err) {
    console.error('[folders.list] failed', err)
    res.status(500).json({
      error: t('folders.listError', undefined, { defaultValue: 'Failed to list folders' }),
    })
  }
})

// Enforce the per-tier folders cap (tiers.ts maxFolders) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could create unlimited.
const enforceFolderLimit = enforceLimit<EmailClientLimits>({
  limitType: 'maxFolders',
  getLimit: (limits) => limits.maxFolders,
  getCurrent: async (userId) =>
    count('email_folders', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', requireAuth, enforceFolderLimit, async (req, res) => {
  const userId = res.locals.session.userId as string
  const parsed = folderSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const result = await create('email_folders', {
      user_id: userId,
      name: parsed.data.name,
      color: parsed.data.color ?? null,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    console.error('[folders.create] failed', err)
    res.status(500).json({
      error: t('folders.createError', undefined, { defaultValue: 'Failed to create folder' }),
    })
  }
})

router.put('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  const parsed = folderPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const existing = await findById<Record<string, unknown>>(
      'email_folders',
      req.params.id as string,
    )
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('folders.notFound', undefined, { defaultValue: 'Folder not found' }),
      })
    }
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (parsed.data.name !== undefined) patch.name = parsed.data.name
    if (parsed.data.color !== undefined) patch.color = parsed.data.color
    const result = await updateById('email_folders', req.params.id as string, patch)
    res.json(result.data)
  } catch (err) {
    console.error('[folders.update] failed', err)
    res.status(500).json({
      error: t('folders.updateError', undefined, { defaultValue: 'Failed to update folder' }),
    })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  try {
    const existing = await findById<Record<string, unknown>>(
      'email_folders',
      req.params.id as string,
    )
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('folders.notFound', undefined, { defaultValue: 'Folder not found' }),
      })
    }
    await deleteById('email_folders', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    console.error('[folders.delete] failed', err)
    res.status(500).json({
      error: t('folders.deleteError', undefined, { defaultValue: 'Failed to delete folder' }),
    })
  }
})

export default router
