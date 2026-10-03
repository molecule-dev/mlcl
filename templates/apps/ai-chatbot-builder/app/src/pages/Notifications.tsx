import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AppShell } from '../components/AppShell.js'

interface NotificationItem {
  id: string
  title: string
  body?: string
  createdAt?: string
  read?: boolean
}

// Server rows carry `read_at` (timestamp | null); the UI works with a
// simple boolean.
interface NotificationRow extends NotificationItem {
  read_at?: string | null
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/notifications')
      .then((res) => {
        if (cancelled) return
        const body = (res as { data?: unknown } | null)?.data ?? res
        const list = (Array.isArray(body) ? body : []) as NotificationRow[]
        setItems(list.map((n) => ({ ...n, read: Boolean(n.read ?? n.read_at) })))
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const markRead = (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    // Optimistic update; a failed request just leaves the item unread on reload.
    http.post(`/api/notifications/${id}/read`, {}).catch(() => {})
  }

  return (
    <AppShell>
      <main
        data-mol-id="page-notifications"
        className={cm.cn(
          cm.flex1,
          cm.mxAuto,
          cm.w('full'),
          'max-w-3xl',
          cm.sp('px', 6),
          cm.sp('py', 8),
        )}
      >
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        {loading ? (
          <p data-mol-id="notifications-loading" className={cm.textMuted}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : items.length === 0 ? (
          <p data-mol-id="notifications-empty" className={cm.textMuted}>
            {t('notifications.empty', {}, { defaultValue: "You're all caught up." })}
          </p>
        ) : (
          <ul data-mol-id="notifications-list" className={cm.cn(cm.stack(3))}>
            {items.map((n) => (
              <li
                key={n.id}
                data-mol-id="notification-item"
                className={cm.cn(
                  cm.sp('p', 4),
                  'rounded-md border border-outline bg-elevated',
                  n.read ? 'opacity-60' : '',
                )}
              >
                <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }))}>
                  <div>
                    <div className={cm.fontWeight('semibold')}>{n.title}</div>
                    {n.body ? <div className={cm.textMuted}>{n.body}</div> : null}
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      data-mol-id="notification-mark-read"
                      onClick={() => markRead(n.id)}
                      className={cm.cn('text-xs', cm.textMuted)}
                    >
                      {t('common.markRead', {}, { defaultValue: 'Mark read' })}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  )
}

export default Notifications
