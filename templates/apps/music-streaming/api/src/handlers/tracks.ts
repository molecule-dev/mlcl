/**
 * Tracks handler — read catalogue, record plays, upload audio (artist).
 *
 * Authorization model from INVENTORY.md:
 *   - tracks: read open to all auth'd users; writes by track owner (user_id),
 *     i.e. the catalogue admin / artist who created the row. listening_history
 *     is owner-only (user_id from session).
 *   - All inputs validated with `validateBody`/`validateQuery` from
 *     `@molecule/api-middleware-validation`.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  findById,
  findMany,
  findOne,
  updateById,
  updateMany,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { search } from '@molecule/api-search'

import type { MusicStreamingLimits } from '../tiers.js'
import { generateSilentWavBuffer } from './_audio.js'
import { type DBTrack, decorateTracks, loadLikedTrackIds } from './_decorate.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const searchQuerySchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

const createTrackSchema = z.object({
  title: z.string().min(1),
  album_id: z.string().nullable().optional(),
  track_number: z.number().int().min(1).optional(),
  genre: z.string().optional(),
})

const audioUploadSchema = z.object({
  audio_url: z.string().url(),
  duration_seconds: z.number().int().min(0).optional(),
})

router.get('/search', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  try {
    const { q, page = 1, limit = 30 } = req.query as unknown as z.infer<typeof searchQuerySchema>
    const results = await search('tracks', {
      text: String(q),
      page: Number(page),
      perPage: Number(limit),
    })
    res.json(results)
  } catch (error) {
    console.error('music.tracks GET /search', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id/stream', async (_req: Request, res: Response) => {
  // Stream a small WAV file so the client's HTMLAudioElement actually
  // decodes bytes and `currentTime` advances. The file is generated on
  // the fly (not bundled) to keep the smoke artifact tiny — 1 second of
  // silence at 8kHz is ~8KB of PCM.
  try {
    // We don't require a real track row here — the stream is the same
    // demo audio for every track in the catalog. The :id is used so the
    // frontend can keep a stable URL per-track for cache-keying.
    const buf = generateSilentWavBuffer({ durationSeconds: 1, sampleRate: 8000 })
    res.setHeader('Content-Type', 'audio/wav')
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.setHeader('Content-Length', String(buf.length))
    res.status(200).end(buf)
  } catch (error) {
    console.error('music.tracks GET /:id/stream', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const track = await findById<DBTrack>('tracks', idOf(req))
    if (!track) {
      res
        .status(404)
        .json({ error: t('tracks.notFound', undefined, { defaultValue: 'Track not found' }) })
      return
    }
    const userId = getUserId(res)
    const liked = userId
      ? !!(await findOne('liked_tracks', [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'track_id', operator: '=', value: track.id },
        ]))
      : false
    const [decorated] = await decorateTracks([track], { userId })
    res.json({ ...decorated, liked })
  } catch (error) {
    console.error('music.tracks GET /:id', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

// Enforce the per-tier track cap (tiers.ts maxTracks) — defined + shown on Pricing (and CATALOG
// claims it gated) but the create route never enforced it, so any tier made unlimited.
const enforceTrackLimit = enforceLimit<MusicStreamingLimits>({
  limitType: 'maxTracks',
  getLimit: (limits) => limits.maxTracks,
  getCurrent: async (userId) =>
    count('tracks', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceTrackLimit,
  validateBody(createTrackSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const { title, album_id, track_number, genre } = req.body as z.infer<typeof createTrackSchema>

      const result = await create('tracks', {
        user_id: userId,
        title,
        artist_id: userId,
        album_id: album_id || null,
        track_number: track_number || 1,
        genre: genre || 'other',
        audio_url: null,
        duration_seconds: 0,
        duration_ms: 0,
        play_count: 0,
        created_at: new Date(),
      })
      res.status(201).json(result.data ?? result)
    } catch (error) {
      console.error('music.tracks POST /', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post('/:id/audio', validateBody(audioUploadSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const track = await findById<Record<string, unknown>>('tracks', idOf(req))
    if (!track) {
      res
        .status(404)
        .json({ error: t('tracks.notFound', undefined, { defaultValue: 'Track not found' }) })
      return
    }
    if (track.user_id !== userId) {
      res
        .status(403)
        .json({ error: t('tracks.forbidden', undefined, { defaultValue: 'Not your track' }) })
      return
    }

    const { audio_url, duration_seconds } = req.body as z.infer<typeof audioUploadSchema>
    const result = await updateById('tracks', idOf(req), {
      audio_url,
      duration_seconds: duration_seconds ?? 0,
    })
    res.json(result.data ?? result)
  } catch (error) {
    console.error('music.tracks POST /:id/audio', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/play', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const track = await findById<Record<string, unknown>>('tracks', idOf(req))
    if (!track) {
      res
        .status(404)
        .json({ error: t('tracks.notFound', undefined, { defaultValue: 'Track not found' }) })
      return
    }

    await updateById('tracks', idOf(req), {
      play_count: (track.play_count as number) + 1,
    })

    await create('listening_history', {
      user_id: userId,
      track_id: idOf(req),
      played_at: new Date(),
      listened_at: new Date(),
      ms_played: (track.duration_ms as number) ?? 0,
    })

    // Persist the user's now-playing state so a refresh shows the same
    // track in the NowPlayingBar (the bar fetches /api/reports/now-playing
    // on mount). Upsert: try update, fall back to insert.
    const existing = await findOne('user_playback', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (existing) {
      await updateMany('user_playback', [{ field: 'user_id', operator: '=', value: userId }], {
        track_id: idOf(req),
        position_seconds: 0,
        is_playing: true,
        updated_at: new Date(),
      })
    } else {
      await create('user_playback', {
        user_id: userId,
        track_id: idOf(req),
        position_seconds: 0,
        is_playing: true,
        is_shuffled: false,
        repeat_mode: 'off',
        volume: 80,
        updated_at: new Date(),
      })
    }

    res.json({ played: true, track_id: idOf(req) })
  } catch (error) {
    console.error('music.tracks POST /:id/play', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

const transportSchema = z.object({
  is_playing: z.boolean().optional(),
  position_seconds: z.number().int().min(0).optional(),
  is_shuffled: z.boolean().optional(),
  repeat_mode: z.enum(['off', 'one', 'all']).optional(),
  volume: z.number().int().min(0).max(100).optional(),
  track_id: z.string().uuid().optional(),
})

router.patch('/transport', validateBody(transportSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  try {
    const patch = req.body as z.infer<typeof transportSchema>
    const existing = await findOne('user_playback', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (existing) {
      await updateMany('user_playback', [{ field: 'user_id', operator: '=', value: userId }], {
        ...patch,
        updated_at: new Date(),
      })
    } else {
      await create('user_playback', {
        user_id: userId,
        track_id: patch.track_id ?? null,
        position_seconds: patch.position_seconds ?? 0,
        is_playing: patch.is_playing ?? false,
        is_shuffled: patch.is_shuffled ?? false,
        repeat_mode: patch.repeat_mode ?? 'off',
        volume: patch.volume ?? 80,
        updated_at: new Date(),
      })
    }
    res.json({ updated: true })
  } catch (error) {
    console.error('music.tracks PATCH /transport', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const where: WhereCondition[] = []
    if (req.query.album_id) {
      where.push({ field: 'album_id', operator: '=', value: String(req.query.album_id) })
    }
    if (req.query.artist_id) {
      where.push({ field: 'artist_id', operator: '=', value: String(req.query.artist_id) })
    }

    const wantsLikedOnly = String(req.query.liked ?? '') === 'true'
    if (wantsLikedOnly && userId) {
      const liked = await loadLikedTrackIds(userId)
      const ids = [...liked]
      if (ids.length === 0) {
        res.json([])
        return
      }
      where.push({ field: 'id', operator: 'in', value: ids })
    }

    const tracks = await findMany<DBTrack>('tracks', { where, limit: 50 })
    res.json(await decorateTracks(tracks, { userId }))
  } catch (error) {
    console.error('music.tracks GET /', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
