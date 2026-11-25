import { get } from '@molecule/api-bond'
import { verify } from '@molecule/api-jwt'
import { onJoinRequest, setProvider } from '@molecule/api-realtime'
import { createProvider } from '@molecule/api-realtime-sse'
import type { DeviceService } from '@molecule/api-resource-device'
import { authorization } from '@molecule/api-resource-user'

/**
 * Wires SSE as the realtime bond so the notification handlers can
 * `broadcast(...)` and the bell's `EventSource` can receive live events.
 * `createProvider({ deferAttach: true })` lets the API server attach the SSE
 * provider to its own listener during startup. SSE, Socket.IO and ws can share
 * the API's port this way.
 *
 * Room convention: the SSE provider streams ONE path, `/api/realtime` here (under
 * `/api` so the frontend reaches it through the same proxy as every API call; the
 * default `/sse` sits outside it). A client names its room in the `?room=` query
 * and receives every `broadcast(<room>, …)`; a trailing path segment
 * (`/api/realtime/user:<id>`) is not the stream path and receives nothing. The
 * room name MUST match on both sides. Per-user notifications use `user:<userId>`:
 * the bell opens `/api/realtime?room=user:<userId>` and the handlers broadcast to
 * `user:<userId>`.
 *
 * SECURITY — the join guard below is NOT optional. `user:<userId>` rooms are
 * PRIVATE: without an `onJoinRequest` guard the realtime core lets ANY client
 * subscribe to `/api/realtime?room=user:<anyone-else>` and receive that user's live
 * notifications (a realtime IDOR). The guard verifies the subscriber's session
 * — the httpOnly `token` cookie the browser sends with the same-origin
 * EventSource request, or an `?token=` handshake query param — and allows the
 * join ONLY for that user's own room. Every per-entity room you broadcast to
 * needs the same check (mirror the HTTP read authz for that entity).
 */

/** Verify the subscriber's JWT and device, then return the session user ID. */
async function verifiedUserId(
  auth: Record<string, unknown>,
  headers: Record<string, string | string[] | undefined> | undefined,
): Promise<string | null> {
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
      !payload ||
      typeof payload !== 'object' ||
      typeof payload.userId !== 'string' ||
      !payload.userId ||
      typeof payload.deviceId !== 'string' ||
      !payload.deviceId
    )
      return null
    const devices = get<DeviceService>('device')
    if (devices && !(await devices.exists(payload.deviceId))) return null
    return payload.userId
  } catch (_error) {
    // A failed signature or device check denies the join.
  }
  return null
}

export function setupRealtime(): void {
  // `path` must equal the bell's EventSource URL path (`/api/realtime`).
  setProvider(createProvider({ deferAttach: true, path: '/api/realtime' }))

  // A user may join ONLY their own `user:<userId>` room. Without this guard the
  // realtime core allows every join, so any client could read another user's feed.
  onJoinRequest(async ({ room, auth, headers }) => {
    const userId = await verifiedUserId(auth, headers)
    if (!userId) return false
    return room === `user:${userId}`
  })
}
