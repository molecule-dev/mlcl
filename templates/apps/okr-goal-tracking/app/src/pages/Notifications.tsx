import { useEffect, useState } from 'react'

import type { TranslateFunction } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { NotificationRow } from '../lib/api.js'

type Filter = 'all' | 'unread' | 'mentions' | 'reviews'

const FILTERS: Array<{ key: Filter; defaultLabel: string }> = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'unread', defaultLabel: 'Unread' },
  { key: 'mentions', defaultLabel: 'Mentions' },
  { key: 'reviews', defaultLabel: 'Reviews' },
]

const TONE_BG: Record<string, string> = {
  primary: 'bg-indigo-100 text-indigo-700',
  success: 'bg-success-light text-success-text',
  warning: 'bg-warning-light text-warning',
  neutral: 'bg-surface-secondary text-foreground-secondary',
}

function notifTone(type: string): 'primary' | 'success' | 'warning' | 'neutral' {
  if (type === 'check_in_due' || type === 'review_open') return 'primary'
  if (type === 'kr_on_track' || type === 'kr_completed') return 'success'
  if (type === 'kr_at_risk' || type === 'kr_off_track') return 'warning'
  return 'neutral'
}

function notifIcon(type: string): string {
  if (type === 'check_in_due') return 'fact_check'
  if (type === 'review_open') return 'rate_review'
  if (type === 'kr_on_track' || type === 'kr_completed') return 'trending_up'
  if (type === 'mention' || type === 'comment') return 'forum'
  return 'notifications'
}

function formatRelative(iso: string, t: TranslateFunction): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return ''
  const m = Math.round(ms / 60_000)
  if (m < 1) return t('common.relative.justNow', {}, { defaultValue: 'just now' })
  if (m < 60)
    return t('common.relative.minutesAgo', { count: m }, { defaultValue: '{{count}} min ago' })
  const h = Math.round(m / 60)
  if (h < 24)
    return t('common.relative.hoursAgo', { count: h }, { defaultValue: '{{count}} hr ago' })
  const d = Math.round(h / 24)
  if (d < 7) return t('common.relative.daysAgo', { count: d }, { defaultValue: '{{count}}d ago' })
  return new Date(iso).toLocaleDateString()
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [filter, setFilter] = useState<Filter>('all')
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let aborted = false
    setLoading(true)
    setError(null)
    http
      .get<NotificationRow[]>('/api/notifications')
      .then((res) => {
        if (aborted) return
        setItems(res.data ?? [])
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (aborted) return
        setError(err instanceof Error ? err.message : 'Failed to load notifications')
        setLoading(false)
      })
    return () => {
      aborted = true
    }
  }, [http])

  const filtered = items.filter((n) => {
    if (filter === 'unread') return !n.read_at
    if (filter === 'mentions') return n.type === 'mention' || n.type === 'comment'
    if (filter === 'reviews') return n.type === 'review_open' || n.type === 'review_completed'
    return true
  })

  const markRead = async (id: string) => {
    try {
      await http.post(`/api/notifications/${id}/read`, {})
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not mark read.')
    }
  }

  const remove = async (id: string) => {
    try {
      await http.delete(`/api/notifications/${id}`)
      setItems((prev) => prev.filter((n) => n.id !== id))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete.')
    }
  }

  return (
    <div className={cm.cn(cm.stack(8))}>
      <header className={cm.cn(cm.stack(2))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-[0.22em] text-indigo-700',
          )}
        >
          {t('notifications.eyebrow', {}, { defaultValue: 'Activity center' })}
        </span>
        <h1
          className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
          style={{ color: 'var(--color-heading-ink)' }}
        >
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
      </header>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.sp('p', 2),
          'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40 self-start flex-wrap',
        )}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full transition-colors',
                active
                  ? 'text-white shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-low',
              )}
              style={active ? { backgroundColor: 'var(--color-nav-bg)' } : undefined}
            >
              {t(
                `notifications.filter.${f.key}` as 'notifications.filter.all',
                {},
                { defaultValue: f.defaultLabel },
              )}
            </button>
          )
        })}
      </div>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-2xl bg-error-light border border-red-200 text-error text-sm',
          )}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('nav.loadingNotifications', {}, { defaultValue: 'Loading notifications…' })}
        </p>
      ) : (
        <ul
          className={cm.cn(
            'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden divide-y divide-outline-variant/30',
          )}
        >
          {filtered.length === 0 && (
            <li
              data-testid="notifications-empty"
              className={cm.cn(cm.sp('p', 8), cm.stack(2), cm.textCenter)}
            >
              <span
                className="material-symbols-outlined text-[40px] text-on-surface-variant/60 mx-auto"
                aria-hidden
              >
                inbox
              </span>
              <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                {t(
                  'notifications.emptyTitle',
                  {},
                  { defaultValue: 'No notifications in this view.' },
                )}
              </p>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'notifications.emptyBody',
                  {},
                  { defaultValue: 'Coaching nudges, mentions, and review reminders land here.' },
                )}
              </p>
            </li>
          )}
          {filtered.map((n) => {
            const tone = notifTone(n.type)
            const unread = !n.read_at
            return (
              <li
                key={n.id}
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.flex({ align: 'start', gap: 'sm' }),
                  unread && 'bg-indigo-50/40',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-11 h-11 rounded-xl shrink-0',
                    TONE_BG[tone],
                  )}
                >
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {notifIcon(n.type)}
                  </span>
                </span>
                <div className={cm.cn(cm.flex1, cm.stack(1), 'min-w-0')}>
                  <div
                    className={cm.cn(cm.flex({ justify: 'between', align: 'center', gap: 'sm' }))}
                  >
                    <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>{n.title}</p>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-on-surface-variant shrink-0',
                      )}
                    >
                      {formatRelative(n.created_at, t)}
                    </span>
                  </div>
                  {n.body && (
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-snug')}>
                      {n.body}
                    </p>
                  )}
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    {unread && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          'text-[10px] uppercase tracking-widest text-indigo-700 hover:text-indigo-900 transition-colors',
                        )}
                        data-testid={`notification-mark-read-${n.id}`}
                      >
                        {t('notifications.markRead', {}, { defaultValue: '● Mark as read' })}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(n.id)}
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-error transition-colors',
                      )}
                    >
                      {t('common.delete', {}, { defaultValue: 'Delete' })}
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default Notifications
