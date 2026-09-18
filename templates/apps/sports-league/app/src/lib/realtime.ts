/**
 * Realtime connection singleton for sports-league.
 *
 * Opens ONE shared Socket.IO connection to the API and caches the promise so
 * every page reuses the same socket. The server shares the API port at
 * `/socket.io`, so we connect same-origin via `connect('/')` (Vite proxies
 * `/socket.io` — including the WebSocket upgrade — to the API).
 *
 * Score/game events broadcast to a SINGLE global room `sports-league`
 * (api/src/handlers/scores.ts): `score-update`, `game-started`, `game-final`,
 * `game-event` — each payload carries a `game_id`, so a page filters to the
 * game(s) it displays. Live scores are PUBLIC (the API registers no realtime
 * join guard for this room), so the handshake needs no auth token — any visitor
 * can follow the scoreboard.
 *
 * @module
 */

import type { RealtimeConnection } from '@molecule/app-realtime'
import { connect } from '@molecule/app-realtime'

/** The one global room every score/game event is broadcast to (server: scores.ts). */
export const SPORTS_LEAGUE_ROOM = 'sports-league'

let connectionPromise: Promise<RealtimeConnection> | null = null

/**
 * Get the app-wide realtime connection, creating it on first use. No auth token
 * is sent — the `sports-league` room is public (no join guard server-side).
 *
 * @returns A promise resolving to the shared {@link RealtimeConnection}. A
 *   rejected connect attempt is NOT cached, so callers can retry later.
 */
export function getRealtimeConnection(): Promise<RealtimeConnection> {
  if (!connectionPromise) {
    const pending = connect('/')
    connectionPromise = pending
    pending.catch(() => {
      // Don't poison the singleton on a failed connect — a later call retries.
      if (connectionPromise === pending) connectionPromise = null
    })
  }
  return connectionPromise
}

/**
 * Disconnect and forget the cached connection (tests, teardown). The next
 * {@link getRealtimeConnection} call reconnects.
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
