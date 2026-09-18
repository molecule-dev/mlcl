/**
 * Realtime room-join guard for per-poll rooms.
 *
 * Poll events are broadcast to per-poll rooms named `poll:<pollId>` (see
 * handlers/polls.ts, votes.ts, audience_questions.ts `broadcast(`poll:${id}`, …)`).
 * The realtime core allows ANY connected client to join ANY room by name unless a
 * join guard is registered (@molecule/api-realtime docs: "Without a registered join
 * guard ANY connected client may join ANY room by name — apps with private rooms
 * MUST register onJoinRequest"). This app's HTTP read model is OWNER-ONLY: every
 * poll/results/votes read (`GET /polls/:id`, `GET /results/:pollId`, `GET
 * /votes/poll/:pollId`) 404s unless `poll.user_id === userId`. Without this guard
 * any authenticated user could join another owner's `poll:<id>` room and receive its
 * live traffic — `poll:published`, `poll:closed`, `vote:cast`, and `question:asked`
 * (which carries the asker's row) — the realtime equivalent of the HTTP owner-check
 * IDOR the route handlers close.
 *
 * This guard mirrors that exact HTTP authorization:
 *   1. the client must present a verifiable session — the handshake `auth.token`
 *      or the httpOnly `token` cookie on the upgrade request, using the SAME
 *      `verify` the HTTP `verifyMiddleware` uses (never an unverified decode); and
 *   2. the room's poll must belong to that user (`poll.user_id === userId`) — the
 *      identical owner check `polls.ts` GET /:id and `results.ts` authorizePollRead
 *      perform. (A future iteration that adds workspace-share / share_token public
 *      reads should widen BOTH the HTTP authz and this guard together, not remove
 *      the check from one.)
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

/** Only `poll:<pollId>` rooms exist in this app; extract the poll id. */
const POLL_ROOM = /^poll:(.+)$/

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
 * Register the per-poll join guard with `@molecule/api-realtime`. Call once during
 * server startup (done in `setupBonds()`); with no guard the realtime core allows
 * ALL joins, so this registration is load-bearing, not optional.
 */
export function registerRealtimeJoinGuard(): void {
  onJoinRequest(async (request: JoinRequestLike): Promise<boolean> => {
    const match = request.room ? POLL_ROOM.exec(request.room) : null
    // Only `poll:<id>` rooms are broadcast to; deny any other room name.
    if (!match) return false
    const pollId = match[1]
    const userId = verifySession(request)
    if (!userId) return false
    // Mirror the HTTP owner check: allow only the poll's owner (poll.user_id).
    const poll = await findById<Record<string, unknown>>('polls', pollId)
    return Boolean(poll && poll.user_id === userId)
  })
}
