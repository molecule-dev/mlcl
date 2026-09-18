/**
 * Realtime connection singleton for project-management.
 *
 * Opens ONE shared Socket.IO connection to the API and caches the promise so
 * every page reuses the same socket. The server shares the API port at
 * `/socket.io`, so we connect same-origin via `connect('/')` (Vite proxies
 * `/socket.io` — including the WebSocket upgrade — to the API).
 *
 * Task events are broadcast to per-project rooms named by the bare `<projectId>`
 * (api/src/handlers/tasks.ts). The API's realtime join guard
 * (api/src/lib/realtime-guard.ts) admits a client to `<projectId>` ONLY if its
 * session can access that project — so the handshake MUST carry the current
 * bearer token (the same one the HTTP client sends). We read it at connect time
 * and drop the socket on any auth boundary so the next `getRealtimeConnection()`
 * reconnects with a fresh token.
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
 * bearer token at connect time so the socket handshake carries the same
 * credentials the HTTP client sends (required for the guarded project rooms).
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
