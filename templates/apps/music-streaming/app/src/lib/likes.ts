/**
 * Like/unlike track helpers — calls /api/tracks/:id/like (POST/DELETE)
 * and returns the new liked state from the backend.
 *
 * Domain analytics: `favorite.added` / `favorite.removed` fire here —
 * the single commit point every like surface (player bar, now-playing
 * page, track tables) funnels through.
 *
 * @module
 */

import { track as trackEvent } from '@molecule/app-analytics'
import type { HttpClient } from '@molecule/app-http'

import { unwrapSingle } from './unwrap.js'

interface LikeResponse {
  liked: boolean
  total: number
}

export async function likeTrack(http: HttpClient, trackId: string): Promise<LikeResponse | null> {
  const res = await http.post(`/api/tracks/${trackId}/like`).catch(() => null)
  if (!res) return null
  const result = unwrapSingle<LikeResponse>(res)
  if (result) {
    void trackEvent({
      name: 'favorite.added',
      properties: { track_id: trackId, total: result.total },
    }).catch(() => {
      /* analytics is best-effort */
    })
  }
  return result
}

export async function unlikeTrack(http: HttpClient, trackId: string): Promise<LikeResponse | null> {
  const res = await http.delete(`/api/tracks/${trackId}/like`).catch(() => null)
  if (!res) return null
  const result = unwrapSingle<LikeResponse>(res)
  if (result) {
    void trackEvent({
      name: 'favorite.removed',
      properties: { track_id: trackId, total: result.total },
    }).catch(() => {
      /* analytics is best-effort */
    })
  }
  return result
}

export async function toggleLike(
  http: HttpClient,
  trackId: string,
  currentlyLiked: boolean,
): Promise<boolean> {
  const result = currentlyLiked ? await unlikeTrack(http, trackId) : await likeTrack(http, trackId)
  return result ? result.liked : !currentlyLiked
}
