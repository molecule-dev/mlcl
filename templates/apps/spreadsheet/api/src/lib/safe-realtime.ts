/**
 * Best-effort broadcast wrapper.
 *
 * Real-time fan-out is decorative for the spreadsheet app — the
 * authoritative state always lives in Postgres, and the second tab can
 * always catch up via a fresh GET. Therefore a missing or unhealthy
 * realtime provider must NEVER fail the underlying write.
 *
 * Wraps `@molecule/api-realtime`'s `broadcast` so handlers can call
 * `safeBroadcast(room, event, data)` without try/catching at every site.
 */

import { broadcast } from '@molecule/api-realtime'

export async function safeBroadcast(room: string, event: string, data: unknown): Promise<void> {
  try {
    await broadcast(room, event, data)
  } catch (_error) {
    // Realtime is best-effort: a missing provider, a transport hiccup,
    // or a temporary disconnection must not surface as a 5xx to the
    // caller of the originating REST endpoint.
  }
}
