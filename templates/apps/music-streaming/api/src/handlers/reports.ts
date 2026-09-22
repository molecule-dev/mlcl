/**
 * Reports — read-only summary endpoints.
 *
 * GET /api/reports/now-playing  → returns the user's current playback
 *                                 state (track + position + transport
 *                                 modes) decorated with display fields.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

interface DBPlayback {
  user_id: string
  track_id: string | null
  position_seconds: number
  is_playing: boolean
  is_shuffled: boolean
  repeat_mode: string
  volume: number
}

interface DBTrack {
  id: string
  title: string
  artist_id: string | null
  album_id: string | null
  duration_seconds: number
  cover_index: number
  audio_url: string | null
}

interface DBArtist {
  id: string
  name: string
}
interface DBAlbum {
  id: string
  title: string
}

router.get('/now-playing', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  try {
    const state = await findOne<DBPlayback>('user_playback', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (!state || !state.track_id) {
      res.status(204).end()
      return
    }
    const track = await findById<DBTrack>('tracks', state.track_id)
    if (!track) {
      res.status(204).end()
      return
    }
    const [artist, album] = await Promise.all([
      track.artist_id ? findById<DBArtist>('artists', track.artist_id) : Promise.resolve(null),
      track.album_id ? findById<DBAlbum>('albums', track.album_id) : Promise.resolve(null),
    ])
    res.json({
      track_id: track.id,
      track_title: track.title,
      artist: artist?.name ?? 'Unknown',
      artist_id: track.artist_id ?? '',
      album: album?.title ?? '',
      album_id: track.album_id ?? '',
      cover_index: Number(track.cover_index ?? 1),
      duration_seconds: Number(track.duration_seconds ?? 0),
      position_seconds: Number(state.position_seconds ?? 0),
      is_playing: !!state.is_playing,
      is_shuffled: !!state.is_shuffled,
      repeat_mode: state.repeat_mode,
      volume: Number(state.volume ?? 80),
      audio_url: track.audio_url ?? `/api/tracks/${track.id}/stream`,
      // The frontend asks "is this track liked for me?" — derive it
      // from a single-row lookup rather than another network call.
      liked: false,
    })
  } catch (error) {
    console.error('music.reports GET /now-playing', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
