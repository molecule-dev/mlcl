import { useCallback, useEffect, useRef, useState } from 'react'

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
  const id = (parsed as { id?: unknown }).id
  if (typeof id !== 'string' || id.length === 0) return null
  return parsed as RawNotification
}

export function NotificationBellWidget({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const [items, setItems] = useState<RawNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
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
   * Two things trigger it: this tab's "mark all read" button, and the
   * `notification:all-read` frame the handler broadcasts to the user's room
   * (another tab of the same user marked everything read). They were written
   * separately, and the frame's copy only zeroed the badge — the rows kept
   * `read_at: null`, so the panel rendered every one of them as unread under a
   * badge reading zero, with nothing to resync it until a reload. Both paths
   * now apply the badge AND the rows together, so they cannot drift again.
   */
  const applyAllRead = useCallback((): void => {
    setUnread(0)
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
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
    // A `userId` change starts a NEW load while the previous one may still be in
    // flight; without this guard the LATE response wins and the bell shows the
    // other user's notifications.
    let cancelled = false
    fetch(`/api/notifications?limit=${NOTIFICATION_PAGE_SIZE}`)
      .then((r) => r.json())
      // Coerce the body to the state's shape: a 500's `{ error }` JSON would
      // set items to undefined and crash the render's items.map.
      .then((p) => {
        if (cancelled) return
        setItems(Array.isArray(p.items) ? p.items : [])
        setUnread(typeof p.unread === 'number' ? p.unread : 0)
      })
      .catch(() => {
        // A failed load leaves the bell at its initial empty state; the SSE
        // subscription below still delivers live notifications.
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
      setUnread((u) => u + 1)
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
    try {
      const res = await fetch('/api/notifications/mark-all-read', { method: 'POST' })
      if (!res.ok) return
      applyAllRead()
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
            emptyState={t('notifications.empty', undefined, {
              defaultValue: "You're all caught up.",
            })}
          />
        </div>
      )}
    </div>
  )
}
