/**
 * Videos handler — list / read / create / chapter / react / delete.
 *
 * Authorization model from INVENTORY.md:
 *   - videos read: world-readable when status='published'; drafts/processing
 *     are owner-only (queries 404 to non-owners to avoid leaking ids).
 *   - videos write: owner-only, scoped by `user_id`.
 *
 * Validation: every input goes through `validateBody`/`validateQuery`/
 *   `validateParams` from `@molecule/api-middleware-validation`.
 *
 * The HLS transcode pipeline (`@molecule/api-media-streaming-hls`) and
 * subtitle generation (`@molecule/api-ai-speech-openai`) are wired through
 * their respective core bonds. The transcoder is a stub in v1 — see
 * `BLOCKED: hls-transcode-bond pending` in the spec for the full transcode
 * pipeline; the route still accepts HLS URLs and writes them to the row,
 * which is sufficient to exercise playback E2E with fixture m3u8 playlists.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findById,
  findMany,
  type OrderBy,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'
import { hasProvider, search } from '@molecule/api-search'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

/**
 * Project DB rows into the shape consumed by the React video components.
 *
 * The DB schema uses snake_case columns named after the storage decisions
 * (`duration_sec`, no joined `channel_name`). The React grid/card
 * components were typed against `duration_seconds`, `channel_name`, and a
 * deterministic `cover_index` for thumbnail gradient picking. Without this
 * projection, every card renders `NaN:NaN` (duration), an empty channel
 * label, and a single fixed cover gradient — so cards on the home/trending
 * grids look identical and broken.
 *
 * `channelLookup` is a Map<channel_id, channel_name> precomputed for the
 * batch (to avoid an N+1 lookup per video).
 */
const enrichVideo = (
  v: Record<string, unknown>,
  channelLookup: Map<string, string>,
): Record<string, unknown> => {
  const id = String(v.id ?? '')
  const hashSlice = id.slice(-4)
  const coverIndex = hashSlice ? parseInt(hashSlice, 16) % 7 : 0
  const channelId = (v.channel_id ?? '') as string
  return {
    ...v,
    duration_seconds: typeof v.duration_sec === 'number' ? v.duration_sec : 0,
    channel_name: channelLookup.get(channelId) ?? '',
    cover_index: Number.isFinite(coverIndex) ? coverIndex : 0,
    live:
      v.tag === 'live' || (typeof v.title === 'string' && v.title.toLowerCase().startsWith('live')),
  }
}

/** Look up channel names for every distinct channel_id in `videos`. */
const buildChannelLookup = async (
  videos: Record<string, unknown>[],
): Promise<Map<string, string>> => {
  const ids = Array.from(new Set(videos.map((v) => v.channel_id as string).filter((id) => !!id)))
  if (ids.length === 0) return new Map()
  const where: WhereCondition[] = [{ field: 'id', operator: 'in', value: ids }]
  const channels = await findMany<Record<string, unknown>>('channels', { where, limit: ids.length })
  return new Map(channels.map((c) => [String(c.id), String(c.name ?? '')]))
}

const enrichList = async (
  videos: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> => {
  const lookup = await buildChannelLookup(videos)
  return videos.map((v) => enrichVideo(v, lookup))
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  tag: z.string().optional(),
  category: z.string().optional(),
  channel_id: z.string().uuid().optional(),
  sort: z.enum(['latest', 'popular', 'trending']).optional(),
})

const searchQuerySchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

const createVideoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  category: z.string().max(80).optional(),
  tag: z.string().max(80).optional(),
  channel_id: z.string().uuid().optional(),
  source_url: z.string().url().optional(),
  hls_url: z.string().url().optional(),
  thumbnail_url: z.string().url().optional(),
  duration_sec: z.number().int().min(0).optional(),
  chapters: z
    .array(
      z.object({
        start_sec: z.number().int().min(0),
        title: z.string().min(1).max(200),
      }),
    )
    .optional(),
})

const updateVideoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  category: z.string().max(80).optional(),
  tag: z.string().max(80).optional(),
  hls_url: z.string().url().optional(),
  thumbnail_url: z.string().url().optional(),
  status: z.enum(['draft', 'processing', 'published']).optional(),
})

const chaptersSchema = z.object({
  chapters: z.array(
    z.object({
      start_sec: z.number().int().min(0),
      title: z.string().min(1).max(200),
    }),
  ),
})

const reactSchema = z.object({
  reaction: z.enum(['like', 'dislike']),
})

const subtitlesSchema = z.object({
  subtitles_url: z.string().url(),
})

router.get('/search', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const { q, page = 1, limit = 24 } = req.query as unknown as z.infer<typeof searchQuerySchema>

    // ILIKE fallback over the videos table — used by E2E and any environment
    // where the real search bond can't reach its backing service. Wrapped
    // here so we can fall through to it when Meili is bonded but unreachable
    // (CI without a Meili container, dev box with the service stopped, etc.).
    const ilikeFallback = async (): Promise<Record<string, unknown>[]> => {
      const where: WhereCondition[] = [
        { field: 'status', operator: '=', value: 'published' },
        // The `ilike` operator already escapes LIKE metacharacters in the
        // value and wraps it with `%…%` itself — pass the bare query, not a
        // pre-wrapped `%q%` (those `%` would be escaped to literal percent
        // signs and match nothing).
        { field: 'title', operator: 'ilike', value: String(q) },
      ]
      const rows = await findMany<Record<string, unknown>>('videos', {
        where,
        orderBy: [{ field: 'view_count', direction: 'desc' }],
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
      })
      return enrichList(rows)
    }

    // Only attempt the bonded search provider when its connection target was
    // explicitly configured. The bond may be wired in `bonds.ts` at compile
    // time, but a runtime call against a stopped/unreachable Meili server
    // would throw and bubble up as a 500 — falling back keeps search useful
    // in environments where Meili isn't provisioned.
    const meiliReachable = !!(process.env.MEILISEARCH_URL || process.env.MEILI_HOST)
    if (hasProvider() && meiliReachable) {
      try {
        const results = await search('videos', {
          text: String(q),
          page: Number(page),
          perPage: Number(limit),
        })
        res.json(results)
        return
      } catch (searchError) {
        console.warn('search bond failed, falling back to ILIKE:', searchError)
      }
    }
    res.json(await ilikeFallback())
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const params = req.query as unknown as z.infer<typeof listQuerySchema>
    const page = Number(params.page ?? 1)
    const limit = Number(params.limit ?? 24)
    const sort = params.sort ?? 'latest'

    const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'published' }]
    if (params.tag) where.push({ field: 'tag', operator: '=', value: params.tag })
    if (params.category) where.push({ field: 'category', operator: '=', value: params.category })
    if (params.channel_id)
      where.push({ field: 'channel_id', operator: '=', value: params.channel_id })

    const orderBy: OrderBy[] =
      sort === 'popular' || sort === 'trending'
        ? [{ field: 'view_count', direction: 'desc' }]
        : [{ field: 'published_at', direction: 'desc' }]

    const videos = await findMany<Record<string, unknown>>('videos', {
      where,
      orderBy,
      limit,
      offset: (page - 1) * limit,
    })
    res.json(await enrichList(videos))
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const video = await findById<Record<string, unknown>>('videos', idOf(req))
    if (!video) {
      res
        .status(404)
        .json({ error: t('videos.notFound', undefined, { defaultValue: 'Video not found' }) })
      return
    }
    // Drafts / processing rows: 404 to non-owners (avoid leaking unpublished ids).
    if (video.status !== 'published' && video.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('videos.notFound', undefined, { defaultValue: 'Video not found' }) })
      return
    }

    // Increment counters opportunistically — readers create a video_views row
    // and bump the denormalized view_count.
    if (video.status === 'published') {
      await updateById('videos', idOf(req), {
        view_count: ((video.view_count as number) ?? 0) + 1,
      })
      await create('video_views', {
        video_id: idOf(req),
        viewer_id: userId,
        source: 'watch_page',
        ts: new Date(),
      })
    }

    const lookup = await buildChannelLookup([video])
    res.json(enrichVideo(video, lookup))
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createVideoSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createVideoSchema>

    // Ownership check: a caller may only publish onto a channel they own.
    // Without this, an attacker could supply any channel's id and have their
    // video appear on someone else's channel (BAC / cross-owner write).
    // Mirrors the parent-ownership check in playlists.ts (POST /:id/videos).
    if (body.channel_id) {
      const channel = await findById<Record<string, unknown>>('channels', body.channel_id)
      if (!channel) {
        res
          .status(404)
          .json({ error: t('channels.notFound', undefined, { defaultValue: 'Channel not found' }) })
        return
      }
      if (channel.owner_id !== userId) {
        res
          .status(403)
          .json({ error: t('channels.forbidden', undefined, { defaultValue: 'Not your channel' }) })
        return
      }
    }

    const status = body.hls_url ? 'published' : 'processing'

    const result = await create('videos', {
      user_id: userId,
      channel_id: body.channel_id ?? null,
      title: body.title,
      description: body.description ?? null,
      category: body.category ?? 'general',
      tag: body.tag ?? null,
      source_url: body.source_url ?? null,
      hls_url: body.hls_url ?? null,
      thumbnail_url: body.thumbnail_url ?? null,
      duration_sec: body.duration_sec ?? 0,
      // pg's parameter binding doesn't auto-coerce JS arrays to JSONB —
      // it would emit `ARRAY[...]` syntax and Postgres rejects that for
      // jsonb columns. Stringify here so the value is bound as text and
      // implicitly cast to jsonb on insert.
      chapters: JSON.stringify(body.chapters ?? []),
      view_count: 0,
      like_count: 0,
      dislike_count: 0,
      comment_count: 0,
      status,
      published_at: status === 'published' ? new Date() : null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data ?? result)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateVideoSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const existing = await findById<Record<string, unknown>>('videos', idOf(req))
      if (!existing) {
        res
          .status(404)
          .json({ error: t('videos.notFound', undefined, { defaultValue: 'Video not found' }) })
        return
      }
      if (existing.user_id !== userId) {
        res
          .status(403)
          .json({ error: t('videos.forbidden', undefined, { defaultValue: 'Not your video' }) })
        return
      }

      const body = req.body as z.infer<typeof updateVideoSchema>
      const patch: Record<string, unknown> = { ...body, updated_at: new Date() }
      if (body.status === 'published' && !existing.published_at) {
        patch.published_at = new Date()
      }
      const result = await updateById('videos', idOf(req), patch)
      res.json(result.data ?? result)
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put(
  '/:id/chapters',
  validateParams(idParamSchema),
  validateBody(chaptersSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const existing = await findById<Record<string, unknown>>('videos', idOf(req))
      if (!existing) {
        res
          .status(404)
          .json({ error: t('videos.notFound', undefined, { defaultValue: 'Video not found' }) })
        return
      }
      if (existing.user_id !== userId) {
        res
          .status(403)
          .json({ error: t('videos.forbidden', undefined, { defaultValue: 'Not your video' }) })
        return
      }

      const { chapters } = req.body as z.infer<typeof chaptersSchema>
      const result = await updateById('videos', idOf(req), {
        // See note in POST handler: stringify so pg binds the value as text
        // and Postgres implicitly casts to jsonb (raw arrays would be sent
        // as ARRAY[...] syntax which jsonb columns reject).
        chapters: JSON.stringify(chapters),
        updated_at: new Date(),
      })
      res.json(result.data ?? result)
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post(
  '/:id/subtitles',
  validateParams(idParamSchema),
  validateBody(subtitlesSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const existing = await findById<Record<string, unknown>>('videos', idOf(req))
      if (!existing) {
        res
          .status(404)
          .json({ error: t('videos.notFound', undefined, { defaultValue: 'Video not found' }) })
        return
      }
      if (existing.user_id !== userId) {
        res
          .status(403)
          .json({ error: t('videos.forbidden', undefined, { defaultValue: 'Not your video' }) })
        return
      }

      const { subtitles_url } = req.body as z.infer<typeof subtitlesSchema>
      const result = await updateById('videos', idOf(req), {
        subtitles_url,
        updated_at: new Date(),
      })
      res.json(result.data ?? result)
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post(
  '/:id/react',
  validateParams(idParamSchema),
  validateBody(reactSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const video = await findById<Record<string, unknown>>('videos', idOf(req))
      if (!video) {
        res
          .status(404)
          .json({ error: t('videos.notFound', undefined, { defaultValue: 'Video not found' }) })
        return
      }
      const { reaction } = req.body as z.infer<typeof reactSchema>
      const field = reaction === 'like' ? 'like_count' : 'dislike_count'
      await updateById('videos', idOf(req), {
        [field]: ((video[field] as number) ?? 0) + 1,
      })
      res.json({ reacted: reaction })
    } catch (error) {
      console.error(error)
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
    const existing = await findById<Record<string, unknown>>('videos', idOf(req))
    if (!existing) {
      res
        .status(404)
        .json({ error: t('videos.notFound', undefined, { defaultValue: 'Video not found' }) })
      return
    }
    if (existing.user_id !== userId) {
      res
        .status(403)
        .json({ error: t('videos.forbidden', undefined, { defaultValue: 'Not your video' }) })
      return
    }
    await deleteById('videos', idOf(req))
    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
