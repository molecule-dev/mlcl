/**
 * Authorization helpers for video-conferencing.
 *
 * Meeting/workspace-scoped resources are reachable only by:
 *   - The host (for meeting host actions).
 *   - Workspace members (for workspace meetings).
 *   - Joined participants (for chat / participant updates).
 *   - The recording owner (for recording playback / delete).
 *
 * Helpers wrap the row lookup with the membership check and return a
 * discriminated result so handlers can branch on 404 vs. 403 without
 * leaking existence information. We standardise on 404-for-non-participant
 * so attackers cannot probe meeting existence.
 */

import { findById, findMany } from '@molecule/api-database'

export type AuthzResult<T> = { ok: true; row: T } | { ok: false; status: 404 }

interface MeetingRow extends Record<string, unknown> {
  id: string
  host_id: string
  workspace_id?: string | null
}

export async function loadMeeting(meetingId: string): Promise<MeetingRow | null> {
  return findById<MeetingRow>('meetings', meetingId)
}

/** True if the user is in the same workspace as the meeting (or the meeting has no workspace). */
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

async function isMeetingParticipant(meetingId: string, userId: string): Promise<boolean> {
  const rows = await findMany<{ id: string }>('meeting_participants', {
    where: [
      { field: 'meeting_id', operator: '=', value: meetingId },
      { field: 'user_id', operator: '=', value: userId },
    ],
    limit: 1,
  })
  return rows.length > 0
}

/**
 * Allows host, workspace member, or joined participant. Returns the row
 * when authorised; 404 otherwise.
 */
export async function requireMeetingAccess(
  meetingId: string,
  userId: string,
): Promise<AuthzResult<MeetingRow>> {
  const meeting = await loadMeeting(meetingId)
  if (!meeting) return { ok: false, status: 404 }
  if (String(meeting.host_id) === String(userId)) return { ok: true, row: meeting }
  if (await isWorkspaceMember(meeting.workspace_id, userId)) return { ok: true, row: meeting }
  if (await isMeetingParticipant(meetingId, userId)) return { ok: true, row: meeting }
  return { ok: false, status: 404 }
}

/** Host-only operations (start/end/delete meeting, manage recordings). */
export async function requireMeetingHost(
  meetingId: string,
  userId: string,
): Promise<AuthzResult<MeetingRow>> {
  const meeting = await loadMeeting(meetingId)
  if (!meeting) return { ok: false, status: 404 }
  if (String(meeting.host_id) !== String(userId)) return { ok: false, status: 404 }
  return { ok: true, row: meeting }
}

interface WorkspaceRow extends Record<string, unknown> {
  id: string
  owner_id: string
}

/** Workspace member access: owner OR joined member. */
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

/** Workspace admin (owner or admin) access. */
export async function requireWorkspaceAdmin(
  workspaceId: string,
  userId: string,
): Promise<AuthzResult<WorkspaceRow>> {
  const result = await requireWorkspaceMember(workspaceId, userId)
  if (!result.ok) return result
  if (result.role !== 'owner' && result.role !== 'admin') return { ok: false, status: 404 }
  return { ok: true, row: result.row }
}
