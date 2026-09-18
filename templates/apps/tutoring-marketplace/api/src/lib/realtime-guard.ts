/**
 * Realtime room-join guard for the private message-thread + tutoring-session rooms.
 *
 * Messaging events are broadcast to `thread:<threadId>` rooms (see
 * handlers/messages.ts `broadcast(`thread:${threadId}`, …)`) and live tutoring
 * events to `session:<sessionId>` rooms (handlers/sessions.ts
 * `broadcast(`session:${id}`, …)`). The realtime core allows ANY connected
 * client to join ANY room by name unless a join guard is registered
 * (@molecule/api-realtime docs: "Without a registered join guard ANY connected
 * client may join ANY room by name — apps with private rooms MUST register
 * onJoinRequest"). Without this, any authenticated user could join another
 * user's message thread or tutoring session and receive its live traffic — the
 * realtime equivalent of the HTTP participant-access IDOR that the messages and
 * sessions handlers close for every REST route.
 *
 * This guard mirrors that exact HTTP authorization:
 *   1. the client must present a verifiable session — the handshake `auth.token`
 *      or the httpOnly `token` cookie on the upgrade request, using the SAME
 *      `verify` the HTTP `verifyMiddleware` uses (never an unverified decode); and
 *   2. the room's thread/session must list that user as a participant — the
 *      identical check the messages/sessions handlers perform before reading:
 *        • `thread:<id>`  → `message_threads.user_a_id` OR `user_b_id` is the user
 *          (mirrors `GET /threads/:threadId/messages`), and
 *        • `session:<id>` → `tutoring_sessions.student_id` is the user, OR the
 *          session's `tutor_id` → `tutor_profiles.user_id` is the user (mirrors
 *          `sessions.ts` `isParticipant()` behind `GET /sessions/:id`), and
 *        • `booking:<id>` → `bookings.student_id` is the user, OR the booking's
 *          `tutor_id` → `tutor_profiles.user_id` is the user (mirrors `bookings.ts`).
 *          The session lifecycle is ALSO broadcast to this room so both parties
 *          hear a session start/end before any session row exists.
 * Any other room shape is denied (fail closed).
 *
 * Registered from `setupBonds()`. `onJoinRequest` buffers if called before the
 * realtime bond is wired and flushes on wiring, so registration ORDER is not
 * load-bearing — its PRESENCE is (no guard ⇒ the core allows every join).
 */
import { getLogger } from '@molecule/api-bond'
import { findById } from '@molecule/api-database'
import { verify } from '@molecule/api-jwt'
import { onJoinRequest } from '@molecule/api-realtime'
import { authorization } from '@molecule/api-resource-user'

const logger = getLogger()

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
 * A message thread is private to its two participants. Mirrors the read-authz in
 * `GET /threads/:threadId/messages`: allow only if the user is `user_a_id` or
 * `user_b_id` on the thread.
 */
const canJoinThread = async (userId: string, threadId: string): Promise<boolean> => {
  const thread = await findById<Record<string, unknown>>('message_threads', threadId)
  if (!thread) return false
  return thread.user_a_id === userId || thread.user_b_id === userId
}

/**
 * A tutoring session is private to its student and tutor. Mirrors `isParticipant()`
 * behind `GET /sessions/:id`: allow if the user is the session's `student_id`, or
 * if the session's `tutor_id` resolves to a `tutor_profiles` row whose `user_id`
 * is the user.
 */
const canJoinSession = async (userId: string, sessionId: string): Promise<boolean> => {
  const session = await findById<Record<string, unknown>>('tutoring_sessions', sessionId)
  if (!session) return false
  if (session.student_id === userId) return true
  const tutor = await findById<Record<string, unknown>>('tutor_profiles', String(session.tutor_id))
  return !!tutor && tutor.user_id === userId
}

/**
 * A booking is private to its student and tutor — the SAME two parties as the
 * session it spawns. Mirrors `bookings.ts` participant authz (student_id direct,
 * or tutor_id → tutor_profiles.user_id). The `booking:<id>` room carries the
 * session lifecycle so BOTH parties can hear a session start/end from the moment
 * they open the booking, before any `tutoring_sessions` row exists (which the
 * session-id-keyed room cannot deliver to the non-starting party).
 */
const canJoinBooking = async (userId: string, bookingId: string): Promise<boolean> => {
  const booking = await findById<Record<string, unknown>>('bookings', bookingId)
  if (!booking) return false
  if (booking.student_id === userId) return true
  const tutor = await findById<Record<string, unknown>>('tutor_profiles', String(booking.tutor_id))
  return !!tutor && tutor.user_id === userId
}

/**
 * Register the thread/session join guard with `@molecule/api-realtime`. Call once
 * during server startup (done in `setupBonds()`); with no guard the realtime core
 * allows ALL joins, so this registration is load-bearing, not optional.
 */
export function registerRealtimeJoinGuard(): void {
  onJoinRequest(async (request: JoinRequestLike): Promise<boolean> => {
    const room = request.room
    if (!room) return false
    const userId = verifySession(request)
    if (!userId) return false

    const threadMatch = /^thread:(.+)$/.exec(room)
    if (threadMatch) return canJoinThread(userId, threadMatch[1])

    const sessionMatch = /^session:(.+)$/.exec(room)
    if (sessionMatch) return canJoinSession(userId, sessionMatch[1])

    const bookingMatch = /^booking:(.+)$/.exec(room)
    if (bookingMatch) return canJoinBooking(userId, bookingMatch[1])

    // Unknown room shape — fail closed.
    return false
  })
}
