/**
 * Realtime room-join guard for per-spreadsheet / per-sheet rooms.
 *
 * Live edits are broadcast to two room shapes (see `safeBroadcast(room, …)`):
 *   - `sheet:<sheetId>`             — row/column/cell traffic (handlers/rows.ts,
 *                                     handlers/columns.ts)
 *   - `spreadsheet:<spreadsheetId>` — sheet add/rename/reorder + version
 *                                     restores (handlers/sheets.ts,
 *                                     handlers/versions.ts)
 *
 * The realtime core allows ANY connected client to join ANY room by name unless
 * a join guard is registered (@molecule/api-realtime: "Without a registered join
 * guard ANY connected client may join ANY room by name — apps with private rooms
 * MUST register onJoinRequest"). Without this, any authenticated user could join
 * another user's `sheet:<id>` / `spreadsheet:<id>` room and receive its live cell
 * edits — the realtime equivalent of the HTTP IDOR the handlers close by scoping
 * every read to the owning user.
 *
 * This guard mirrors that HTTP read-access:
 *   1. the client must present a verifiable session — the handshake `auth.token`
 *      or the httpOnly `token` cookie on the upgrade request, using the SAME
 *      `verify` the HTTP `verifyMiddleware` uses (never an unverified decode); and
 *   2. the room's spreadsheet must be viewable by that user — the owner
 *      (`spreadsheets.owner_id = userId`) OR a `spreadsheet_collaborators` row for
 *      that spreadsheet with `user_id = userId` (the viewer/editor sharing model).
 *      A `sheet:<id>` room resolves the sheet's `spreadsheet_id` first, then
 *      applies the same predicate.
 *
 * NOTE: the current REST read handlers (spreadsheets/sheets/rows/columns) scope
 * strictly to `owner_id`; they do not yet consult `spreadsheet_collaborators`, so
 * an invited viewer/editor cannot read a shared workbook over REST (a separate
 * latent gap). This guard mirrors the INTENDED sharing model — owner OR
 * collaborator — matching the collaborator resource's viewer/editor roles, so it
 * is deliberately no narrower than that sharing surface. Deny for everyone else.
 *
 * Registered from `setupBonds()`. `onJoinRequest` buffers if called before the
 * realtime bond is wired and flushes on wiring, so registration ORDER is not
 * load-bearing — its PRESENCE is (no guard ⇒ the core allows every join).
 */
import { findOne } from '@molecule/api-database'
import { verify } from '@molecule/api-jwt'
import { logger } from '@molecule/api-logger'
import { onJoinRequest } from '@molecule/api-realtime'
import { authorization } from '@molecule/api-resource-user'

/** The shape of a join request as delivered by the realtime provider. */
interface JoinRequestLike {
  clientId: string
  room: string
  auth: Record<string, unknown>
  headers?: Record<string, string | string[] | undefined>
}

interface SpreadsheetRow {
  id: string
  owner_id: string
}

interface SheetRow {
  id: string
  spreadsheet_id: string
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
 * Can `userId` view the spreadsheet? Mirrors the REST read EXACTLY: every read
 * (`GET /spreadsheets/:id`, rows, columns, sheets) filters by `owner_id = userId`
 * only, so realtime access is owner-only too. The `spreadsheet_collaborators`
 * table exists but NO read handler consults it yet — an invited collaborator
 * cannot REST-read the workbook, so granting them realtime here would over-grant
 * relative to the read path. If a collaborator-read HTTP path is added later,
 * widen this to match it then. Returns false if the spreadsheet isn't owned.
 */
const canViewSpreadsheet = async (userId: string, spreadsheetId: string): Promise<boolean> => {
  const spreadsheet = await findOne<SpreadsheetRow>('spreadsheets', [
    { field: 'id', operator: '=', value: spreadsheetId },
    { field: 'owner_id', operator: '=', value: userId },
  ])
  return Boolean(spreadsheet)
}

/**
 * Resolve the spreadsheet id a room grants access to. `spreadsheet:<id>` is the
 * id directly; `sheet:<id>` resolves its parent `spreadsheet_id`. Any other room
 * shape (or an unknown/deleted sheet) resolves to null → the join is denied.
 */
const spreadsheetIdForRoom = async (room: string): Promise<string | null> => {
  const sep = room.indexOf(':')
  if (sep === -1) return null
  const prefix = room.slice(0, sep)
  const id = room.slice(sep + 1)
  if (!id) return null
  if (prefix === 'spreadsheet') return id
  if (prefix === 'sheet') {
    const sheet = await findOne<SheetRow>('sheets', [{ field: 'id', operator: '=', value: id }])
    return sheet?.spreadsheet_id ?? null
  }
  return null
}

/**
 * Register the per-spreadsheet join guard with `@molecule/api-realtime`. Call
 * once during server startup (done in `setupBonds()`); with no guard the realtime
 * core allows ALL joins, so this registration is load-bearing, not optional.
 */
export function registerRealtimeJoinGuard(): void {
  onJoinRequest(async (request: JoinRequestLike): Promise<boolean> => {
    const room = request.room
    if (!room) return false
    const userId = verifySession(request)
    if (!userId) return false
    const spreadsheetId = await spreadsheetIdForRoom(room)
    if (!spreadsheetId) return false
    return canViewSpreadsheet(userId, spreadsheetId)
  })
}
