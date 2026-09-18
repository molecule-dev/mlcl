/**
 * Saved episodes — per-user shelf.
 *
 * The episode-listing variant lives at `GET /episodes?saved=true` (so the
 * Library page can hit one endpoint with a query flag). This handler
 * exposes only the toggle/add/remove primitives plus a status check.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const createSchema = z.object({ episode_id: z.string().uuid() })

router.get('/status/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.json({ saved: false })
      return
    }
    const rows = await findMany('saved_episodes', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'episode_id', operator: '=', value: String(req.params.id) },
      ],
      limit: 1,
    })
    res.json({ saved: rows.length > 0 })
  } catch (error) {
    logger.error('saved.status', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const { episode_id } = req.body as z.infer<typeof createSchema>
    const episode = await findById('episodes', episode_id)
    if (!episode) {
      res
        .status(404)
        .json({ error: t('episodes.notFound', undefined, { defaultValue: 'Episode not found' }) })
      return
    }
    // Idempotent: if the unique constraint trips we just return saved=true.
    const existing = await findMany('saved_episodes', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'episode_id', operator: '=', value: episode_id },
      ],
      limit: 1,
    })
    if (existing.length > 0) {
      res.status(200).json({ saved: true })
      return
    }
    await create('saved_episodes', {
      user_id: userId,
      episode_id,
      saved_at: new Date(),
    })
    res.status(201).json({ saved: true })
  } catch (error) {
    logger.error('saved.add', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const rows = await findMany<Record<string, unknown>>('saved_episodes', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'episode_id', operator: '=', value: String(req.params.id) },
      ],
      limit: 1,
    })
    if (rows[0]) await deleteById('saved_episodes', String(rows[0].id))
    res.status(204).end()
  } catch (error) {
    logger.error('saved.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
