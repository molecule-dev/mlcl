/**
 * Realtime room-join guard for per-meeting (`meeting:<meetingId>`) rooms.
 *
 * Meeting lifecycle, participant, and chat events are broadcast to per-meeting
 * rooms named `meeting:<meetingId>` (see handlers/meetings.ts, participants.ts,
 * chat.ts `broadcast(`meeting:${meetingId}`, …)`). The realtime core allows ANY
 * connected client to join ANY room by name unless a join guard is registered
 * (@molecule/api-realtime docs: "Without a registered join guard ANY connected
 * client may join ANY room by name — apps with private rooms MUST register
 * onJoinRequest"). Without this, any authenticated user could join another
 * meeting's room and receive its live lifecycle/participant/chat traffic — the
 * realtime equivalent of the HTTP meeting-access IDOR that `requireMeetingAccess`
 * closes.
 *
 * This guard mirrors that exact HTTP read authorization:
 *   1. the client must present a verifiable session — the handshake `auth.token`
 *      or the httpOnly `token` cookie on the upgrade request, using the SAME
 *      `verify` the HTTP `verifyMiddleware` uses (never an unverified decode); and
 *   2. the meeting must be accessible to that user via `requireMeetingAccess` (the
 *      host OR a workspace member OR a joined `meeting_participants` row) — the
 *      identical predicate `GET /meetings/:id` performs. A user with no access to
 *      the meeting can't join its realtime room, exactly as they can't read it
 *      over HTTP.
 *
 * Registered from `setupBonds()`. `onJoinRequest` buffers if called before the
 * realtime bond is wired and flushes on wiring, so registration ORDER is not
 * load-bearing — its PRESENCE is (no guard ⇒ the core allows every join).
 */
import { getLogger } from '@molecule/api-bond'
import { verify } from '@molecule/api-jwt'
import { onJoinRequest } from '@molecule/api-realtime'
import { authorization } from '@molecule/api-resource-user'

import { requireMeetingAccess } from './authz.js'

const logger = getLogger()

/** Rooms are named `meeting:<meetingId>`. */
const MEETING_ROOM = /^meeting:(.+)$/

/** The shape of a join request as delivered by the realtime provider. */
interface JoinRequestLike {
  clientId: string
  room: string
  auth: Record<string, unknown>
  headers?: Record<string, string | string[] | undefined>
}

/** Read one cookie's value from a raw `Cookie` request header. */
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
 * Verify the join request's session credential and return the authenticated user
 * id, mirroring the HTTP `verifyMiddleware` precedence: the explicit handshake
 * `auth.token` first, then the httpOnly `token` session cookie on the handshake
 * request. Returns null for a missing, malformed, expired, or tampered token.
 */
const verifySession = (request: JoinRequestLike): string | null => {
  const authToken = typeof request.auth?.token === 'string' ? request.auth.token : null
  const rawCookie = request.headers?.cookie
  const cookieHeader = Array.isArray(rawCookie) ? rawCookie.join('; ') : rawCookie
  const token =
    authToken ??
    (cookieHeader ? readCookie(cookieHeader, authorization.getAuthCookieName('token')) : null)
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
  } catch (error) {
    // Invalid/expired token is an expected condition (stale tab, logged-out client).
    logger.debug('realtime-guard: session verification failed', { error })
  }
  return null
}

/**
 * Register the per-meeting join guard with `@molecule/api-realtime`. Call once
 * during server startup (done in `setupBonds()`); with no guard the realtime core
 * allows ALL joins, so this registration is load-bearing, not optional.
 */
export function registerRealtimeJoinGuard(): void {
  onJoinRequest(async (request: JoinRequestLike): Promise<boolean> => {
    const match = MEETING_ROOM.exec(request.room ?? '')
    if (!match) return false
    const meetingId = match[1]
    if (!meetingId) return false
    const userId = verifySession(request)
    if (!userId) return false
    // Allow the join only if the user is the host, a workspace member, or a joined
    // participant of the meeting — the exact predicate GET /meetings/:id uses.
    const check = await requireMeetingAccess(meetingId, userId)
    return check.ok
  })
}
