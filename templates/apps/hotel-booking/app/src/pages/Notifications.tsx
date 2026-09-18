import { useEffect, useState } from 'react'

import { type FeedItem, NotificationFeed } from '@molecule/app-notification-feed-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

type NotifType =
  'booking_update' | 'host_message' | 'price_drop' | 'loyalty_milestone' | 'trip_reminder'

interface Notification {
  id: string
  type: NotifType
  title: string
  body: string
  href?: string | null
  created_at: string
  unread: boolean
}

const TYPE_ICON: Record<NotifType, string> = {
  booking_update: 'event_available',
  host_message: 'chat',
  price_drop: 'trending_down',
  loyalty_milestone: 'workspace_premium',
  trip_reminder: 'luggage',
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/notifications')
      .then((res) => {
        if (!cancelled) setNotifs(unwrapList<Notification>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t(
              'nav.failedToLoadNotifications',
              {},
              { defaultValue: 'Failed to load notifications.' },
            ),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const unreadCount = notifs.filter((n) => n.unread).length

  async function markAllRead() {
    if (marking || unreadCount === 0) return
    setMarking(true)
    const previous = notifs
    setNotifs((list) => list.map((n) => ({ ...n, unread: false })))
    try {
      await http.post('/api/notifications/read-all', {})
    } catch (err) {
      console.error('[Notifications] markAllRead failed:', err)
      setNotifs(previous)
    } finally {
      setMarking(false)
    }
  }

  const items: FeedItem[] = notifs.map((n) => ({
    id: n.id,
    icon: TYPE_ICON[n.type] ?? 'notifications',
    title: n.title,
    body: n.body,
    createdAt: n.created_at,
    href: n.href,
    unread: n.unread,
  }))

  return (
    <div className={cm.cn(cm.maxW('2xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        {unreadCount > 0 ? (
          <button
            type="button"
            data-testid="mark-all-read"
            onClick={markAllRead}
            disabled={marking}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'border border-outline rounded-full hover:bg-surface-container disabled:opacity-60',
            )}
          >
            {marking
              ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
              : t(
                  'notifications.markAllRead',
                  { count: unreadCount },
                  { defaultValue: 'Mark all read ({{count}})' },
                )}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : items.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('notifications.empty', {}, { defaultValue: "You're all caught up." })}
        </p>
      ) : (
        <NotificationFeed
          items={items}
          ariaLabel={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        />
      )}
    </div>
  )
}
