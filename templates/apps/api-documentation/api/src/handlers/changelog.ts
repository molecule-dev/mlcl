import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { isUuid } from '../lib/is-uuid.js'
import { requireAdmin } from '../middleware/require-admin.js'

const router = Router()

const createSchema = z.object({
  version: z.string().min(1),
  spec_id: z.string().optional(),
  released_at: z.string().optional(),
  entries: z.array(z.unknown()).optional(),
  is_public: z.boolean().optional(),
})

const updateSchema = createSchema.partial()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const orderBy: OrderBy[] = [{ field: 'released_at', direction: 'desc' }]
    // Only public entries are visible on the public changelog surface. An admin can mark an entry
    // non-public (is_public:false) via the authenticated routes; the list previously had no where
    // clause, so a non-public entry leaked to every visitor.
    const where: WhereCondition[] = [{ field: 'is_public', operator: '=', value: true }]
    const rows = await findMany('changelog', { where, orderBy })
    res.json(rows)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!isUuid(getParamId(req))) return res.status(404).json({ error: t('changelog.notFound') })
    const row = await findById<Record<string, unknown>>('changelog', getParamId(req))
    // A non-public entry must not be readable by id on the public surface either.
    if (!row || row.is_public === false)
      return res.status(404).json({ error: t('changelog.notFound') })
    res.json(row)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', requireAdmin, validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const { entries, released_at, ...rest } = req.body
    const result = await create('changelog', {
      ...rest,
      user_id: userId,
      released_at: released_at ? new Date(released_at) : new Date(),
      entries: JSON.stringify(entries ?? []),
      is_public: rest.is_public ?? true,
      created_at: new Date(),
    })
    res.status(201).json((result as { data?: unknown }).data ?? result)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put(
  '/:id',
  requireAdmin,
  validateBody(updateSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
      const id = getParamId(req)
      if (!isUuid(id)) return res.status(404).json({ error: t('changelog.notFound') })
      const existing = await findById<Record<string, unknown>>('changelog', id)
      if (!existing) return res.status(404).json({ error: t('changelog.notFound') })
      if (existing.user_id && existing.user_id !== userId) {
        return res.status(403).json({ error: t('errors.forbidden') })
      }
      const { entries, released_at, ...rest } = req.body
      const updates: Record<string, unknown> = { ...rest }
      if (entries !== undefined) updates.entries = JSON.stringify(entries)
      if (released_at !== undefined) updates.released_at = new Date(released_at)
      const result = await updateById('changelog', id, updates)
      res.json((result as { data?: unknown }).data ?? result)
    } catch (error) {
      logger.error(error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    if (!isUuid(id)) return res.status(404).json({ error: t('changelog.notFound') })
    const existing = await findById<Record<string, unknown>>('changelog', id)
    if (!existing) return res.status(404).json({ error: t('changelog.notFound') })
    if (existing.user_id && existing.user_id !== userId) {
      return res.status(403).json({ error: t('errors.forbidden') })
    }
    await deleteById('changelog', id)
    res.status(204).end()
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
