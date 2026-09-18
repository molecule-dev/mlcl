import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import NotificationFilterBar, {
  type NotificationFilter,
} from '../components/NotificationFilterBar.js'
import NotificationsEndMarker from '../components/NotificationsEndMarker.js'
import NotificationsPageHeader from '../components/NotificationsPageHeader.js'
import NotificationsTopBar from '../components/NotificationsTopBar.js'
import SideNavBar from '../components/SideNavBar.js'

interface NotificationRow {
  id: string
  type: string
  body: string
  href?: string | null
  unread?: boolean
  created_at: string
}

// Category chips match on the notification `type` prefix so both singular
// ('mention') and past-tense/plural ('rendered', 'comments') rows land in
// the right bucket; free-text search matches the body.
const TYPE_PREFIX_BY_FILTER: Record<Exclude<NotificationFilter, 'All'>, string> = {
  Mentions: 'mention',
  Comments: 'comment',
  Renders: 'render',
  Shares: 'share',
}

function isToday(date: Date, now: Date): boolean {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function isYesterday(date: Date, now: Date): boolean {
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  return (
    date.getFullYear() === y.getFullYear() &&
    date.getMonth() === y.getMonth() &&
    date.getDate() === y.getDate()
  )
}

function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<NotificationFilter>('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/notifications')
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res)
          ? res
          : Array.isArray((res as { data?: unknown })?.data)
            ? (res as { data: NotificationRow[] }).data
            : []
        setItems(list as NotificationRow[])
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t('notifications.loadError', {}, { defaultValue: 'Failed to load notifications' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = items.filter((n) => {
    if (filter !== 'All' && !(n.type || '').toLowerCase().startsWith(TYPE_PREFIX_BY_FILTER[filter]))
      return false
    if (search.trim() && !(n.body || '').toLowerCase().includes(search.trim().toLowerCase()))
      return false
    return true
  })

  const now = new Date()
  const today: NotificationRow[] = []
  const yesterday: NotificationRow[] = []
  const earlier: NotificationRow[] = []
  for (const n of visible) {
    const d = new Date(n.created_at)
    if (Number.isNaN(d.getTime())) {
      earlier.push(n)
      continue
    }
    if (isToday(d, now)) today.push(n)
    else if (isYesterday(d, now)) yesterday.push(n)
    else earlier.push(n)
  }

  const renderRow = (n: NotificationRow) => (
    <article
      key={n.id}
      data-mol-id={`notification-${n.id}`}
      className={cm.cn(
        cm.sp('p', 5),
        'group relative bg-surface-secondary rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.08)] hover:shadow-md transition-shadow',
        n.unread ? 'border-l-[3px] border-l-primary' : 'border border-outline-variant/15',
      )}
    >
      <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}>
        {n.body}
      </p>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mt', 2))}>
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {new Date(n.created_at).toLocaleString()}
        </span>
        {n.href ? (
          <Link
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), cm.textPrimary)}
            to={n.href}
          >
            {t('notifications.viewDetails', {}, { defaultValue: 'View details' })}
          </Link>
        ) : null}
      </div>
    </article>
  )

  const renderGroup = (label: string, key: string, list: NotificationRow[]) => {
    if (list.length === 0) return null
    return (
      <section key={key}>
        <div
          className={cm.cn(
            cm.sp('py', 3),
            cm.sp('px', 2),
            cm.sp('mb', 4),
            'sticky top-16 bg-background/90 backdrop-blur-sm z-10 -mx-2 border-b border-border/60',
          )}
        >
          <h3
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-foreground-tertiary uppercase tracking-wider font-headline',
            )}
          >
            {label}
          </h3>
        </div>
        <div className={cm.stack(4)}>{list.map(renderRow)}</div>
      </section>
    )
  }

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'bg-surface text-foreground antialiased')}
      aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
    >
      <SideNavBar />
      <NotificationsTopBar search={search} onSearch={setSearch} />
      <main className={cm.cn(cm.sp('pt', 16), cm.minH('screen'), 'pl-[260px]')}>
        <div className={cm.cn(cm.mxAuto, cm.sp('px', 6), cm.sp('py', 8), 'max-w-[880px]')}>
          <NotificationsPageHeader
            unreadCount={items.filter((n) => n.unread).length}
            onMarkedAllRead={() => setItems((prev) => prev.map((n) => ({ ...n, unread: false })))}
          />
          <NotificationFilterBar active={filter} onChange={setFilter} />
          <div className={cm.cn(cm.stack(10), cm.sp('pb', 16))} data-mol-id="notifications-list">
            {loading ? (
              <div
                role="status"
                className={cm.cn(cm.textCenter, cm.sp('py', 16), 'text-on-surface-variant')}
              >
                {t('nav.loadingNotifications', {}, { defaultValue: 'Loading notifications…' })}
              </div>
            ) : error ? (
              <div role="alert" className={cm.cn(cm.textCenter, cm.sp('py', 16), 'text-error')}>
                {error}
              </div>
            ) : items.length === 0 ? (
              <div
                data-mol-id="notifications-empty"
                className={cm.cn(cm.textCenter, cm.sp('py', 16))}
              >
                <h4
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('semibold'),
                    cm.sp('mb', 2),
                    'text-on-surface',
                  )}
                >
                  {t('notifications.emptyHeading', {}, { defaultValue: "You're all caught up" })}
                </h4>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'notifications.emptyBody',
                    {},
                    { defaultValue: 'New notifications will appear here.' },
                  )}
                </p>
              </div>
            ) : visible.length === 0 ? (
              <div
                data-mol-id="notifications-no-matches"
                className={cm.cn(cm.textCenter, cm.sp('py', 16))}
              >
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'notifications.noMatches',
                    {},
                    { defaultValue: 'No notifications match your filters.' },
                  )}
                </p>
              </div>
            ) : (
              <>
                {renderGroup(t('status.today', {}, { defaultValue: 'Today' }), 'today', today)}
                {renderGroup(
                  t('notifications.yesterday', {}, { defaultValue: 'Yesterday' }),
                  'yesterday',
                  yesterday,
                )}
                {renderGroup(
                  t('notifications.earlier', {}, { defaultValue: 'Earlier' }),
                  'earlier',
                  earlier,
                )}
              </>
            )}
            <NotificationsEndMarker />
          </div>
        </div>
      </main>
    </div>
  )
}

export default Notifications
export { Notifications, Notifications as NotificationsPage }
