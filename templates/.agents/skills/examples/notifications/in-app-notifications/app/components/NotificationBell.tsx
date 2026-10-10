import { useEffect, useRef, useState } from 'react'

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

export function NotificationBellWidget({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const [items, setItems] = useState<RawNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

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
    fetch('/api/notifications')
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
      const n = JSON.parse((e as MessageEvent).data) as RawNotification
      setItems((prev) => [n, ...prev])
      setUnread((u) => u + 1)
    })
    events.addEventListener('notification:read', () => setUnread((u) => Math.max(0, u - 1)))
    events.addEventListener('notification:all-read', () => setUnread(0))
    return () => {
      cancelled = true
      events.close()
    }
  }, [userId])

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
      setUnread(0)
      setItems((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
      )
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
