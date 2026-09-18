import { useEffect, useState } from 'react'

import { type FeedItem, NotificationFeed } from '@molecule/app-notification-feed-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

type NotifType = 'mention' | 'group_invite' | 'missed_call' | 'security_event' | 'system_message'

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
  mention: 'alternate_email',
  group_invite: 'group_add',
  missed_call: 'call_missed',
  security_event: 'security',
  system_message: 'info',
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
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

  const markAllRead = async () => {
    try {
      await http.post('/api/notifications/read-all', {})
      setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })))
    } catch (_error) {
      // non-fatal — optimistic UI already updated; read status will sync on next load
    }
  }

  const markOneRead = async (id: string) => {
    try {
      await http.patch(`/api/notifications/${id}/read`, {})
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)))
    } catch (_error) {
      // non-fatal — optimistic UI already updated; read status will sync on next load
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
    onClick: n.unread ? () => markOneRead(n.id) : undefined,
  }))

  const unreadCount = notifs.filter((n) => n.unread).length
  const mentionCount = notifs.filter((n) => n.type === 'mention').length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('nav.activity', {}, { defaultValue: 'Activity' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
          {t(
            'notifications.subheading',
            {},
            { defaultValue: 'Mentions, invites, and security events.' },
          )}
        </p>
        {!loading && !error && notifs.length > 0 ? (
          <div
            className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap', align: 'center' }), cm.sp('mt', 4))}
          >
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-primary-container text-primary uppercase tracking-wider',
              )}
            >
              {t(
                'common.countUnread',
                { count: unreadCount },
                { defaultValue: '{{count}} unread' },
              )}
            </span>
            {mentionCount > 0 ? (
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'bg-warning-light text-warning uppercase tracking-wider',
                )}
              >
                {t(
                  'notifications.mentionCount',
                  { count: mentionCount },
                  { defaultValue: '{{count}} mentions' },
                )}
              </span>
            ) : null}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'border border-outline-variant rounded-md hover:bg-surface-container',
                )}
              >
                {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
              </button>
            )}
          </div>
        ) : null}
      </header>
      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : items.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.maxW('lg'), cm.mxAuto)}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              cm.sp('mb', 4),
              'h-16 w-16 mx-auto bg-primary-container/40',
            )}
          >
            <span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">
              inbox
            </span>
          </div>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 1))}>
            {t('notifications.emptyHeading', {}, { defaultValue: 'All clear' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('notifications.empty', {}, { defaultValue: "You're caught up. Nothing here yet." })}
          </p>
        </div>
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
