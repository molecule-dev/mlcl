/**
 * Recipients handler — `recipients` CRUD (saved transfer destinations).
 *
 * - Validates payloads via `@molecule/api-middleware-validation`.
 * - Reads/writes scoped by `user_id` (no IDOR).
 *
 * Returned rows include both the storage-native `mask` field and the
 * UI-facing aliases (`account_last4`, `routing`) so the Transfers form
 * can render the saved destination's last-4 and routing-tag without
 * needing to know which column the data lives in.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface RecipientRow {
  id: string
  user_id: string
  name: string
  institution?: string | null
  mask?: string | null
  kind?: string | null
  created_at?: string | Date | null
}

function shape(row: RecipientRow): Record<string, unknown> {
  const last4 = (row.mask ?? '').slice(-4)
  return {
    ...row,
    mask: row.mask ?? '',
    account_last4: last4,
    routing: last4,
  }
}

const createRecipientSchema = z.object({
  name: z.string().min(1),
  institution: z.string().optional(),
  mask: z.string().optional(),
  kind: z.string().optional(),
})

const updateRecipientSchema = z.object({
  name: z.string().min(1).optional(),
  institution: z.string().optional(),
  mask: z.string().optional(),
  kind: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const rows = await findMany<RecipientRow>('recipients', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(rows.map(shape))
  } catch (_err) {
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const r = await findById<RecipientRow>('recipients', getParamId(req))
    if (!r || r.user_id !== userId) {
      return res.status(404).json({ error: t('recipients.notFound') })
    }
    res.json(shape(r))
  } catch (_err) {
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createRecipientSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const { name, institution, mask, kind } = req.body
    const result = await create('recipients', {
      user_id: userId,
      name,
      institution: institution ?? null,
      mask: mask ?? null,
      kind: kind ?? 'external',
      created_at: new Date(),
    })
    res.status(201).json(shape((result as unknown as { data: RecipientRow }).data))
  } catch (_err) {
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/:id', validateBody(updateRecipientSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('recipients', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('recipients.notFound') })
    }
    const updates: Record<string, unknown> = {}
    for (const k of ['name', 'institution', 'mask', 'kind'] as const) {
      if (req.body[k] !== undefined) updates[k] = req.body[k]
    }
    const result = await updateById('recipients', id, updates)
    res.json(shape((result as unknown as { data: RecipientRow }).data))
  } catch (_err) {
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('recipients', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('recipients.notFound') })
    }
    await deleteById('recipients', id)
    res.status(204).end()
  } catch (_err) {
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
