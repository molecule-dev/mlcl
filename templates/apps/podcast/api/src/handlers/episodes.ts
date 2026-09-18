/**
 * Episodes handler — show owner writes; reads are public when published.
 *
 * Authorization: every mutation looks up the parent show and asserts
 * `show.author_id === userId`. Reads on draft episodes 404 to non-owners.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getProvider as getSpeechProvider } from '@molecule/api-ai-speech'
import { getProvider as getSummarizationProvider } from '@molecule/api-ai-summarization'
import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'
import { index as indexDoc } from '@molecule/api-search'

import { notifyNewEpisodeSubscribers } from '../lib/notify-subscribers.js'
import { safeFetch } from '../lib/safe-fetch.js'
import type { PodcastLimits } from '../tiers.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)
const showIdOf = (req: Request): string => String(req.params.showId)

const showIdParamSchema = z.object({ showId: z.string().uuid() })

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
})

const createEpisodeSchema = z.object({
  show_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().optional().default(''),
  episode_number: z.number().int().positive().optional(),
  season_number: z.number().int().positive().optional().default(1),
  audio_url: z.string().optional(),
  duration_seconds: z.number().int().nonnegative().optional().default(0),
})

const updateEpisodeSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  episode_number: z.number().int().positive().optional(),
  season_number: z.number().int().positive().optional(),
  audio_url: z.string().optional(),
  duration_seconds: z.number().int().nonnegative().optional(),
})

const audioSchema = z.object({
  audio_url: z.string().min(1),
  duration_seconds: z.number().int().nonnegative().optional().default(0),
})

const progressSchema = z.object({
  position_sec: z.number().int().nonnegative(),
  completed: z.boolean().optional(),
})

async function tryIndex(id: string, doc: Record<string, unknown>): Promise<void> {
  try {
    await indexDoc('episodes', id, doc)
  } catch (_error) {
    // Search indexing is best-effort; DB is the source of truth
  }
}

const indexQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  show_id: z.string().uuid().optional(),
  saved: z.coerce.boolean().optional(),
  recent: z.coerce.boolean().optional(),
})

/**
 * Decorate an episode row with the show's title and a stable cover_index.
 * The frontend's Discover/Library/Search pages render episodes against a
 * gradient palette keyed by `cover_index` and want the show_title inline so
 * they don't have to round-trip per row.
 *
 * `cover_index` is derived deterministically from the show id so reloads
 * don't reshuffle the grid (12 cover variants in the design system).
 */
function decorate(
  ep: Record<string, unknown>,
  show: Record<string, unknown> | null,
): Record<string, unknown> {
  const sid = show?.id ? String(show.id) : ep.show_id ? String(ep.show_id) : ''
  let h = 0
  for (let i = 0; i < sid.length; i++) h = (h * 31 + sid.charCodeAt(i)) >>> 0
  return {
    ...ep,
    show_title: show?.title ?? '',
    cover_index: h % 12,
  }
}

/**
 * List episodes. Supports three modes:
 *   - `?show_id=...`  → episodes for a specific show (drafts hidden from non-owners)
 *   - `?saved=true`   → episodes the caller has saved (saved_episodes table)
 *   - default         → recently published episodes across all shows
 */
router.get('/', validateQuery(indexQuerySchema), async (req: Request, res: Response) => {
  try {
    const { page, limit, show_id, saved } = req.query as unknown as z.infer<typeof indexQuerySchema>
    const userId = getUserId(res)

    if (saved) {
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const savedRows = await findMany<Record<string, unknown>>('saved_episodes', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'saved_at', direction: 'desc' }],
        limit,
        offset: (page - 1) * limit,
      })
      const out = await Promise.all(
        savedRows.map(async (row) => {
          const ep = await findById<Record<string, unknown>>('episodes', String(row.episode_id))
          if (!ep) return null
          const show = await findById<Record<string, unknown>>('shows', String(ep.show_id))
          return { ...decorate(ep, show), saved_at: row.saved_at }
        }),
      )
      res.json(out.filter(Boolean))
      return
    }

    if (show_id) {
      const show = await findById<Record<string, unknown>>('shows', show_id)
      if (!show) {
        res
          .status(404)
          .json({ error: t('shows.notFound', undefined, { defaultValue: 'Show not found' }) })
        return
      }
      const where: WhereCondition[] = [{ field: 'show_id', operator: '=', value: show_id }]
      if (show.author_id !== userId) {
        where.push({ field: 'status', operator: '=', value: 'published' })
      }
      const rows = await findMany<Record<string, unknown>>('episodes', {
        where,
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field: 'episode_number', direction: 'desc' }],
      })
      res.json(rows.map((ep) => decorate(ep, show)))
      return
    }

    // Recent published episodes across all shows.
    const rows = await findMany<Record<string, unknown>>('episodes', {
      where: [{ field: 'status', operator: '=', value: 'published' }],
      orderBy: [{ field: 'published_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    const out = await Promise.all(
      rows.map(async (ep) => {
        const show = await findById<Record<string, unknown>>('shows', String(ep.show_id))
        return decorate(ep, show)
      }),
    )
    res.json(out)
  } catch (error) {
    logger.error('episodes.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

// List episodes for a show (public when published) — kept for back-compat
// callers; the canonical path is `GET /episodes?show_id=...` above.
router.get(
  '/by-show/:showId',
  validateParams(showIdParamSchema),
  validateQuery(listQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
      const userId = getUserId(res)
      const show = await findById<Record<string, unknown>>('shows', showIdOf(req))
      if (!show) {
        res
          .status(404)
          .json({ error: t('shows.notFound', undefined, { defaultValue: 'Show not found' }) })
        return
      }
      const where: WhereCondition[] = [{ field: 'show_id', operator: '=', value: showIdOf(req) }]
      // Non-owners only see published episodes.
      if (show.author_id !== userId) {
        where.push({ field: 'status', operator: '=', value: 'published' })
      }
      const episodes = await findMany<Record<string, unknown>>('episodes', {
        where,
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field: 'episode_number', direction: 'desc' }],
      })
      res.json(episodes.map((ep) => decorate(ep, show)))
    } catch (error) {
      logger.error('episodes.byShow', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const episode = await findById<Record<string, unknown>>('episodes', idOf(req))
    if (!episode) {
      res
        .status(404)
        .json({ error: t('episodes.notFound', undefined, { defaultValue: 'Episode not found' }) })
      return
    }
    const show = await findById<Record<string, unknown>>('shows', String(episode.show_id))
    // Hide drafts from non-owners.
    if (episode.status !== 'published') {
      if (!show || show.author_id !== userId) {
        res
          .status(404)
          .json({ error: t('episodes.notFound', undefined, { defaultValue: 'Episode not found' }) })
        return
      }
    }
    // Decorate with `show_title` and `cover_index` so the player page
    // can render the back-link and album art without round-tripping
    // /api/shows/:id from the client. Mirrors the list endpoint contract.
    res.json(decorate(episode, show))
  } catch (error) {
    logger.error('episodes.getById', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/',
  enforceLimit<PodcastLimits>({
    limitType: 'maxEpisodes',
    getLimit: (limits) => limits.maxEpisodes,
    getCurrent: async (userId) =>
      count('episodes', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as never,
  validateBody(createEpisodeSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const body = req.body as z.infer<typeof createEpisodeSchema>
      const show = await findById<Record<string, unknown>>('shows', body.show_id)
      if (!show) {
        res
          .status(404)
          .json({ error: t('shows.notFound', undefined, { defaultValue: 'Show not found' }) })
        return
      }
      // requireOwner — only show author may add episodes.
      if (show.author_id !== userId) {
        res
          .status(403)
          .json({ error: t('shows.forbidden', undefined, { defaultValue: 'Not your show' }) })
        return
      }

      const result = await create('episodes', {
        show_id: body.show_id,
        user_id: userId,
        title: body.title,
        description: body.description,
        episode_number: body.episode_number ?? ((show.episode_count as number) ?? 0) + 1,
        season_number: body.season_number,
        audio_url: body.audio_url ?? null,
        duration_seconds: body.duration_seconds,
        status: 'draft',
        play_count: 0,
        published_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data ?? result)
    } catch (error) {
      logger.error('episodes.create', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateEpisodeSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const episode = await findById<Record<string, unknown>>('episodes', idOf(req))
      if (!episode) {
        res
          .status(404)
          .json({ error: t('episodes.notFound', undefined, { defaultValue: 'Episode not found' }) })
        return
      }
      const show = await findById<Record<string, unknown>>('shows', String(episode.show_id))
      if (!show || show.author_id !== userId) {
        res
          .status(403)
          .json({ error: t('shows.forbidden', undefined, { defaultValue: 'Not your show' }) })
        return
      }
      const result = await updateById('episodes', idOf(req), {
        ...req.body,
        updated_at: new Date(),
      })
      res.json(result.data ?? result)
    } catch (error) {
      logger.error('episodes.update', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post(
  '/:id/audio',
  validateParams(idParamSchema),
  validateBody(audioSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const episode = await findById<Record<string, unknown>>('episodes', idOf(req))
      if (!episode) {
        res
          .status(404)
          .json({ error: t('episodes.notFound', undefined, { defaultValue: 'Episode not found' }) })
        return
      }
      const show = await findById<Record<string, unknown>>('shows', String(episode.show_id))
      if (!show || show.author_id !== userId) {
        res
          .status(403)
          .json({ error: t('shows.forbidden', undefined, { defaultValue: 'Not your show' }) })
        return
      }
      const { audio_url, duration_seconds } = req.body as z.infer<typeof audioSchema>
      const result = await updateById('episodes', idOf(req), {
        audio_url,
        duration_seconds,
        updated_at: new Date(),
      })
      res.json(result.data ?? result)
    } catch (error) {
      logger.error('episodes.audio', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post(
  '/:id/transcribe',
  validateParams(idParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const episode = await findById<Record<string, unknown>>('episodes', idOf(req))
      if (!episode) {
        res
          .status(404)
          .json({ error: t('episodes.notFound', undefined, { defaultValue: 'Episode not found' }) })
        return
      }
      const show = await findById<Record<string, unknown>>('shows', String(episode.show_id))
      if (!show || show.author_id !== userId) {
        res
          .status(403)
          .json({ error: t('shows.forbidden', undefined, { defaultValue: 'Not your show' }) })
        return
      }
      if (!episode.audio_url) {
        res.status(400).json({
          error: t('episodes.noAudio', undefined, { defaultValue: 'No audio uploaded yet' }),
        })
        return
      }
      let transcript = ''
      // Provider is optional — if no speech bond is wired, or the bond
      // doesn't expose `transcribe()`, the route still returns a stored
      // (empty) transcript so callers can update show notes manually.
      const provider = getSpeechProvider()
      if (provider?.transcribe) {
        let audioBuf: Uint8Array
        try {
          // SSRF-safe fetch: audio_url is user-supplied at episode creation/upload
          // time. safeFetch pins the connection away from private/internal/metadata
          // addresses (e.g. the cloud metadata endpoint 169.254.169.254) INSIDE the
          // same DNS resolution undici connects with — so there is no
          // validate-then-fetch rebinding window — and never auto-follows redirects,
          // so a 3xx cannot bounce the request to an internal host. On block/failure
          // we return 400 and never reach an internal target.
          const audioRes = await safeFetch(String(episode.audio_url))
          audioBuf = new Uint8Array(await audioRes.arrayBuffer())
        } catch (fetchError) {
          logger.warn('episodes.transcribe.ssrf', fetchError)
          res.status(400).json({
            error: t('episodes.audioUrlBlocked', undefined, {
              defaultValue: 'Audio URL is not allowed',
            }),
          })
          return
        }
        try {
          const out = await provider.transcribe({ audio: audioBuf })
          transcript = out.text ?? ''
        } catch (providerError) {
          // Speech provider failed; store empty transcript for manual editing
          logger.warn('episodes.transcribe.provider', providerError)
          transcript = ''
        }
      }
      const result = await updateById('episodes', idOf(req), {
        transcript,
        updated_at: new Date(),
      })
      res.json(result.data ?? result)
    } catch (error) {
      logger.error('episodes.transcribe', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post(
  '/:id/summarize',
  validateParams(idParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const episode = await findById<Record<string, unknown>>('episodes', idOf(req))
      if (!episode) {
        res
          .status(404)
          .json({ error: t('episodes.notFound', undefined, { defaultValue: 'Episode not found' }) })
        return
      }
      const show = await findById<Record<string, unknown>>('shows', String(episode.show_id))
      if (!show || show.author_id !== userId) {
        res
          .status(403)
          .json({ error: t('shows.forbidden', undefined, { defaultValue: 'Not your show' }) })
        return
      }
      const transcript =
        (episode.transcript as string | null) ?? (episode.description as string | null) ?? ''
      if (!transcript) {
        res.status(400).json({
          error: t('episodes.noTranscript', undefined, {
            defaultValue: 'No transcript or description to summarize',
          }),
        })
        return
      }
      let summary: string
      try {
        // Summarize the transcript with the bonded AI summarizer (wired in
        // bonds/index.ts via setupAiSummarizationLlm). If no provider is bonded
        // (e.g. no ANTHROPIC_API_KEY) fall back to a truncated excerpt so the
        // show notes still have content the author can edit.
        const provider = getSummarizationProvider()
        if (provider) {
          const out = await provider.summarize({ text: transcript })
          summary = out.summary
        } else {
          summary = transcript.length > 200 ? transcript.slice(0, 200) + '...' : transcript
        }
      } catch (_error) {
        // Summarization provider failed; fall back to transcript excerpt
        summary = transcript.length > 200 ? transcript.slice(0, 200) + '...' : transcript
      }
      const result = await updateById('episodes', idOf(req), {
        summary,
        show_notes: summary,
        updated_at: new Date(),
      })
      res.json(result.data ?? result)
    } catch (error) {
      logger.error('episodes.summarize', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post('/:id/publish', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const episode = await findById<Record<string, unknown>>('episodes', idOf(req))
    if (!episode) {
      res
        .status(404)
        .json({ error: t('episodes.notFound', undefined, { defaultValue: 'Episode not found' }) })
      return
    }
    const show = await findById<Record<string, unknown>>('shows', String(episode.show_id))
    if (!show || show.author_id !== userId) {
      res
        .status(403)
        .json({ error: t('shows.forbidden', undefined, { defaultValue: 'Not your show' }) })
      return
    }
    const result = await updateById('episodes', idOf(req), {
      status: 'published',
      published_at: new Date(),
      updated_at: new Date(),
    })
    await updateById('shows', String(episode.show_id), {
      episode_count: ((show.episode_count as number) ?? 0) + 1,
    })
    const published = (result.data ?? result) as Record<string, unknown>
    if (published?.id) await tryIndex(String(published.id), published)

    // Notify subscribers — best-effort, never block the publish flow. Honors each
    // subscriber's stored `notifyNewEpisode` preference (was notified unconditionally).
    try {
      await notifyNewEpisodeSubscribers({
        showId: String(episode.show_id),
        episodeId: String(published.id ?? ''),
        title: episode.title,
      })
    } catch (_error) {
      // Notifications are best-effort; publish must not fail if notify loop errors
    }

    res.json(published)
  } catch (error) {
    logger.error('episodes.publish', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/:id/progress',
  validateParams(idParamSchema),
  validateBody(progressSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const { position_sec, completed } = req.body as z.infer<typeof progressSchema>
      const existing = await findMany<Record<string, unknown>>('listening_progress', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'episode_id', operator: '=', value: idOf(req) },
        ],
        limit: 1,
      })
      if (existing[0]) {
        await updateById('listening_progress', String(existing[0].id), {
          position_sec,
          completed_at: completed ? new Date() : null,
          updated_at: new Date(),
        })
      } else {
        await create('listening_progress', {
          user_id: userId,
          episode_id: idOf(req),
          position_sec,
          completed_at: completed ? new Date() : null,
          updated_at: new Date(),
        })
      }
      // Also bump play_count once on first progress update.
      const episode = await findById<Record<string, unknown>>('episodes', idOf(req))
      if (episode) {
        await updateById('episodes', idOf(req), {
          play_count: ((episode.play_count as number) ?? 0) + 1,
        })
      }
      res.json({ saved: true })
    } catch (error) {
      logger.error('episodes.progress', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.get('/:id/progress', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const rows = await findMany('listening_progress', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'episode_id', operator: '=', value: idOf(req) },
      ],
      limit: 1,
    })
    res.json(rows[0] ?? { position_sec: 0, completed_at: null })
  } catch (error) {
    logger.error('episodes.getProgress', error)
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
    const episode = await findById<Record<string, unknown>>('episodes', idOf(req))
    if (!episode) {
      res
        .status(404)
        .json({ error: t('episodes.notFound', undefined, { defaultValue: 'Episode not found' }) })
      return
    }
    const show = await findById<Record<string, unknown>>('shows', String(episode.show_id))
    if (!show || show.author_id !== userId) {
      res
        .status(403)
        .json({ error: t('shows.forbidden', undefined, { defaultValue: 'Not your show' }) })
      return
    }
    await deleteById('episodes', idOf(req))
    // Keep the denormalized count in sync: shows.episode_count counts PUBLISHED
    // episodes (it is incremented on publish), so decrement it only when a
    // published episode is deleted — deleting a draft was never counted. Math.max
    // guards against going negative if the count ever drifts.
    if (episode.status === 'published') {
      await updateById('shows', String(episode.show_id), {
        episode_count: Math.max(0, ((show.episode_count as number) ?? 0) - 1),
      })
    }
    res.status(204).end()
  } catch (error) {
    logger.error('episodes.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
