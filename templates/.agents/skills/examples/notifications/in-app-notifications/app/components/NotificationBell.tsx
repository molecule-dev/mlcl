import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react'

import { NotificationWrapper } from '@molecule/app-notification-badge-react'
import type { NotificationItem } from '@molecule/app-notification-center-react'
import { NotificationCenter } from '@molecule/app-notification-center-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

type RawNotification = {
  id: string
  type: string
  actor_name: string
  subject_title: string
  created_at: string
  read_at: string | null
}

/**
 * Notifications the panel keeps: ONE page, the same one `GET
 * /api/notifications` serves (api/handlers/notifications.ts clamps the list to
 * `limit`, default 20), and the same number this component asks for.
 *
 * Live arrivals are PREPENDED by the SSE subscription below, so without a bound
 * a long-lived tab accumulated every notification it ever saw — thousands of
 * rows in the open dropdown — while the server's own page stayed at 20. Capping
 * at the page size keeps the panel showing the NEWEST page, which is exactly
 * what a reload renders.
 */
const NOTIFICATION_PAGE_SIZE = 20

/**
 * Parse one `notification:created` frame, or null when the frame carries no
 * notification.
 *
 * A realtime frame is untrusted input: the SSE wire format puts ANYTHING after
 * `data:` on the wire (a proxy keep-alive, a payload published by another
 * writer), and this frame is PREPENDED to the panel's list. An unvalidated
 * value is dereferenced when the panel renders (`centerItems` maps over
 * `items` and reads `n.id`), so a frame whose payload is `null` — or any other
 * non-object — threw `TypeError: Cannot read properties of null` out of the
 * render, and React unmounts a component that throws: the whole page went
 * blank. A frame that is not JSON at all threw `SyntaxError` out of the
 * listener itself.
 *
 * So: drop anything that is not an object carrying the string `id` the list is
 * keyed and addressed by (the read POST uses `n.id`). Dropping is the right
 * failure here — `GET /api/notifications` is the durable record, and the live
 * feed is best-effort.
 *
 * `read_at` is the one field the component reads as STATE, not for display, so
 * the frame is normalized to the declared `RawNotification` shape at this
 * boundary: a timestamp string, or null (= unread). A frame that omits it
 * arrived as `undefined`, and `undefined !== null` — so every one of the three
 * checks below (the two unread→read guards, and `centerItems`' `read` flag)
 * read the row as already READ. The badge had just counted it unread, the row
 * rendered as read, and neither the click nor the SSE echo could ever decrement
 * (both guards return early): one notification stuck in the badge for the life
 * of the mount.
 *
 * @param data - The raw `event.data` string of one SSE frame.
 * @returns The frame's notification, or null when the frame is not one.
 */
function parseNotificationFrame(data: string): RawNotification | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch (_error) {
    // Not JSON (a proxy keep-alive, a truncated payload) — nothing to render.
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const { id, read_at: readAt } = parsed as { id?: unknown; read_at?: unknown }
  if (typeof id !== 'string' || id.length === 0) return null
  return {
    ...(parsed as RawNotification),
    id,
    read_at: typeof readAt === 'string' ? readAt : null,
  }
}

export function NotificationBellWidget({ userId }: { userId: string }): ReactElement {
  const { t } = useTranslation()
  const cm = getClassMap()
  const [items, setItems] = useState<RawNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  // Whether the last list READ failed (offline, a non-2xx, a body that is not
  // the page). The mount effect clears the panel up front, so without this the
  // shared center's empty state — "You're all caught up." — was the answer to a
  // load that never arrived: a wrong claim, indistinguishable from a genuinely
  // empty inbox. The same rule the sibling slices state at their own catches
  // (Leaderboard, BlogIndexPage, OrdersPage, AttachmentsPanel).
  const [loadFailed, setLoadFailed] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  // The rows the badge has already counted a read for (this tab's own clicks,
  // or an SSE echo that landed first). The read endpoint is IDEMPOTENT —
  // re-reading an already-read row re-broadcasts `notification:read` — and the
  // broadcast fires for every request, so the badge may only decrement on the
  // unread→read TRANSITION, never per event: three clicks on a read row would
  // otherwise drain a badge that still had three unread behind it, with no
  // resync until a reload.
  const countedReadRef = useRef<Set<string>>(new Set())
  // Latest committed rows, for the SSE listener below (events arrive outside
  // the render that would close over fresher state).
  const itemsRef = useRef<RawNotification[]>([])
  itemsRef.current = items

  /**
   * The mark-all-read transition, in ONE place.
   *
   * This is the SSE path's copy: the `notification:all-read` frame the handler
   * broadcasts to the user's room (this tab's button, or another tab of the
   * same user marking everything read). Frames arrive in PUBLISH order, so a
   * notification created after the server's mark-all write is delivered after
   * this frame — marking everything on screen read here cannot clobber it.
   * The button's own fetch path uses {@link applyAllReadFor}, whose response
   * has no such ordering.
   *
   * The two copies were written separately, and this frame's copy only zeroed
   * the badge — the rows kept `read_at: null`, so the panel rendered every one
   * of them as unread under a badge reading zero, with nothing to resync it
   * until a reload. Both apply the badge AND the rows together, so they cannot
   * drift again.
   */
  const applyAllRead = useCallback((): void => {
    setUnread(0)
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
  }, [])

  /**
   * The mark-all-read transition for the button's own POST response — scoped to
   * the rows the request could have covered.
   *
   * An HTTP response carries no ordering: a notification delivered while the
   * POST was in flight was CREATED after the server's mark-all write, so the
   * server still holds it unread — but applying the blanket transform at
   * response time marked it read here anyway, and zeroed the badge the frame
   * had just raised. The reader missed a live notification until a reload (the
   * same stale-response clobber the save paths guard against: the response
   * describes the list as the request LEFT it, not as it stands now). So the
   * rows on screen when the button was pressed are captured, and only those
   * flip; the badge moves by the transitions that actually happened, not to
   * zero (an unread row that is gone from the page keeps its count, the same
   * incremental semantics the read path applies).
   *
   * @param ids - The notification ids on screen when the mark-all was issued.
   */
  const applyAllReadFor = useCallback((ids: ReadonlySet<string>): void => {
    const now = new Date().toISOString()
    let newlyRead = 0
    for (const n of itemsRef.current) {
      if (ids.has(n.id) && n.read_at === null) newlyRead += 1
    }
    if (newlyRead > 0) setUnread((u) => Math.max(0, u - newlyRead))
    setItems((prev) => prev.map((n) => (ids.has(n.id) ? { ...n, read_at: n.read_at ?? now } : n)))
  }, [])

  // Keep the counted-read set as small as its guards need: an id can only ever
  // be re-counted while its row is on screen (both the SSE handler and markRead
  // return early unless the row is present AND unread), and the list only
  // PREPENDS, so an id that fell off the page can never come back this mount.
  // Without this prune the set kept one entry per notification read for the
  // whole life of the tab — unbounded growth in a component whose own panel is
  // bounded to NOTIFICATION_PAGE_SIZE.
  useEffect(() => {
    if (countedReadRef.current.size === 0) return
    const live = new Set(items.map((n) => n.id))
    for (const id of countedReadRef.current) {
      if (!live.has(id)) countedReadRef.current.delete(id)
    }
  }, [items])

  useEffect(() => {
    // Another user's bell must never show THIS user's rows: the state is cleared
    // up front (the load below fills it) instead of leaving the previous
    // subscription's items and unread count on screen.
    setItems([])
    setUnread(0)
    // The previous user's verdict goes with their rows — see `loadFailed`.
    setLoadFailed(false)
    // A `userId` change starts a NEW load while the previous one may still be in
    // flight; without this guard the LATE response wins and the bell shows the
    // other user's notifications.
    let cancelled = false
    fetch(`/api/notifications?limit=${NOTIFICATION_PAGE_SIZE}`)
      // A non-2xx is a FAILED load, not an empty bell: without the gate a 500's
      // `{ error }` body (and a 401's) parsed as happily as the page did and was
      // then read as "no notifications" (see the shape gate below).
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((p: { items?: RawNotification[]; unread?: number }) => {
        if (cancelled) return
        // A 2xx proves the route ANSWERED, not that the body is the page. A body
        // that is not the list (a shrunken rewrite, a proxy's 200, an `{ error }`
        // envelope) used to be coerced to an EMPTY page — which zeroed the badge
        // and told the reader "You're all caught up." for notifications that
        // simply never arrived. Same gate the sibling slices apply (Leaderboard,
        // BlogIndexPage): a body that is not the list is a FAILED load, while an
        // empty list stays a legitimately empty bell. Nothing is written on this
        // path, so a live frame that already landed keeps its row and its count.
        if (!Array.isArray(p.items)) {
          setLoadFailed(true)
          return
        }
        const page: RawNotification[] = p.items
        const pageIds = new Set(page.map((n) => n.id))
        // Capping a snapshot taken BEFORE this request answered over the panel
        // dropped every row the live feed delivered while it was in flight: the
        // frame above prepended it and raised the badge, then the page landed
        // without it and the notification vanished until a reload — the same
        // defect the in-app-chat slice's history load fixed by MERGING (see
        // templates/.agents/skills/examples/messaging/in-app-chat/app/pages/ChatPage.tsx).
        // So the page is MERGED: the live rows it cannot carry stay, newest
        // first, ahead of its own rows, and a row both know about is kept once.
        setItems((prev) =>
          [...prev.filter((n) => !pageIds.has(n.id)), ...page].slice(0, NOTIFICATION_PAGE_SIZE),
        )
        // The page's count already covers every row it carries — a live row it
        // also carries must NOT be added again — so only the unread among the
        // rows the page cannot know is added on top. `itemsRef` is the committed
        // panel at this instant (the reset above and every frame since).
        const liveOnly = itemsRef.current.filter((n) => !pageIds.has(n.id))
        const liveUnread = liveOnly.filter((n) => n.read_at === null).length
        setUnread(typeof p.unread === 'number' ? p.unread + liveUnread : liveUnread)
        // The page landed: whatever a previous failed load said is no longer true.
        setLoadFailed(false)
      })
      .catch(() => {
        // A failed load is REPORTED, not left as an empty bell: "You're all
        // caught up." over a list that never arrived is a claim this tab cannot
        // make (see `loadFailed`). The rejection must not escape the effect
        // either. Live frames still deliver their own rows and counts — they are
        // merged on top of whatever this tab already holds.
        if (!cancelled) setLoadFailed(true)
      })

    // Subscribe to THIS user's room, whose name must match the handlers'
    // `broadcast(`user:${userId}`, …)` exactly. The room goes in the `?room=`
    // QUERY PARAM: the SSE provider streams ONE configured path and parses rooms
    // from `?room=`/`?rooms=` only, so a trailing path segment
    // (`/api/realtime/user:<id>`) is neither the stream path nor a room and
    // silently receives nothing. The bond (`api/bonds/realtime-sse.ts`) must
    // pass `path: '/api/realtime'` for this URL to reach the stream.
    const events = new EventSource(`/api/realtime?room=${encodeURIComponent(`user:${userId}`)}`)
    events.addEventListener('notification:created', (e) => {
      // Untrusted frame — see parseNotificationFrame: an unvalidated payload
      // crashed the render (null) or threw out of this listener (non-JSON).
      const n = parseNotificationFrame((e as MessageEvent).data)
      if (!n) return
      // Newest first, bounded to the page the panel was built from — see
      // NOTIFICATION_PAGE_SIZE. Unbounded, this list grows with the session.
      setItems((prev) => [n, ...prev].slice(0, NOTIFICATION_PAGE_SIZE))
      // The badge is the number of UNREAD rows, so only a frame that arrives
      // unread may raise it: a frame that is already read (a re-broadcast, a
      // replay published by another writer) has no unread→read transition to
      // count, and incrementing it left the badge one above the rows with
      // nothing able to bring it down — the read guards return early for a row
      // that is not unread.
      if (n.read_at === null) setUnread((u) => u + 1)
    })
    events.addEventListener('notification:read', (e) => {
      // Only an unread→read transition this tab has not already counted may
      // decrement — see countedReadRef. A frame without an id is not a read
      // receipt at all.
      const frame = parseNotificationFrame((e as MessageEvent).data)
      if (!frame || countedReadRef.current.has(frame.id)) return
      const row = itemsRef.current.find((n) => n.id === frame.id)
      if (!row || row.read_at !== null) return
      countedReadRef.current.add(frame.id)
      setUnread((u) => Math.max(0, u - 1))
      setItems((prev) =>
        prev.map((n) => (n.id === frame.id ? { ...n, read_at: new Date().toISOString() } : n)),
      )
    })
    events.addEventListener('notification:all-read', () => applyAllRead())
    return () => {
      cancelled = true
      events.close()
    }
  }, [userId, applyAllRead])

  // Close panel when clicking outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent): void {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function markRead(id: string): Promise<void> {
    // Apply the local "read" state only AFTER the server accepted it: a failed
    // POST (offline, 500) must not clear the unread badge while the row is
    // still unread server-side. The shared center calls this from a void
    // onClick, so an escaping rejection would be unhandled.
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
      if (!res.ok) return
      // Count the transition HERE (the handler broadcasts, but this tab may
      // apply it first), and only for a row that was actually unread — clicking
      // an already-read row must not move the badge. `countedReadRef` then
      // keeps the SSE echo of THIS write from counting it a second time (the
      // echo can land before or after this line).
      if (countedReadRef.current.has(id)) return
      const row = itemsRef.current.find((n) => n.id === id)
      if (!row || row.read_at !== null) return
      countedReadRef.current.add(id)
      setUnread((u) => Math.max(0, u - 1))
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
      )
    } catch (_error) {
      // Network failure — the notification stays unread; the next SSE event or
      // reload resyncs the badge.
    }
  }

  async function markAllRead(): Promise<void> {
    // The rows this click can mark read: the ones on screen when the request
    // was ISSUED — see applyAllReadFor for why the response must not mark
    // whatever is on screen by the time it lands.
    const covered = new Set(itemsRef.current.map((n) => n.id))
    try {
      const res = await fetch('/api/notifications/mark-all-read', { method: 'POST' })
      if (!res.ok) return
      applyAllReadFor(covered)
    } catch (_error) {
      // Network failure — the badge keeps its count; nothing was marked read.
    }
  }

  const centerItems: NotificationItem[] = items.map((n) => ({
    id: n.id,
    title: t(
      `notifications.${n.type}`,
      { actor: n.actor_name, subject: n.subject_title },
      {
        defaultValue: `${n.actor_name} did something on "${n.subject_title}"`,
      },
    ),
    timestamp: n.created_at,
    read: n.read_at !== null,
    onClick: () => {
      void markRead(n.id)
    },
  }))

  return (
    <div className={cm.position('relative')} ref={panelRef} style={{ display: 'inline-block' }}>
      {/* Bell icon button with unread count badge */}
      <NotificationWrapper count={unread}>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t(
            'notifications.bellLabel',
            { count: unread },
            { defaultValue: 'Notifications ({{count}} unread)' },
          )}
          onClick={() => setOpen((o) => !o)}
        >
          {/* SVG bell icon — swap for an Icon component if your project has one */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </Button>
      </NotificationWrapper>

      {/* Dropdown notification panel */}
      {open && (
        <div
          className={cm.position('absolute')}
          style={{ top: '100%', right: 0, zIndex: 50, marginTop: 8 }}
        >
          <NotificationCenter
            items={centerItems}
            onMarkAllRead={markAllRead}
            emptyState={
              // Only a load that ANSWERED may claim the reader is caught up (see
              // `loadFailed`): with nothing on screen and a failed read, the
              // panel's empty state is the one sentence it must not say.
              loadFailed
                ? t('notifications.loadFailed', undefined, {
                    defaultValue: 'Could not load your notifications — refresh to try again.',
                  })
                : t('notifications.empty', undefined, {
                    defaultValue: "You're all caught up.",
                  })
            }
          />
        </div>
      )}
    </div>
  )
}
