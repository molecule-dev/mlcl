/**
 * Shared roster helpers for oncall-management handlers: member-name
 * resolution and "who is on call right now" computed from materialized
 * shifts (override rows win over rotation rows in the same window).
 *
 * @module
 */

import { findMany, findOne } from '@molecule/api-database'

export interface RosterMember {
  id: string
  member_id: string
  name: string
  email: string
  role: string
  timezone: string
}

export interface OncallSlot {
  member_id: string
  name: string
  start_at: string
  end_at: string
  is_override: boolean
  note: string | null
}

export const loadRoster = async (userId: string): Promise<Map<string, RosterMember>> => {
  const rows = await findMany<RosterMember & { user_id: string }>('team_members', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
    limit: 500,
  })
  const map = new Map<string, RosterMember>()
  for (const row of rows) {
    map.set(String(row.id), {
      id: String(row.id),
      member_id: String(row.member_id),
      name: row.name || row.email || 'Responder',
      email: row.email ?? '',
      role: row.role ?? 'responder',
      timezone: row.timezone ?? 'UTC',
    })
  }
  return map
}

interface ShiftRow {
  id: string
  member_id: string
  start_at: string
  end_at: string
  is_override: boolean
  note: string | null
}

/**
 * The shift covering `now` (start inclusive, end exclusive) for a schedule.
 * Overrides take precedence over rotation shifts. Returns null when the
 * schedule has no covering shift (empty rotation).
 */
export const findCurrentOncall = async (
  userId: string,
  scheduleId: string | null,
  roster: Map<string, RosterMember>,
): Promise<OncallSlot | null> => {
  if (!scheduleId) return null
  const now = new Date()
  const shifts = await findMany<ShiftRow>('schedule_shifts', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'schedule_id', operator: '=', value: scheduleId },
      { field: 'start_at', operator: '<=', value: now },
      { field: 'end_at', operator: '>', value: now },
    ],
    orderBy: [{ field: 'start_at', direction: 'desc' }],
    limit: 10,
  })
  const override = shifts.find((s) => s.is_override) ?? shifts[0]
  if (!override) return null
  const member = roster.get(String(override.member_id))
  return {
    member_id: String(override.member_id),
    name: member?.name ?? 'Responder',
    start_at: new Date(override.start_at).toISOString(),
    end_at: new Date(override.end_at).toISOString(),
    is_override: Boolean(override.is_override),
    note: override.note ?? null,
  }
}

/**
 * First responder fallback when neither a schedule nor a policy names a
 * page target.
 */
export const firstResponder = async (userId: string): Promise<RosterMember | null> => {
  const row = await findOne<RosterMember & { user_id: string }>('team_members', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'member_status', operator: '=', value: 'active' },
  ])
  return row ?? null
}
