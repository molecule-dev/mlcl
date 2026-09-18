/**
 * Authorization helpers for screen-sharing.
 *
 * Recordings, comments, views, and share links are all scoped by recording
 * ownership (and, where relevant, workspace membership). Each helper loads
 * the row and returns a discriminated result so handlers can return 404
 * without leaking existence information to non-owners.
 */

import { findById, findMany } from '@molecule/api-database'

export type AuthzResult<T> = { ok: true; row: T } | { ok: false; status: 404 }

interface RecordingRow extends Record<string, unknown> {
  id: string
  owner_id: string
  workspace_id?: string | null
  visibility?: string | null
  share_token?: string | null
}

interface WorkspaceRow extends Record<string, unknown> {
  id: string
  owner_id: string
}

export async function loadRecording(recordingId: string): Promise<RecordingRow | null> {
  return findById<RecordingRow>('recordings', recordingId)
}

async function isWorkspaceMember(
  workspaceId: string | null | undefined,
  userId: string,
): Promise<boolean> {
  if (!workspaceId) return false
  const members = await findMany<{ id: string }>('workspace_members', {
    where: [
      { field: 'workspace_id', operator: '=', value: workspaceId },
      { field: 'user_id', operator: '=', value: userId },
    ],
    limit: 1,
  })
  return members.length > 0
}

/**
 * Allows the owner OR a workspace member when visibility is `workspace`,
 * `public`, or `password`. Returns the row when authorised, 404 otherwise.
 */
export async function requireRecordingAccess(
  recordingId: string,
  userId: string,
): Promise<AuthzResult<RecordingRow>> {
  const recording = await loadRecording(recordingId)
  if (!recording) return { ok: false, status: 404 }
  if (String(recording.owner_id) === String(userId)) return { ok: true, row: recording }
  const visibility = String(recording.visibility ?? 'private')
  if (visibility === 'workspace' || visibility === 'public' || visibility === 'password') {
    if (await isWorkspaceMember(recording.workspace_id, userId)) {
      return { ok: true, row: recording }
    }
  }
  return { ok: false, status: 404 }
}

/** Owner-only operations (update, delete, share-link rotation, analytics). */
export async function requireRecordingOwner(
  recordingId: string,
  userId: string,
): Promise<AuthzResult<RecordingRow>> {
  const recording = await loadRecording(recordingId)
  if (!recording) return { ok: false, status: 404 }
  if (String(recording.owner_id) !== String(userId)) return { ok: false, status: 404 }
  return { ok: true, row: recording }
}

export async function requireWorkspaceMember(
  workspaceId: string,
  userId: string,
): Promise<AuthzResult<WorkspaceRow> & { role?: string }> {
  const ws = await findById<WorkspaceRow>('workspaces', workspaceId)
  if (!ws) return { ok: false, status: 404 }
  if (String(ws.owner_id) === String(userId)) return { ok: true, row: ws, role: 'owner' }
  const rows = await findMany<{ role: string }>('workspace_members', {
    where: [
      { field: 'workspace_id', operator: '=', value: workspaceId },
      { field: 'user_id', operator: '=', value: userId },
    ],
    limit: 1,
  })
  if (rows.length === 0) return { ok: false, status: 404 }
  return { ok: true, row: ws, role: rows[0]?.role }
}

export async function requireWorkspaceAdmin(
  workspaceId: string,
  userId: string,
): Promise<AuthzResult<WorkspaceRow>> {
  const result = await requireWorkspaceMember(workspaceId, userId)
  if (!result.ok) return result
  if (result.role !== 'owner' && result.role !== 'admin') return { ok: false, status: 404 }
  return { ok: true, row: result.row }
}
