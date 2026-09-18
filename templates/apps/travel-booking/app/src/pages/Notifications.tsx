import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

type NotifType =
  | 'booking_update'
  | 'host_message'
  | 'price_drop'
  | 'loyalty_milestone'
  | 'trip_reminder'
  | 'security_alert'

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
  security_alert: 'shield_lock',
}

const FILTERS = [
  'all',
  'booking_update',
  'host_message',
  'price_drop',
  'security_alert',
  'trip_reminder',
] as const
type Filter = (typeof FILTERS)[number]

const FILTER_LABEL: Record<Filter, string> = {
  all: 'All',
  booking_update: 'Bookings',
  host_message: 'Messages',
  price_drop: 'Price drops',
  security_alert: 'Security',
  trip_reminder: 'Reminders',
}

type TFunction = ReturnType<typeof useTranslation>['t']

function fmtRelative(iso: string, t: TFunction): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return t('common.justNow', {}, { defaultValue: 'just now' })
  if (m < 60) return t('common.minutesAgo', { count: m }, { defaultValue: '{{count}}m ago' })
  const h = Math.floor(m / 60)
  if (h < 24) return t('common.hoursAgo', { count: h }, { defaultValue: '{{count}}h ago' })
  const d = Math.floor(h / 24)
  return t('common.daysAgo', { count: d }, { defaultValue: '{{count}}d ago' })
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

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

  const visible = useMemo(
    () => (filter === 'all' ? notifs : notifs.filter((n) => n.type === filter)),
    [notifs, filter],
  )
  const unreadCount = visible.filter((n) => n.unread).length

  async function markRead(id: string) {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)))
    try {
      await http.post(`/api/notifications/${id}/read`, {})
    } catch (error) {
      logError('notifications.markRead', error)
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, unread: true } : n)))
    }
  }

  async function markAllRead() {
    const ids = notifs.filter((n) => n.unread).map((n) => n.id)
    if (ids.length === 0) return
    const previous = notifs
    setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })))
    try {
      await http.post('/api/notifications/read-all', {})
    } catch (error) {
      logError('notifications.markAllRead', error)
      setNotifs(previous)
    }
  }

  return (
    <div className={cm.cn(cm.maxW('2xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary',
            )}
          >
            {t('nav.activity', {}, { defaultValue: 'Activity' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 2),
              'leading-tight tracking-tight',
            )}
            style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
          >
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'notifications.subheading',
              { count: unreadCount },
              { defaultValue: '{{count}} unread · everything in one calm inbox' },
            )}
          </p>
        </div>
        {notifs.some((n) => n.unread) ? (
          <button
            type="button"
            data-testid="notifications-mark-all-read"
            onClick={markAllRead}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'rounded-full bg-surface border border-outline-variant text-on-surface hover:border-primary hover:text-primary uppercase tracking-widest',
            )}
          >
            {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
          </button>
        ) : null}
      </header>

      <div className={cm.cn(cm.sp('mb', 6), cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            data-testid={`notifications-filter-${f}`}
            onClick={() => setFilter(f)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full transition-colors',
              filter === f
                ? 'bg-primary text-on-primary'
                : 'bg-surface border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary',
            )}
          >
            {t(`notifications.filter.${f}`, {}, { defaultValue: FILTER_LABEL[f] })}
          </button>
        ))}
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('notifications.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 20),
            cm.textCenter,
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          )}
        >
          <span
            className="material-symbols-outlined text-6xl text-on-surface-variant"
            aria-hidden="true"
          >
            notifications_off
          </span>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('notifications.empty', {}, { defaultValue: "You're all caught up." })}
          </p>
        </div>
      ) : (
        <ul
          data-testid="notifications-feed"
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
        >
          {visible.map((n) => {
            const icon = TYPE_ICON[n.type] ?? 'notifications'
            const inner = (
              <div
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'start', gap: 'md' }),
                  'rounded-2xl border transition-colors',
                  n.unread
                    ? 'bg-primary/5 border-primary/30 hover:border-primary'
                    : 'bg-surface border-outline-variant/40 hover:border-outline-variant',
                )}
              >
                <div
                  className={cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    'bg-primary/10 flex-shrink-0',
                  )}
                >
                  <span className="material-symbols-outlined text-primary" aria-hidden="true">
                    {icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}
                  >
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{n.title}</p>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant whitespace-nowrap tabular-nums',
                      )}
                    >
                      {fmtRelative(n.created_at, t)}
                    </span>
                  </div>
                  {n.body ? (
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.sp('mt', 1),
                        'text-on-surface-variant leading-relaxed',
                      )}
                    >
                      {n.body}
                    </p>
                  ) : null}
                  {n.unread ? (
                    <span
                      data-testid={`notification-unread-${n.id}`}
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mt', 2),
                        cm.fontWeight('bold'),
                        'inline-block uppercase tracking-widest text-primary',
                      )}
                    >
                      {t('status.new', {}, { defaultValue: 'New' })}
                    </span>
                  ) : null}
                </div>
              </div>
            )
            return (
              <li key={n.id}>
                {n.href ? (
                  <Link
                    to={n.href}
                    data-testid={`notification-item-${n.id}`}
                    onClick={() => {
                      if (n.unread) markRead(n.id)
                    }}
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    data-testid={`notification-item-${n.id}`}
                    onClick={() => {
                      if (n.unread) markRead(n.id)
                    }}
                    className="w-full text-left"
                  >
                    {inner}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
