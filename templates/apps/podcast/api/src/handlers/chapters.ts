/**
 * Chapters handler — show owner writes; reads are public.
 *
 * Authorization: by-id mutation looks up the parent episode → show and
 * asserts `show.author_id === userId`.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)
const episodeIdOf = (req: Request): string => String(req.params.episodeId)

const episodeIdParamSchema = z.object({ episodeId: z.string().uuid() })
const indexQuerySchema = z.object({ episode_id: z.string().uuid() })

// Canonical query path used by EpisodePlayer.tsx (`?episode_id=...`).
// `/by-episode/:episodeId` is kept for back-compat callers.
router.get('/', validateQuery(indexQuerySchema), async (req: Request, res: Response) => {
  try {
    const { episode_id } = req.query as unknown as z.infer<typeof indexQuerySchema>
    const chapters = await findMany('chapters', {
      where: [{ field: 'episode_id', operator: '=', value: episode_id }],
      orderBy: [{ field: 'start_seconds', direction: 'asc' }],
    })
    res.json(chapters)
  } catch (error) {
    logger.error('chapters.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

const createChapterSchema = z.object({
  episode_id: z.string().uuid(),
  start_seconds: z.number().int().nonnegative(),
  title: z.string().min(1).max(500),
})

const updateChapterSchema = z.object({
  start_seconds: z.number().int().nonnegative().optional(),
  title: z.string().min(1).max(500).optional(),
})

async function getEpisodeOwnerId(episodeId: string): Promise<string | null> {
  const episode = await findById<Record<string, unknown>>('episodes', episodeId)
  if (!episode) return null
  const show = await findById<Record<string, unknown>>('shows', String(episode.show_id))
  return show ? ((show.author_id as string | null) ?? null) : null
}

router.get(
  '/by-episode/:episodeId',
  validateParams(episodeIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const chapters = await findMany('chapters', {
        where: [{ field: 'episode_id', operator: '=', value: episodeIdOf(req) }],
        orderBy: [{ field: 'start_seconds', direction: 'asc' }],
      })
      res.json(chapters)
    } catch (error) {
      logger.error('chapters.byEpisode', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post('/', validateBody(createChapterSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createChapterSchema>
    const ownerId = await getEpisodeOwnerId(body.episode_id)
    if (!ownerId) {
      res
        .status(404)
        .json({ error: t('episodes.notFound', undefined, { defaultValue: 'Episode not found' }) })
      return
    }
    if (ownerId !== userId) {
      res
        .status(403)
        .json({ error: t('shows.forbidden', undefined, { defaultValue: 'Not your show' }) })
      return
    }
    const result = await create('chapters', {
      episode_id: body.episode_id,
      user_id: userId,
      start_seconds: body.start_seconds,
      title: body.title,
      created_at: new Date(),
    })
    res.status(201).json(result.data ?? result)
  } catch (error) {
    logger.error('chapters.create', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateChapterSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const chapter = await findById<Record<string, unknown>>('chapters', idOf(req))
      if (!chapter) {
        res
          .status(404)
          .json({ error: t('chapters.notFound', undefined, { defaultValue: 'Chapter not found' }) })
        return
      }
      const ownerId = await getEpisodeOwnerId(String(chapter.episode_id))
      if (ownerId !== userId) {
        res
          .status(403)
          .json({ error: t('shows.forbidden', undefined, { defaultValue: 'Not your show' }) })
        return
      }
      const result = await updateById('chapters', idOf(req), { ...req.body })
      res.json(result.data ?? result)
    } catch (error) {
      logger.error('chapters.update', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const chapter = await findById<Record<string, unknown>>('chapters', idOf(req))
    if (!chapter) {
      res
        .status(404)
        .json({ error: t('chapters.notFound', undefined, { defaultValue: 'Chapter not found' }) })
      return
    }
    const ownerId = await getEpisodeOwnerId(String(chapter.episode_id))
    if (ownerId !== userId) {
      res
        .status(403)
        .json({ error: t('shows.forbidden', undefined, { defaultValue: 'Not your show' }) })
      return
    }
    await deleteById('chapters', idOf(req))
    res.status(204).end()
  } catch (error) {
    logger.error('chapters.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
