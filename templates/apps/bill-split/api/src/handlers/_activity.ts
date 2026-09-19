/**
 * Activity recorder — one row per meaningful group event.
 *
 * Kinds: group_created | member_added | member_removed | expense_added |
 * expense_deleted | settlement_recorded. The payload is denormalized prose
 * fields (actor, member names, amounts in cents) so the feed renders from
 * the row alone with no joins.
 *
 * @module
 */

import { create } from '@molecule/api-database'

export interface ActivityPayload {
  actor?: string
  description?: string
  amount_cents?: number
  group_name?: string
  member_name?: string
  payer_name?: string
  from_name?: string
  to_name?: string
  method?: string
  member_count?: number
}

/** Append an activity row for a group. Forensic — never throws to the caller. */
export async function recordActivity(
  groupId: string,
  kind: string,
  payload: ActivityPayload,
): Promise<void> {
  try {
    await create('activities', {
      group_id: groupId,
      kind,
      payload,
      created_at: new Date(),
    })
  } catch (err) {
    console.warn('recordActivity failed', err)
  }
}
