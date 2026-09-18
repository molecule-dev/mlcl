/**
 * Realtime room-join guard for per-device rooms.
 *
 * Device data is broadcast to per-device rooms named `<prefix>:<deviceId>`:
 *   - `firmware:<deviceId>`   (handlers/firmware.ts — rollout events)
 *   - `commands:<deviceId>`   (handlers/commands.ts, firmware.ts — queued commands)
 *   - `commands:<deviceId>:status` (handlers/commands.ts — command status updates)
 *   - `telemetry:<deviceId>`  (handlers/telemetry.ts — telemetry points)
 *   - `logs:<deviceId>`       (handlers/logs.ts — device log lines)
 *
 * The realtime core allows ANY connected client to join ANY room by name unless
 * a join guard is registered (@molecule/api-realtime docs: "Without a registered
 * join guard ANY connected client may join ANY room by name — apps with private
 * rooms MUST register onJoinRequest"). Without this, any authenticated user could
 * join another owner's device rooms and receive its live telemetry/commands/logs —
 * the realtime equivalent of the HTTP device-access IDOR that every REST route
 * closes with the `device.owner_id === userId` ownership check.
 *
 * This guard mirrors that exact HTTP authorization:
 *   1. the client must present a verifiable session — the handshake `auth.token`
 *      or the httpOnly `token` cookie on the upgrade request, using the SAME
 *      `verify` the HTTP `verifyMiddleware` uses (never an unverified decode); and
 *   2. the room's device must be owned by that user (`iot_devices.owner_id ===
 *      userId`) — the identical predicate the device handlers' `ownsDevice`
 *      helper and every `GET /devices/:id`-style route perform. Device read access
 *      is pure ownership: there is no device-members / sharing table, and fleets
 *      are themselves owner-scoped groupings, so ownership is the whole read path.
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

/**
 * Every private per-device room. The deviceId is captured as the first colon-free
 * segment after the prefix, so both `commands:<id>` and its `commands:<id>:status`
 * sub-room resolve to the same `<id>` (device ids are colon-free UUIDs). Any room
 * not matching this shape is denied.
 */
const DEVICE_ROOM = /^(?:firmware|commands|telemetry|logs):([^:]+)/

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
 * Whether `userId` may read the given device — the exact predicate the device
 * handlers use (`ownsDevice`: the `iot_devices` row exists and its `owner_id`
 * equals the requesting user). Mirroring the read path keeps the realtime and
 * HTTP authorization in lock-step.
 */
const canAccessDevice = async (userId: string, deviceId: string): Promise<boolean> => {
  const device = await findById<Record<string, unknown>>('iot_devices', deviceId)
  return Boolean(device) && device!.owner_id === userId
}

/**
 * Register the per-device join guard with `@molecule/api-realtime`. Call once
 * during server startup (done in `setupBonds()`); with no guard the realtime core
 * allows ALL joins, so this registration is load-bearing, not optional.
 */
export function registerRealtimeJoinGuard(): void {
  onJoinRequest(async (request: JoinRequestLike): Promise<boolean> => {
    const match = request.room ? DEVICE_ROOM.exec(request.room) : null
    if (!match) return false
    const deviceId = match[1]
    const userId = verifySession(request)
    if (!userId) return false
    // Allow the join ONLY if the user owns the device the room broadcasts.
    return canAccessDevice(userId, deviceId)
  })
}
