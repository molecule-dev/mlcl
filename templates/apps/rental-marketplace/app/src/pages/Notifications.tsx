import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  icon?: string | null
  href?: string | null
  created_at?: string
  created_at_iso?: string
  unread: boolean
}

const TYPE_THEME: Record<string, { icon: string; tint: string }> = {
  booking_request: { icon: 'pending_actions', tint: 'text-accent-on-surface' },
  booking_confirmed: { icon: 'event_available', tint: 'text-success' },
  booking_cancelled: { icon: 'event_busy', tint: 'text-error' },
  host_message: { icon: 'forum', tint: 'text-primary-dark' },
  message: { icon: 'forum', tint: 'text-primary-dark' },
  price_drop: { icon: 'trending_down', tint: 'text-error' },
  review_received: { icon: 'reviews', tint: 'text-warning' },
  payout: { icon: 'payments', tint: 'text-success' },
  trip_reminder: { icon: 'luggage', tint: 'text-primary-dark' },
  security_alert: { icon: 'shield_lock', tint: 'text-error' },
  welcome: { icon: 'auto_awesome', tint: 'text-primary-dark' },
  editor_pick: { icon: 'star', tint: 'text-warning' },
  system: { icon: 'info', tint: 'text-on-surface-variant' },
}

function themeFor(type: string): { icon: string; tint: string } {
  return TYPE_THEME[type] ?? TYPE_THEME.system
}

const FILTERS = [
  'all',
  'booking_request',
  'host_message',
  'price_drop',
  'payout',
  'security_alert',
] as const
type Filter = (typeof FILTERS)[number]

const FILTER_LABEL: Record<Filter, string> = {
  all: 'All',
  booking_request: 'Bookings',
  host_message: 'Messages',
  price_drop: 'Price drops',
  payout: 'Payouts',
  security_alert: 'Security',
}

const FILTER_TYPE_MATCH: Record<Filter, string[]> = {
  all: [],
  booking_request: ['booking_request', 'booking_confirmed', 'booking_cancelled'],
  host_message: ['host_message', 'message'],
  price_drop: ['price_drop'],
  payout: ['payout'],
  security_alert: ['security_alert'],
}

function fmtRelative(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3600_000) return `${Math.round(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`
  if (diff < 7 * 86_400_000) return `${Math.round(diff / 86_400_000)}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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
        if (!cancelled) setNotifs(unwrapList<Notification>(res.data))
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

  async function markRead(id: string) {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)))
    try {
      await http.post(`/api/notifications/${id}/read`, {})
    } catch (_error) {
      // best-effort: optimistic UI already updated; server failure is acceptable here.
    }
  }

  async function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })))
    try {
      await http.post('/api/notifications/read-all', {})
    } catch (_error) {
      // best-effort: optimistic UI already updated; server failure is acceptable here.
    }
  }

  const visible = useMemo(() => {
    if (filter === 'all') return notifs
    const types = FILTER_TYPE_MATCH[filter]
    return notifs.filter((n) => types.includes(n.type))
  }, [notifs, filter])
  const unreadCount = notifs.filter((n) => n.unread).length

  return (
    <div className={cm.cn(cm.maxW('2xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.cn(cm.sp('mb', 6))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary-dark',
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
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className={cm.cn(
              cm.sp('mt', 3),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-primary-dark hover:underline',
            )}
          >
            {t('common.markAllAsRead', {}, { defaultValue: 'Mark all as read' })}
          </button>
        )}
      </header>

      <div className={cm.cn(cm.sp('mb', 6), cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
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
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {visible.map((n) => {
            const theme = themeFor(n.type)
            const iso = n.created_at_iso ?? n.created_at ?? ''
            const cardClass = cm.cn(
              cm.sp('p', 4),
              cm.flex({ align: 'start', gap: 'md' }),
              'block bg-surface rounded-2xl shadow-sm hover:shadow-md transition-all w-full text-left',
              n.unread ? 'border-l-4 border-accent' : 'border-l-4 border-transparent',
            )
            const inner = (
              <>
                <span
                  className={cm.cn(
                    cm.w(11),
                    cm.h(11),
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.roundedFull,
                    'shrink-0 bg-surface-container-low',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined', theme.tint)}
                    aria-hidden="true"
                  >
                    {n.icon ?? theme.icon}
                  </span>
                </span>
                <div className={'flex-1 min-w-0'}>
                  <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                    <p
                      className={cm.cn(cm.fontWeight('bold'))}
                      style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
                    >
                      {n.title}
                    </p>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant tabular-nums shrink-0',
                      )}
                    >
                      {fmtRelative(iso)}
                    </span>
                  </div>
                  {n.body && (
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.sp('mt', 1),
                        'text-on-surface-variant leading-relaxed',
                      )}
                    >
                      {n.body}
                    </p>
                  )}
                </div>
              </>
            )
            return (
              <li key={n.id}>
                {n.href ? (
                  <Link
                    to={n.href}
                    onClick={() => n.unread && markRead(n.id)}
                    className={cardClass}
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => n.unread && markRead(n.id)}
                    className={cardClass}
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
