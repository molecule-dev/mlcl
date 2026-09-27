/**
 * Single-business catalog helpers.
 *
 * The seeded public booking surface (migration 0011) is owned by a SYSTEM
 * account that no one can log into. Public endpoints read its catalog; the
 * authed owner endpoints include its bookings so the password-protected
 * owner page lists every booking, including signed-out ones.
 *
 * @module
 */

import { findOne } from '@molecule/api-database'

export const SYSTEM_OWNER_EMAIL = 'owner@scheduler.local'

export interface SystemUserRow {
  id: string
  email: string
  name: string | null
}

/** Resolve the seeded system business owner (id), or null if absent. */
export async function getSystemOwnerId(): Promise<string | null> {
  const row = await findOne<SystemUserRow>('users', [
    { field: 'email', operator: '=', value: SYSTEM_OWNER_EMAIL },
  ])
  return row?.id ?? null
}
