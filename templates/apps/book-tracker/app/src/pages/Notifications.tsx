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
      .get('/notifications')
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

  // Feed grouping — gentle date buckets, newest group first.
  const weekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000
  const isRecent = (n: Notification) => new Date(n.created_at).getTime() >= weekAgoMs
  const recentItems: FeedItem[] = []
  const earlierItems: FeedItem[] = []
  for (const n of notifs) {
    const item: FeedItem = {
      id: n.id,
      icon: TYPE_ICON[n.type] ?? 'notifications',
      title: n.title,
      body: n.body,
      createdAt: n.created_at,
      href: n.href,
      unread: n.unread,
    }
    ;(isRecent(n) ? recentItems : earlierItems).push(item)
  }

  async function markAllRead() {
    if (marking || unreadCount === 0) return
    setMarking(true)
    try {
      await http.post('/notifications/read-all', {})
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

  const renderFeedGroup = (label: string, icon: string, groupItems: FeedItem[]) =>
    groupItems.length === 0 ? null : (
      <section className={cm.sp('mb', 8)}>
        <h2
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('lg'),
            cm.fontWeight('semibold'),
            'text-primary',
            cm.sp('mb', 4),
          )}
        >
          <span className="material-symbols-outlined text-secondary text-xl" aria-hidden="true">
            {icon}
          </span>
          {label}
        </h2>
        <NotificationFeed items={groupItems} ariaLabel={label} />
      </section>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
          cm.sp('mb', 6),
          'border-b border-outline-variant pb-4',
        )}
      >
        <div>
          <h1
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
            )}
          >
            {t(
              'notifications.heading',
              {},
              { defaultValue: 'Notifications — dispatches & shelf whispers' },
            )}
            {unreadCount > 0 ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-fixed-variant">
                {t(
                  'notifications.unreflected',
                  { count: unreadCount },
                  { defaultValue: '{{count}} unreflected' },
                )}
              </span>
            ) : null}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              'text-on-surface-variant',
              cm.sp('mt', 1),
              cm.maxW('2xl'),
            )}
          >
            {t(
              'notifications.subheading',
              {},
              {
                defaultValue:
                  'Gentle milestones, archival echoes, and considerate nudges — delivered without haste, metric pressure, or streak-shaming.',
              },
            )}
          </p>
        </div>
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
            'rounded-full bg-primary text-on-primary disabled:opacity-50 shrink-0',
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
          {renderFeedGroup(
            t('notifications.groupThisWeek', {}, { defaultValue: 'This week at the desk' }),
            'calendar_month',
            recentItems,
          )}
          {renderFeedGroup(
            t('notifications.groupEarlier', {}, { defaultValue: 'Earlier this month' }),
            'history_edu',
            earlierItems,
          )}
        </div>
      )}
    </div>
  )
}
