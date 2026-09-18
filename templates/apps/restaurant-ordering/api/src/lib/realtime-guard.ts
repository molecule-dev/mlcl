/**
 * Realtime room-join guard for the kitchen + per-table order-status rooms.
 *
 * Order events are broadcast to two DIFFERENT trust levels (see
 * handlers/orders.ts, handlers/kitchen.ts, handlers/guest.ts):
 *   - `'kitchen'` — a staff/back-of-house room carrying EVERY order's traffic.
 *   - `` `table:${table_id}` `` — a per-table room carrying that table's order
 *     status.
 * The realtime core allows ANY connected client to join ANY room by name unless a
 * join guard is registered (@molecule/api-realtime docs: "Without a registered join
 * guard ANY connected client may join ANY room by name — apps with private rooms
 * MUST register onJoinRequest"). Without this, any client could join `'kitchen'`
 * and watch every order flow through the restaurant, or join another table's room —
 * the realtime equivalent of the HTTP IDORs the per-`user_id` handler scoping closes
 * for every REST route.
 *
 * ROLE MODEL (see bonds/resource-order.ts): this app has NO role column. Every
 * AUTHENTICATED user is a restaurant OPERATOR (staff — one tenant per operator);
 * DINERS are guests who order through the public, UNAUTHENTICATED QR `/guest/orders`
 * flow and never hold a session. Orders and tables are owned by `user_id` (the
 * operator). So "staff" == a verifiable session, and a valid session is the floor
 * for every private room here.
 *
 * This guard mirrors that exact HTTP authorization:
 *   1. the client must present a verifiable session — the handshake `auth.token`
 *      or the httpOnly `token` cookie on the upgrade request, using the SAME
 *      `verify` the HTTP `verifyMiddleware` uses (never an unverified decode); then
 *   2. `'kitchen'` (exact): allow ANY authenticated operator — mirrors the HTTP
 *      kitchen authz (`getUserId(res)` non-null); an unauthenticated diner is denied.
 *   3. `` `table:<id>` ``: allow only the operator who owns that table (or an order
 *      filed at it) — mirrors the HTTP order/table read authz, which scopes every
 *      read to `user_id === userId`. This also stops one operator joining another
 *      tenant's table room.
 *
 * Note: `'kitchen'` is a single GLOBAL room name (not per-tenant), so every
 * authenticated operator shares it — closing the staff-vs-diner IDOR this task
 * targets, but not the separate cross-tenant broadcast-fan-out question (which would
 * require per-tenant room names at the broadcast sites). The `table:<id>` room IS
 * ownership-scoped here.
 *
 * Registered from `setupBonds()`. `onJoinRequest` buffers if called before the
 * realtime bond is wired and flushes on wiring, so registration ORDER is not
 * load-bearing — its PRESENCE is (no guard ⇒ the core allows every join).
 */
import { getLogger } from '@molecule/api-bond'
import { findById, findOne } from '@molecule/api-database'
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
 * True when `userId` (an operator) is authorized for the `table:<id>` room —
 * mirroring the HTTP order/table read authz (every read scoped to `user_id`):
 * the operator owns the table row itself, OR owns an order filed at that table.
 */
const isAuthorizedForTable = async (userId: string, tableId: string): Promise<boolean> => {
  const table = await findById<Record<string, unknown>>('tables', tableId)
  if (table && table.user_id === userId) return true
  const order = await findOne<Record<string, unknown>>('orders', [
    { field: 'table_id', operator: '=', value: tableId },
    { field: 'user_id', operator: '=', value: userId },
  ])
  return Boolean(order)
}

/**
 * Register the kitchen + per-table join guard with `@molecule/api-realtime`. Call
 * once during server startup (done in `setupBonds()`); with no guard the realtime
 * core allows ALL joins, so this registration is load-bearing, not optional.
 */
export function registerRealtimeJoinGuard(): void {
  onJoinRequest(async (request: JoinRequestLike): Promise<boolean> => {
    const room = request.room
    if (!room) return false
    // Every trusted party here is an authenticated operator; diners are
    // unauthenticated and hold no session, so a valid session is the floor.
    const userId = verifySession(request)
    if (!userId) return false

    // Staff/back-of-house room — allow any authenticated operator (mirrors the
    // HTTP kitchen authz: `getUserId(res)` non-null). Unauthenticated diner denied.
    if (room === 'kitchen') return true

    // Per-table order-status room — only the operator who owns that table/order.
    const tableMatch = /^table:(.+)$/.exec(room)
    if (tableMatch) {
      return isAuthorizedForTable(userId, tableMatch[1] as string)
    }

    // Unknown/unlisted room — deny by default.
    return false
  })
}
