/**
 * Authorization helpers for video-editor.
 *
 * Projects and their children (tracks, clips, transitions, effects, exports)
 * are owner-scoped via `owner_id`. Each helper loads the row and returns a
 * discriminated result so handlers can return 404 without leaking existence
 * information to non-owners.
 */

import { findById } from '@molecule/api-database'

export type AuthzResult<T> = { ok: true; row: T } | { ok: false; status: 404 }

interface ProjectRow extends Record<string, unknown> {
  id: string
  owner_id: string
}

interface TrackRow extends Record<string, unknown> {
  id: string
  owner_id: string
  project_id: string
}

interface ClipRow extends Record<string, unknown> {
  id: string
  owner_id: string
  project_id: string
  track_id: string
}

interface AssetRow extends Record<string, unknown> {
  id: string
  owner_id: string
  is_public?: boolean | null
}

interface ExportRow extends Record<string, unknown> {
  id: string
  owner_id: string
  project_id: string
}

const own = (row: { owner_id: unknown } | null | undefined, userId: string): boolean =>
  !!row && String(row.owner_id) === String(userId)

export async function loadProject(id: string): Promise<ProjectRow | null> {
  return findById<ProjectRow>('video_projects', id)
}

export async function requireProjectOwner(
  projectId: string,
  userId: string,
): Promise<AuthzResult<ProjectRow>> {
  const row = await loadProject(projectId)
  if (!row || !own(row, userId)) return { ok: false, status: 404 }
  return { ok: true, row }
}

export async function requireTrackOwner(
  trackId: string,
  userId: string,
): Promise<AuthzResult<TrackRow>> {
  const row = await findById<TrackRow>('tracks', trackId)
  if (!row || !own(row, userId)) return { ok: false, status: 404 }
  return { ok: true, row }
}

export async function requireClipOwner(
  clipId: string,
  userId: string,
): Promise<AuthzResult<ClipRow>> {
  const row = await findById<ClipRow>('clips', clipId)
  if (!row || !own(row, userId)) return { ok: false, status: 404 }
  return { ok: true, row }
}

export async function requireAssetAccess(
  assetId: string,
  userId: string,
): Promise<AuthzResult<AssetRow>> {
  const row = await findById<AssetRow>('assets', assetId)
  if (!row) return { ok: false, status: 404 }
  if (own(row, userId) || row.is_public === true) return { ok: true, row }
  return { ok: false, status: 404 }
}

export async function requireAssetOwner(
  assetId: string,
  userId: string,
): Promise<AuthzResult<AssetRow>> {
  const row = await findById<AssetRow>('assets', assetId)
  if (!row || !own(row, userId)) return { ok: false, status: 404 }
  return { ok: true, row }
}

export async function requireExportOwner(
  exportId: string,
  userId: string,
): Promise<AuthzResult<ExportRow>> {
  const row = await findById<ExportRow>('video_exports', exportId)
  if (!row || !own(row, userId)) return { ok: false, status: 404 }
  return { ok: true, row }
}

interface TransitionRow extends Record<string, unknown> {
  id: string
  owner_id: string
  project_id: string
}

export async function requireTransitionOwner(
  transitionId: string,
  userId: string,
): Promise<AuthzResult<TransitionRow>> {
  const row = await findById<TransitionRow>('transitions', transitionId)
  if (!row || !own(row, userId)) return { ok: false, status: 404 }
  return { ok: true, row }
}

interface EffectRow extends Record<string, unknown> {
  id: string
  owner_id: string
  clip_id: string
  project_id: string
}

export async function requireEffectOwner(
  effectId: string,
  userId: string,
): Promise<AuthzResult<EffectRow>> {
  const row = await findById<EffectRow>('effects', effectId)
  if (!row || !own(row, userId)) return { ok: false, status: 404 }
  return { ok: true, row }
}
