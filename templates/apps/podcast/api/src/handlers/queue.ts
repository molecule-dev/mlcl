/**
 * Queue handler — owner only.
 *
 * Stores a per-user reorderable up-next list of episodes.
 * Authorization: every read/write is scoped by the authenticated session
 * userId.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const addItemSchema = z.object({
  episode_id: z.string().uuid(),
  position: z.number().int().nonnegative().optional(),
})

const reorderSchema = z.object({
  position: z.number().int().nonnegative(),
})

const reorderAllSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), position: z.number().int().nonnegative() })),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const items = await findMany<Record<string, unknown>>('queue_items', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    // Decorate each row with episode_title / show_title / duration_seconds
    // / audio_url so the Queue page can render rich rows in one round-trip
    // (the UI already depends on these fields). Per-row N+1 lookups are
    // acceptable here — the queue is bounded to a couple dozen rows.
    const decorated = await Promise.all(
      items.map(async (item) => {
        const ep = await findById<Record<string, unknown>>('episodes', String(item.episode_id))
        if (!ep)
          return {
            ...item,
            episode_title: '',
            show_title: '',
            duration_seconds: 0,
            audio_url: null,
          }
        const show = await findById<Record<string, unknown>>('shows', String(ep.show_id))
        return {
          ...item,
          episode_title: ep.title ?? '',
          show_id: ep.show_id ?? null,
          show_title: show?.title ?? '',
          duration_seconds: ep.duration_seconds ?? 0,
          audio_url: ep.audio_url ?? null,
        }
      }),
    )
    res.json(decorated)
  } catch (error) {
    logger.error('queue.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

// Drop everything in the user's queue. Idempotent — empty queue → 204.
router.delete('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const rows = await findMany<Record<string, unknown>>('queue_items', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    for (const row of rows) {
      await deleteById('queue_items', String(row.id))
    }
    res.status(204).end()
  } catch (error) {
    logger.error('queue.clear', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(addItemSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const { episode_id, position } = req.body as z.infer<typeof addItemSchema>
    const episode = await findById('episodes', episode_id)
    if (!episode) {
      res
        .status(404)
        .json({ error: t('episodes.notFound', undefined, { defaultValue: 'Episode not found' }) })
      return
    }
    const existing = await findMany<Record<string, unknown>>('queue_items', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    const nextPosition = position ?? existing.length
    const result = await create('queue_items', {
      user_id: userId,
      episode_id,
      position: nextPosition,
      added_at: new Date(),
    })
    res.status(201).json(result.data ?? result)
  } catch (error) {
    logger.error('queue.add', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(reorderSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const item = await findById<Record<string, unknown>>('queue_items', idOf(req))
      if (!item) {
        res
          .status(404)
          .json({ error: t('queue.notFound', undefined, { defaultValue: 'Queue item not found' }) })
        return
      }
      // owner-only — never expose another user's queue.
      if (item.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('queue.notFound', undefined, { defaultValue: 'Queue item not found' }) })
        return
      }
      const { position } = req.body as z.infer<typeof reorderSchema>
      const result = await updateById('queue_items', idOf(req), { position })
      res.json(result.data ?? result)
    } catch (error) {
      logger.error('queue.reorderItem', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post('/reorder', validateBody(reorderAllSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const { items } = req.body as z.infer<typeof reorderAllSchema>
    for (const item of items) {
      const existing = await findById<Record<string, unknown>>('queue_items', item.id)
      if (existing && existing.user_id === userId) {
        await updateById('queue_items', item.id, { position: item.position })
      }
    }
    res.json({ reordered: true })
  } catch (error) {
    logger.error('queue.reorderAll', error)
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
    const item = await findById<Record<string, unknown>>('queue_items', idOf(req))
    if (!item) {
      res
        .status(404)
        .json({ error: t('queue.notFound', undefined, { defaultValue: 'Queue item not found' }) })
      return
    }
    if (item.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('queue.notFound', undefined, { defaultValue: 'Queue item not found' }) })
      return
    }
    await deleteById('queue_items', idOf(req))
    res.status(204).end()
  } catch (error) {
    logger.error('queue.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
