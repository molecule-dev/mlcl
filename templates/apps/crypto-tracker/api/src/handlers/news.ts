import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId } from '@molecule/api-bonds-default-express'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listNewsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
})

const idParamSchema = z.object({
  id: z.string().min(1),
})

router.get('/', validateQuery(listNewsQuerySchema), async (req: Request, res: Response) => {
  try {
    const { limit } = req.query as { limit?: number }
    const items = await findMany('crypto_news', {
      orderBy: [{ field: 'published_at', direction: 'desc' }],
      limit: limit ?? 50,
    })
    res.json(items)
  } catch (err) {
    console.error('[crypto-tracker] news handler failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    // News rows are global / public-read by design — no user_id authz here.
    const article = await findById('crypto_news', getParamId(req))
    if (!article) {
      return res.status(404).json({ error: t('news.notFound') })
    }
    res.json(article)
  } catch (err) {
    console.error('[crypto-tracker] news handler failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
