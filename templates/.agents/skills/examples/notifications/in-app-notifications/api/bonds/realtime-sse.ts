import { verify } from '@molecule/api-jwt'
import { onJoinRequest, setProvider } from '@molecule/api-realtime'
import { createProvider } from '@molecule/api-realtime-sse'
import { authorization } from '@molecule/api-resource-user'
import { registerServerCreatedHook } from '@molecule/api-server-default-express'

/**
 * Wires SSE as the realtime bond so the notification handlers can
 * `broadcast(...)` and the bell's `EventSource` can receive live events.
 * `createProvider({ deferAttach: true })` does NOT bind a port itself — it
 * waits for `attachHttpServer(server)`, called here once the API's own HTTP
 * server exists (via `registerServerCreatedHook`) so SSE shares the API's
 * port instead of opening a second standalone port a container/proxy may not
 * expose. Same pattern for `-socketio` or `-ws`.
 *
 * Room convention: a client subscribes to `GET /api/realtime/<room>` (the
 * room is the trailing path segment) and receives every `broadcast(<room>,
 * …)`. The room name MUST match on both sides. Per-user notifications use
 * `user:<userId>` — the bell subscribes to `/api/realtime/user:<userId>` and
 * the handlers broadcast to `user:<userId>`.
 *
 * SECURITY — the join guard below is NOT optional. `user:<userId>` rooms are
 * PRIVATE: without an `onJoinRequest` guard the realtime core lets ANY client
 * subscribe to `/api/realtime/user:<anyone-else>` and receive that user's live
 * notifications (a realtime IDOR). The guard verifies the subscriber's session
 * — the httpOnly `token` cookie the browser sends with the same-origin
 * EventSource request, or an `?token=` handshake query param — and allows the
 * join ONLY for that user's own room. Every per-entity room you broadcast to
 * needs the same check (mirror the HTTP read authz for that entity).
 */

/** Extract + verify the subscriber's session from the SSE handshake → the user id, or null. */
function verifiedUserId(
  auth: Record<string, unknown>,
  headers: Record<string, string | string[] | undefined> | undefined,
): string | null {
  const fromQuery = typeof auth.token === 'string' ? auth.token : null
  const rawCookie = Array.isArray(headers?.cookie) ? headers.cookie.join('; ') : headers?.cookie
  let fromCookie: string | null = null
  if (rawCookie) {
    const name = authorization.getAuthCookieName('token')
    for (const part of rawCookie.split(';')) {
      const eq = part.indexOf('=')
      if (eq > -1 && part.slice(0, eq).trim() === name) {
        try {
          fromCookie = decodeURIComponent(part.slice(eq + 1).trim())
        } catch (_error) {
          // Malformed percent-encoding in a cookie we didn't set — treat as absent.
          fromCookie = null
        }
        break
      }
    }
  }
  const token = fromQuery ?? fromCookie
  if (!token) return null
  try {
    const payload = verify(token)
    if (
      payload &&
      typeof payload === 'object' &&
      typeof (payload as { userId?: unknown }).userId === 'string'
    ) {
      return (payload as { userId: string }).userId
    }
  } catch (_error) {
    // Invalid/expired/tampered token → deny the join (never an unverified decode).
  }
  return null
}

export function setupRealtime(): void {
  const provider = createProvider({ deferAttach: true })
  setProvider(provider)
  registerServerCreatedHook((server) => provider.attachHttpServer?.(server))

  // A user may join ONLY their own `user:<userId>` room. Without this guard the
  // realtime core allows every join, so any client could read another user's feed.
  onJoinRequest(async ({ room, auth, headers }) => {
    const userId = verifiedUserId(auth, headers)
    if (!userId) return false
    return room === `user:${userId}`
  })
}
