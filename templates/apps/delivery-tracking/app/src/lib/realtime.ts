/**
 * Realtime connection singleton for delivery-tracking.
 *
 * Opens ONE shared Socket.IO connection to the API and caches the promise so
 * every page reuses the same socket. The server shares the API port at
 * `/socket.io`, so we connect same-origin via `connect('/')` (Vite proxies
 * `/socket.io` — including the WebSocket upgrade — to the API).
 *
 * The `shipment:<id>` rooms are PUBLIC — the API registers NO `onJoinRequest`
 * guard for them (the GET tracking view is unauthenticated and the payload
 * carries only public status/location, see api/src/handlers/tracking.ts), so a
 * client may watch a shipment's live updates without signing in. We still pass
 * the current bearer token in the handshake (same source as the HTTP client) so
 * any future guarded room authenticates without re-plumbing this file.
 *
 * @module
 */

import type { RealtimeConnection } from '@molecule/app-realtime'
import { connect } from '@molecule/app-realtime'

import { authClient } from '../bonds/auth-default.js'

let connectionPromise: Promise<RealtimeConnection> | null = null
let authHookRegistered = false

/**
 * Get the app-wide realtime connection, creating it on first use. Reads the
 * bearer token at connect time (or `null` for an anonymous tracker — the public
 * `shipment:<id>` rooms admit them regardless).
 *
 * @returns A promise resolving to the shared {@link RealtimeConnection}. A
 *   rejected connect attempt is NOT cached, so callers can retry later.
 */
export function getRealtimeConnection(): Promise<RealtimeConnection> {
  if (!connectionPromise) {
    if (!authHookRegistered) {
      authHookRegistered = true
      authClient.addEventListener((event) => {
        if (event.type === 'logout' || event.type === 'login' || event.type === 'register') {
          resetRealtimeConnection()
        }
      })
    }
    const token = authClient.getAccessToken?.() ?? null
    const pending = connect('/', { auth: { token } })
    connectionPromise = pending
    pending.catch(() => {
      // Don't poison the singleton on a failed connect — a later call retries.
      if (connectionPromise === pending) connectionPromise = null
    })
  }
  return connectionPromise
}

/**
 * Disconnect and forget the cached connection (logout, tests). The next
 * {@link getRealtimeConnection} call reconnects with the current auth token.
 */
export function resetRealtimeConnection(): void {
  const pending = connectionPromise
  connectionPromise = null
  if (pending) {
    pending
      .then((connection) => connection.disconnect())
      .catch(() => {
        // Never established — nothing to disconnect.
      })
  }
}
