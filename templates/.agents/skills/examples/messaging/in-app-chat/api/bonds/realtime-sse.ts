import { get } from '@molecule/api-bond'
import { verify } from '@molecule/api-jwt'
import { onJoinRequest, setProvider } from '@molecule/api-realtime'
import { createProvider } from '@molecule/api-realtime-sse'
import type { DeviceService } from '@molecule/api-resource-device'
import { authorization } from '@molecule/api-resource-user'

/**
 * Wires SSE as the realtime bond. `createProvider({ deferAttach: true })`
 * lets the API server attach the provider to its own listener during startup.
 * Call `setupRealtime()` from your bond setup. SSE, Socket.IO and ws can share
 * the API's port this way.
 *
 * SECURITY — the join guard below is NOT optional. Without an `onJoinRequest`
 * guard the realtime core lets ANY client subscribe to `?room=channel:<anything>`
 * and receive that room's live messages. This example has OPEN channels (the
 * HTTP list/send handlers only require a session — there is no per-channel
 * membership), so the guard mirrors that exactly: only `channel:<id>` rooms are
 * joinable, and only by a verified (logged-in) user. For PRIVATE channels/DMs you
 * MUST add a `channel_members` table, gate the HTTP reads by it, AND gate this
 * join the same way (see the note in the guard).
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
  // `path` is where the SSE endpoint answers `GET`/`POST`. Put it UNDER `/api`
  // so the frontend reaches it through the same `/api` proxy as every other
  // API call (Vite's dev proxy + same-origin in prod) — the default `/sse`
  // sits at the server root, which the `/api`-only dev proxy would not forward.
  // The client connects with `new EventSource('/api/realtime?room=<room>')`;
  // rooms are joined via the `?room=` query, NOT a path segment.
  setProvider(createProvider({ deferAttach: true, path: '/api/realtime' }))

  onJoinRequest(async ({ room, auth, headers }) => {
    if (!/^channel:.+$/.test(room)) return false // only channel rooms are joinable
    const userId = await verifiedUserId(auth, headers)
    if (!userId) return false
    // OPEN channels: any authenticated user may join (mirrors the HTTP list/send,
    // which only require a session). For PRIVATE channels, mirror the read authz:
    //   return isChannelMember(room.slice('channel:'.length), userId)
    return true
  })
}
