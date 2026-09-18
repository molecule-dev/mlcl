/**
 * Realtime connection singleton for customer-support-chat.
 *
 * Lazily opens ONE shared Socket.IO connection to the API and caches the
 * promise so every page/component reuses the same socket. The server shares
 * the API port at `/socket.io`, so we connect same-origin via `connect('/')`
 * (the shared Vite factory config proxies `/socket.io` — including the
 * WebSocket upgrade — to the API; see @molecule/app-vite-config-default).
 *
 * The handshake carries the SAME bearer token the HTTP client puts in its
 * Authorization header (`authClient.getAccessToken()` — the default auth/http
 * sync wiring in bonds/auth-default.ts), read at connect time. The API's
 * realtime join guard (api/src/lib/realtime-guard.ts) verifies it before
 * admitting the client into any `conversation:<conversationId>` room, so an
 * unauthenticated socket — or one belonging to a different account — never
 * receives a conversation's live traffic.
 *
 * On logout the socket is torn down automatically (auth event listener), so
 * a signed-out browser keeps no live subscriptions; the next login's
 * `getRealtimeConnection()` call reconnects with the fresh token.
 *
 * @module
 */

import type { RealtimeConnection } from '@molecule/app-realtime'
import { connect } from '@molecule/app-realtime'

import { authClient } from '../bonds/auth-default.js'

let connectionPromise: Promise<RealtimeConnection> | null = null
let authHookRegistered = false

/**
 * Resolve once the auth client has finished restoring the session (its
 * `initialized` state flag). On a fresh page load the session restore
 * (`initialize()` → `/users/me`) races the first page effect — connecting
 * before it settles would send `token: null` in the socket handshake and
 * the server's join guard would (correctly) deny every conversation room.
 */
function waitForAuthInitialized(): Promise<void> {
  if (authClient.getState().initialized) return Promise.resolve()
  return new Promise((resolve) => {
    const unsubscribe = authClient.subscribe((state) => {
      if (state.initialized) {
        unsubscribe()
        resolve()
      }
    })
    // Re-check after subscribing: initialization may have completed between
    // the guard above and the subscription (no event would fire again).
    if (authClient.getState().initialized) {
      unsubscribe()
      resolve()
    }
  })
}

/**
 * Get the app-wide realtime connection, creating it on first use. Waits for
 * the auth client's session restore, then reads the token at connect time —
 * so the socket handshake always carries the same credentials the HTTP
 * client sends.
 *
 * @returns A promise resolving to the shared {@link RealtimeConnection}.
 *   Rejects if the transport cannot connect; a rejected attempt is NOT
 *   cached, so callers can retry later.
 */
export function getRealtimeConnection(): Promise<RealtimeConnection> {
  if (!connectionPromise) {
    if (!authHookRegistered) {
      authHookRegistered = true
      // Drop the socket on ANY auth boundary: logout mirrors the http bond
      // clearing its bearer token; login/register drop a socket that may
      // have handshaken anonymously (handshake auth is fixed for the life
      // of the socket — the next getRealtimeConnection() reconnects with
      // the fresh token).
      authClient.addEventListener((event) => {
        if (event.type === 'logout' || event.type === 'login' || event.type === 'register') {
          resetRealtimeConnection()
        }
      })
    }
    const pending = (async () => {
      await waitForAuthInitialized()
      // Same token source as the HTTP client's Authorization header (the
      // default auth/http sync in bonds/auth-default.ts).
      const token = authClient.getAccessToken?.() ?? null
      return connect('/', { auth: { token } })
    })()
    connectionPromise = pending
    pending.catch((_error) => {
      // The caller of getRealtimeConnection() receives and handles this same
      // rejection — here we only clear the cache so a failed connect doesn't
      // poison the singleton and a later call can retry.
      if (connectionPromise === pending) {
        connectionPromise = null
      }
    })
  }
  return connectionPromise
}

/**
 * Disconnect and forget the cached connection (logout, tests). The next
 * {@link getRealtimeConnection} call creates a fresh connection with the
 * current auth token.
 */
export function resetRealtimeConnection(): void {
  const pending = connectionPromise
  connectionPromise = null
  if (pending) {
    pending
      .then((connection) => connection.disconnect())
      .catch((_error) => {
        // The connection never established — there is nothing to disconnect.
      })
  }
}
