/**
 * Trip edit authorization, shared by the activities / expenses / bookings handlers.
 *
 * @module
 */

import { findById, findMany } from '@molecule/api-database'

/**
 * Whether the user may edit a trip's contents — true for the trip owner, and for an accepted
 * collaborator whose role is `editor`. A `viewer` collaborator stays read-only. The invite/accept
 * flow stores the accepter as a `trip_collaborators` row carrying the invite's role, so an existing
 * row with role `editor` for this user means they accepted an editor invite.
 *
 * This replaces the old owner-only `userOwnsTrip` gate, under which a stored `editor` collaborator
 * had zero edit power (every create/update/delete 404'd).
 */
export async function userCanEditTrip(tripId: string, userId: string): Promise<boolean> {
  if (!tripId) return false
  const trip = await findById<Record<string, unknown>>('trips', tripId)
  if (!trip) return false
  if (trip.user_id === userId) return true
  const editors = await findMany<Record<string, unknown>>('trip_collaborators', {
    where: [
      { field: 'trip_id', operator: '=', value: tripId },
      { field: 'user_id', operator: '=', value: userId },
      { field: 'role', operator: '=', value: 'editor' },
    ],
    limit: 1,
  })
  return editors.length > 0
}
