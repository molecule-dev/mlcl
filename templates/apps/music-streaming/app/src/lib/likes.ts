/**
 * Like/unlike track helpers — calls /api/tracks/:id/like (POST/DELETE)
 * and returns the new liked state from the backend.
 *
 * @module
 */

import type { HttpClient } from '@molecule/app-http'

import { unwrapSingle } from './unwrap.js'

interface LikeResponse {
  liked: boolean
  total: number
}

export async function likeTrack(http: HttpClient, trackId: string): Promise<LikeResponse | null> {
  const res = await http.post(`/api/tracks/${trackId}/like`).catch(() => null)
  if (!res) return null
  return unwrapSingle<LikeResponse>(res)
}

export async function unlikeTrack(http: HttpClient, trackId: string): Promise<LikeResponse | null> {
  const res = await http.delete(`/api/tracks/${trackId}/like`).catch(() => null)
  if (!res) return null
  return unwrapSingle<LikeResponse>(res)
}

export async function toggleLike(
  http: HttpClient,
  trackId: string,
  currentlyLiked: boolean,
): Promise<boolean> {
  const result = currentlyLiked ? await unlikeTrack(http, trackId) : await likeTrack(http, trackId)
  return result ? result.liked : !currentlyLiked
}
