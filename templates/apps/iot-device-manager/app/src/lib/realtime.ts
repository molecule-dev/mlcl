/**
 * Realtime connection singleton for iot-device-manager.
 *
 * Opens ONE shared Socket.IO connection to the API and caches the promise so
 * every page reuses the same socket. The server shares the API port at
 * `/socket.io`, so we connect same-origin via `connect('/')` (Vite proxies
 * `/socket.io` — including the WebSocket upgrade — to the API).
 *
 * Device streams broadcast to per-device rooms (api/src/handlers/*.ts):
 *   - `telemetry:<deviceId>` — telemetry points     (`point`)
 *   - `logs:<deviceId>`      — device log lines      (`log`)
 *   - `commands:<deviceId>`  — queued commands       (`command`)
 *   - `commands:<deviceId>:status` — command status  (`status`)
 *   - `firmware:<deviceId>`  — firmware rollouts      (`rollout`)
 *
 * The API's realtime join guard (api/src/lib/realtime-guard.ts) admits a client
 * to a device's rooms ONLY if its session can READ that device (mirrors the HTTP
 * device-read access), so the handshake MUST carry the current bearer token (the
 * same one the HTTP client sends). We read it at connect time and drop the socket
 * on any auth boundary so the next `getRealtimeConnection()` reconnects fresh.
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
 * credentials the HTTP client sends (required for the read-guarded device rooms).
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
