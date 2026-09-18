/**
 * Realtime join guard for team-chat — the authorization boundary for live
 * subscriptions.
 *
 * Message/reaction/thread/member events are broadcast to per-channel rooms
 * named `channel:<channelId>` (see the handlers), and channels are
 * membership-scoped. Without a guard, ANY connected socket could join any
 * channel's room and receive its live traffic — the realtime equivalent of
 * the HTTP IDOR closed by `authorizeChannel` (see ./authz.ts). This guard
 * enforces the same contract at the socket layer:
 *
 * 1. Only rooms matching `channel:<id>` are joinable — everything else is
 *    denied outright.
 * 2. The client must present a verifiable session, exactly like the HTTP
 *    middleware (`verifyMiddleware` in @molecule/api-resource-user): an
 *    explicit `auth.token` bearer JWT when the client has one in memory,
 *    FALLING BACK to the httpOnly `token` session cookie on the handshake
 *    request. The cookie fallback is load-bearing: the app keeps the bearer
 *    token in memory only (the [M1-1] XSS-hardening model), so after any
 *    full page load `getAccessToken()` is null and the cookie — which the
 *    browser attaches to the same-origin handshake automatically — is the
 *    ONLY credential. Both paths use the same `verify` from
 *    `@molecule/api-jwt` (signature + expiry — never an unverified decode).
 * 3. The authenticated user must be a member of the channel (a
 *    `channel_members` row), or its creator — mirroring `authorizeChannel`'s
 *    implicit-creator rule for legacy channels with no membership row.
 *
 * Registered from `setupBonds()` (bonds/index.ts). `onJoinRequest` buffers
 * guards registered before the realtime bond is wired, so registration order
 * within startup is safe.
 *
 * @module
 */

import { findOne } from '@molecule/api-database'
import { verify } from '@molecule/api-jwt'
import { logger } from '@molecule/api-logger'
import { onJoinRequest } from '@molecule/api-realtime'
import { authorization } from '@molecule/api-resource-user'

/** Rooms clients may request: `channel:<channelId>` (id must be non-empty). */
const CHANNEL_ROOM_PATTERN = /^channel:(.+)$/

/** The shape of a join request as delivered by the realtime provider. */
interface JoinRequestLike {
  clientId: string
  room: string
  auth: Record<string, unknown>
  headers?: Record<string, string | string[] | undefined>
}

/**
 * Read one cookie's value from a raw `Cookie` request header.
 *
 * @param cookieHeader - The raw header value (`a=1; b=2`).
 * @param name - The cookie name to extract.
 * @returns The decoded value, or null when absent.
 */
const readCookie = (cookieHeader: string, name: string): string | null => {
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim())
      } catch (_error) {
        // Malformed percent-encoding in a cookie we didn't set — treat as absent.
        return null
      }
    }
  }
  return null
}

/**
 * Extract the session JWT from a join request, mirroring the HTTP
 * `verifyMiddleware` precedence: the explicit handshake `auth.token` first,
 * falling back to the httpOnly `token` session cookie on the handshake
 * request (the only credential after a page reload under the
 * in-memory-token model).
 *
 * @param request - The join request delivered by the realtime provider.
 * @returns The raw JWT, or null when no credential is present.
 */
const extractSessionToken = (request: JoinRequestLike): string | null => {
  const authToken = typeof request.auth?.token === 'string' ? request.auth.token : null
  if (authToken) return authToken
  const rawCookie = request.headers?.cookie
  const cookieHeader = Array.isArray(rawCookie) ? rawCookie.join('; ') : rawCookie
  if (!cookieHeader) return null
  return readCookie(cookieHeader, authorization.getAuthCookieName('token'))
}

/**
 * Verify a session credential and return the authenticated user id, using
 * the SAME `verify` the HTTP middleware uses. Returns null for a missing,
 * malformed, expired, or tampered token — never an unverified decode.
 *
 * @param request - The join request delivered by the realtime provider.
 * @returns The verified user id, or null when the session cannot be trusted.
 */
const verifySession = (request: JoinRequestLike): string | null => {
  const token = extractSessionToken(request)
  if (!token) return null
  try {
    const payload = verify(token)
    if (payload && typeof payload === 'object' && typeof payload.userId === 'string') {
      return payload.userId
    }
  } catch (error) {
    // Invalid/expired token is an expected condition (stale tab, logged-out
    // client) — deny the join, but leave a trace for debugging.
    logger.debug('realtime-guard: session verification failed', { error })
  }
  return null
}

/**
 * Register the channel-membership join guard with `@molecule/api-realtime`.
 * Call once during server startup (done in `setupBonds()`); with no guard
 * registered the realtime core allows ALL joins, so this registration is
 * load-bearing, not optional.
 */
export function registerRealtimeJoinGuard(): void {
  onJoinRequest(async (request: JoinRequestLike): Promise<boolean> => {
    // 1. Only per-channel rooms are joinable.
    const match = CHANNEL_ROOM_PATTERN.exec(request.room)
    if (!match) return false
    const channelId = match[1] as string

    // 2. The client must present a verifiable session (auth.token OR the
    // httpOnly session cookie on the handshake request).
    const userId = verifySession(request)
    if (!userId) return false

    // 3. The user must be a member of the channel...
    const membership = await findOne('channel_members', [
      { field: 'channel_id', operator: '=', value: channelId },
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (membership) return true

    // ...or its creator (implicit member — matches authorizeChannel's rule
    // for legacy channels that predate creator auto-enrollment).
    const channel = await findOne('channels', [{ field: 'id', operator: '=', value: channelId }])
    return channel !== null && String((channel as Record<string, unknown>).created_by) === userId
  })
}
