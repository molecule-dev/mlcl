import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface NotificationItem {
  id: string
  kind: string
  title: string
  body: string
  icon: string
  venue_id?: string
  venue_name?: string
  thumbnail_url?: string | null
  created_at_iso: string
  unread: boolean
}

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'booking_confirmed', label: 'Bookings' },
  { value: 'host_message', label: 'Messages' },
  { value: 'price_drop', label: 'Price drops' },
] as const

const KIND_THEME: Record<string, { color: string; bg: string }> = {
  booking_confirmed: { color: 'text-success', bg: 'bg-success-light' },
  host_message: { color: 'text-primary', bg: 'bg-primary/15' },
  price_drop: { color: 'text-violet-700', bg: 'bg-violet-100' },
  review_request: { color: 'text-warning', bg: 'bg-warning-light' },
  new_listing: { color: 'text-error', bg: 'bg-rose-100' },
}

function fmtDate(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const same = date.toDateString() === today.toDateString()
  if (same) return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function dayBucket(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const same = date.toDateString() === today.toDateString()
  if (same) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  const ms = today.getTime() - date.getTime()
  if (ms < 7 * 24 * 60 * 60 * 1000) return 'This week'
  return 'Earlier'
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('all')
  const [quietHours, setQuietHours] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/notifications')
      .then((res) => {
        if (!cancelled) setItems(unwrapList<NotificationItem>(res.data))
      })
      .catch(() => {
        /* noop */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)))
    try {
      await http.put(`/api/notifications/${id}/read`)
    } catch (_error) {
      // Optimistic UI update already applied — network failure is acceptable here.
    }
  }

  const markAllRead = async () => {
    if (items.every((n) => !n.unread)) return
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })))
    try {
      await http.put('/api/notifications/read-all')
    } catch (_error) {
      // Optimistic UI update already applied — network failure is acceptable here.
    }
  }

  const visible = useMemo(() => {
    if (filter === 'all') return items
    return items.filter((i) => i.kind === filter)
  }, [items, filter])

  const grouped = useMemo(() => {
    const map = new Map<string, NotificationItem[]>()
    for (const n of visible) {
      const k = dayBucket(n.created_at_iso)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(n)
    }
    return Array.from(map.entries())
  }, [visible])

  const unreadCount = items.filter((i) => i.unread).length

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <div
        className={cm.cn(
          cm.sp('mb', 6),
          cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
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
              'leading-tight',
            )}
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}
          >
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'notifications.summary',
              { unread: unreadCount },
              { defaultValue: '{{unread}} unread' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'uppercase tracking-widest rounded-full transition-colors',
              'bg-surface border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-50',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              done_all
            </span>
            {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
          </button>
          <button
            type="button"
            onClick={() => setQuietHours(!quietHours)}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'uppercase tracking-widest rounded-full transition-colors',
              quietHours
                ? 'bg-primary text-on-primary'
                : 'bg-surface border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              {quietHours ? 'bedtime' : 'bedtime_off'}
            </span>
            {quietHours
              ? t('notifications.quietHoursOn', {}, { defaultValue: 'Quiet hours on' })
              : t('notifications.quietHoursOff', {}, { defaultValue: 'Set quiet hours' })}
          </button>
        </div>
      </div>

      <div className={cm.cn(cm.sp('mb', 6), cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full transition-colors',
              filter === f.value
                ? 'bg-primary text-on-primary'
                : 'bg-surface border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary',
            )}
          >
            {t(`notifications.filter.${f.value}`, {}, { defaultValue: f.label })}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cm.cn('h-16 rounded-2xl bg-surface-container animate-pulse')} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 16),
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
            {t('notifications.empty', {}, { defaultValue: 'Nothing here yet.' })}
          </p>
        </div>
      ) : (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
          {grouped.map(([bucket, list]) => (
            <section key={bucket}>
              <h2
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 3),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {bucket}
              </h2>
              <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                {list.map((n) => {
                  const theme = KIND_THEME[n.kind] ?? { color: 'text-primary', bg: 'bg-primary/15' }
                  return (
                    <li key={n.id}>
                      <Link
                        to={n.venue_id ? `/venue/${n.venue_id}` : '/notifications'}
                        onClick={() => {
                          if (n.unread) void markRead(n.id)
                        }}
                        className={cm.cn(
                          cm.sp('p', 4),
                          'block bg-surface rounded-2xl border border-outline-variant/40 hover:border-primary/40 hover:shadow-md transition-all',
                          cm.flex({ align: 'start', gap: 'md' }),
                        )}
                      >
                        <span
                          className={cm.cn(
                            'relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
                            theme.bg,
                            theme.color,
                          )}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">
                            {n.icon}
                          </span>
                          {n.unread ? (
                            <span
                              className={
                                'absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary ring-2 ring-surface'
                              }
                              aria-hidden="true"
                            />
                          ) : null}
                        </span>
                        <div
                          className={cm.cn(
                            cm.flex({ direction: 'col', gap: 'xs' }),
                            'flex-1 min-w-0',
                          )}
                        >
                          <p
                            className={cm.cn(
                              cm.fontWeight('bold'),
                              n.unread ? '' : 'text-on-surface-variant',
                            )}
                          >
                            {n.title}
                          </p>
                          <p
                            className={cm.cn(
                              cm.textSize('sm'),
                              'text-on-surface-variant line-clamp-2',
                            )}
                          >
                            {n.body}
                          </p>
                        </div>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            'text-on-surface-variant flex-shrink-0',
                          )}
                        >
                          {fmtDate(n.created_at_iso)}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
