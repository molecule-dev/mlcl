/**
 * Realtime room-join guard for live quiz-session rooms.
 *
 * Session events are broadcast to per-session rooms named `session:<id>` (see
 * handlers/sessions.ts `broadcast(`session:${id}`, …)` for player-joined,
 * session-started, next-question, session-finished). The realtime core allows
 * ANY connected client to join ANY room by name unless a join guard is
 * registered (@molecule/api-realtime docs: "no guards → any client may join any
 * room by name — apps with private rooms MUST register onJoinRequest"). Without
 * this, ANY client — even an unauthenticated one — could join another quiz's
 * `session:<id>` room and receive its live traffic (the participant list, the
 * questions as they are pushed, the finish event): the realtime equivalent of an
 * IDOR on the session HTTP routes.
 *
 * This guard mirrors the session HTTP authorization model. The HTTP read
 * (`GET /sessions/:id`) and join (`POST /sessions/:id/join`) handlers require a
 * verified session (`getUserId`) and NOTHING more — any authenticated user may
 * read a session and join a `status:'waiting'` session as a participant; there
 * is no join-code or enrollment gate on those routes, and the room id is the
 * session id (not the secret join_code). So the correct mirror is:
 *
 *   1. the room name must be a `session:<id>` room (the only rooms the app
 *      broadcasts to; every other room is denied — there are none); and
 *   2. the client must present a verifiable session — the handshake `auth.token`
 *      or the httpOnly `token` cookie on the upgrade request, using the SAME
 *      `verify` the HTTP `verifyMiddleware` uses (never an unverified decode).
 *
 * A verified user is then allowed in, exactly as the HTTP join/read routes allow
 * any authenticated user. A stricter host+participant gate would be MORE
 * restrictive than the HTTP model and would break legitimate participants (who
 * join the room to watch the lobby before/at the moment they register), so it is
 * intentionally NOT applied here — it would diverge from the mirrored contract.
 *
 * Registered from `setupBonds()`. `onJoinRequest` buffers if called before the
 * realtime bond is wired and flushes on wiring, so registration ORDER is not
 * load-bearing — its PRESENCE is (no guard ⇒ the core allows every join).
 */
import { getLogger } from '@molecule/api-bond'
import { verify } from '@molecule/api-jwt'
import { onJoinRequest } from '@molecule/api-realtime'
import { authorization } from '@molecule/api-resource-user'

const logger = getLogger()

/** Matches the app's only broadcast room shape: `session:<id>`. */
const SESSION_ROOM = /^session:(.+)$/

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
 * Register the session join guard with `@molecule/api-realtime`. Call once during
 * server startup (done in `setupBonds()`); with no guard the realtime core allows
 * ALL joins, so this registration is load-bearing, not optional.
 */
export function registerRealtimeJoinGuard(): void {
  onJoinRequest(async (request: JoinRequestLike): Promise<boolean> => {
    const room = request.room
    if (!room || !SESSION_ROOM.test(room)) return false
    // Mirror the HTTP session read/join model: any verified (logged-in) user may
    // join. There is no join-code/enrollment gate on the HTTP routes, so none here.
    const userId = verifySession(request)
    return Boolean(userId)
  })
}
