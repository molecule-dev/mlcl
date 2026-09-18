import { useEffect, useState } from 'react'

import { type FeedItem, NotificationFeed } from '@molecule/app-notification-feed-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

type NotifType =
  'reminder' | 'streak_at_risk' | 'streak_broken' | 'milestone' | 'deck_shared' | 'system_message'

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
  reminder: 'alarm',
  streak_at_risk: 'warning',
  streak_broken: 'heart_broken',
  milestone: 'celebration',
  deck_shared: 'group',
  system_message: 'info',
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingRead, setMarkingRead] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
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

  const hasUnread = notifs.some((n) => n.unread)

  const onMarkAllRead = async () => {
    setMarkingRead(true)
    try {
      await http.post('/api/notifications/mark-all-read', {})
      setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })))
    } catch (_error) {
      setError(
        t('notifications.markAllReadError', {}, { defaultValue: 'Failed to mark all read.' }),
      )
    } finally {
      setMarkingRead(false)
    }
  }

  const items: FeedItem[] = notifs.map((n) => ({
    id: n.id,
    icon: TYPE_ICON[n.type],
    title: n.title,
    body: n.body,
    createdAt: n.created_at,
    href: n.href,
    unread: n.unread,
  }))

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('mb', 6),
          'max-w-3xl',
        )}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        {hasUnread && (
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={markingRead}
            data-mol-id="notifications-mark-all-read"
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'border border-outline-variant rounded-md hover:bg-surface-container disabled:opacity-50',
            )}
          >
            {markingRead
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('notifications.markAllRead', {}, { defaultValue: 'Mark all read' })}
          </button>
        )}
      </div>
      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : items.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('notifications.empty', {}, { defaultValue: 'No notifications.' })}
        </p>
      ) : (
        <div className="max-w-3xl">
          <NotificationFeed
            items={items}
            ariaLabel={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          />
        </div>
      )}
    </div>
  )
}
