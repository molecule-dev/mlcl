import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { isUuid } from '../lib/is-uuid.js'
import { requireAdmin } from '../middleware/require-admin.js'

const router = Router()

const createSchema = z.object({
  language: z.string().min(1),
  package_name: z.string().optional(),
  version: z.string().optional(),
  install_command: z.string().optional(),
  github_url: z.string().optional(),
  example: z.string().optional(),
})

const updateSchema = createSchema.partial()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const orderBy: OrderBy[] = [{ field: 'language', direction: 'asc' }]
    const rows = await findMany('sdks', { orderBy })
    res.json(rows)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!isUuid(getParamId(req))) return res.status(404).json({ error: t('sdks.notFound') })
    const row = await findById<Record<string, unknown>>('sdks', getParamId(req))
    if (!row) return res.status(404).json({ error: t('sdks.notFound') })
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
    const result = await create('sdks', {
      ...req.body,
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
      if (!isUuid(id)) return res.status(404).json({ error: t('sdks.notFound') })
      const existing = await findById<Record<string, unknown>>('sdks', id)
      if (!existing) return res.status(404).json({ error: t('sdks.notFound') })
      const result = await updateById('sdks', id, req.body)
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
    if (!isUuid(id)) return res.status(404).json({ error: t('sdks.notFound') })
    const existing = await findById<Record<string, unknown>>('sdks', id)
    if (!existing) return res.status(404).json({ error: t('sdks.notFound') })
    await deleteById('sdks', id)
    res.status(204).end()
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
