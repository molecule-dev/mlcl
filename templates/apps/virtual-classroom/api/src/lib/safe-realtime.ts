/**
 * Best-effort broadcast wrapper.
 *
 * Real-time fan-out for the virtual-classroom (chat / participants /
 * whiteboard / breakouts) is decorative — the authoritative state always
 * lives in Postgres, and any client can resync via a fresh GET. The
 * realtime provider may also legitimately reject channels that nobody is
 * subscribed to (e.g. socket.io throws "Room ... does not exist" for
 * channels created via `broadcast()` directly without a prior
 * `createRoom()`). Therefore a missing or unhealthy realtime fan-out
 * must NEVER fail the underlying CRUD request.
 */

import { broadcast } from '@molecule/api-realtime'

export async function safeBroadcast(channel: string, event: string, data: unknown): Promise<void> {
  try {
    await broadcast(channel, event, data)
  } catch (_error) {
    // realtime fan-out is best-effort — a failed broadcast never fails the CRUD request
  }
}
