import { useEffect, useState } from 'react'

import { type FeedItem, NotificationFeed } from '@molecule/app-notification-feed-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

type NotifType = 'reminder' | 'stalled' | 'finished' | 'challenge_milestone' | 'weekly_digest'

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
  stalled: 'schedule',
  finished: 'menu_book',
  challenge_milestone: 'emoji_events',
  weekly_digest: 'insights',
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
    try {
      await http.post('/api/notifications/read-all', {})
      setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })))
      // _error intentionally ignored — user-facing error message is shown via setError below
    } catch (_error) {
      setError(t('notifications.markError', {}, { defaultValue: 'Could not mark all read.' }))
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
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0 || marking}
          data-testid="notifications-mark-all"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-full bg-primary text-on-primary disabled:opacity-50',
          )}
        >
          {marking
            ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
            : t(
                'notifications.markAll',
                { count: unreadCount },
                { defaultValue: 'Mark all read ({{count}})' },
              )}
        </button>
      </div>
      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : items.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('nav.noNewNotifications', {}, { defaultValue: 'No new notifications.' })}
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
