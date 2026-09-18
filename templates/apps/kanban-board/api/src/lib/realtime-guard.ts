/**
 * Realtime room-join guard for per-board rooms.
 *
 * Card/list events are broadcast to per-board rooms named `board:<boardId>` (see
 * handlers/cards.ts + handlers/lists.ts `broadcast(`board:${...}`, …)`). The
 * realtime core allows ANY connected client to join ANY room by name unless a
 * join guard is registered (@molecule/api-realtime docs: "Without a registered
 * join guard ANY connected client may join ANY room by name — apps with private
 * rooms MUST register onJoinRequest"). Without this, any authenticated user could
 * join another board's room (`board:<someone-elses-id>`) and receive its live
 * card/list traffic — a realtime IDOR alongside the HTTP board-access checks.
 *
 * This guard mirrors the board VIEW authorization:
 *   1. the client must present a verifiable session — the handshake `auth.token`
 *      or the httpOnly `token` cookie on the upgrade request, using the SAME
 *      `verify` the HTTP `verifyMiddleware` uses (never an unverified decode); and
 *   2. the room's board must be VIEWABLE by that user — they are the board OWNER
 *      (`boards.owner_id`) OR hold a `board_members` row for it. Board members
 *      legitimately view a board, so an owner-only check would break realtime for
 *      them; this matches the board's shared-view model (board_members roles:
 *      viewer/member/admin), not the owner-only WRITE guard (`requireBoardOwner`).
 *
 * Registered from `setupBonds()`. `onJoinRequest` buffers if called before the
 * realtime bond is wired and flushes on wiring, so registration ORDER is not
 * load-bearing — its PRESENCE is (no guard ⇒ the core allows every join).
 */
import { getLogger } from '@molecule/api-bond'
import { findOne } from '@molecule/api-database'
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
 * Return true if `userId` may VIEW board `boardId`. Mirrors the board read-access
 * model EXACTLY: every HTTP read (`GET /boards`, `GET /boards/:id`) filters by
 * `owner_id = userId` only, so realtime access is owner-only too — granting a
 * `board_members` row realtime access here would over-grant relative to the read
 * path (a member still 404s on `GET /boards/:id`, so they can't even load the
 * board). If a member-read HTTP path is added later, widen this to match it then.
 */
const canViewBoard = async (userId: string, boardId: string): Promise<boolean> => {
  const owned = await findOne<{ id: string }>('boards', [
    { field: 'id', operator: '=', value: boardId },
    { field: 'owner_id', operator: '=', value: userId },
  ])
  return Boolean(owned)
}

/**
 * Register the per-board join guard with `@molecule/api-realtime`. Call once
 * during server startup (done in `setupBonds()`); with no guard the realtime core
 * allows ALL joins, so this registration is load-bearing, not optional.
 */
export function registerRealtimeJoinGuard(): void {
  onJoinRequest(async (request: JoinRequestLike): Promise<boolean> => {
    const room = request.room
    if (!room) return false
    // Only `board:<boardId>` rooms exist; deny any other room name outright.
    const match = /^board:(.+)$/.exec(room)
    if (!match) return false
    const boardId = match[1]
    const userId = verifySession(request)
    if (!userId) return false
    return canViewBoard(userId, boardId)
  })
}
