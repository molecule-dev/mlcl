import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LoadErrorBanner } from '../components/LoadErrorBanner.js'

interface NotificationRow {
  id: string
  type: string
  title: string
  body: string | null
  href: string | null
  read: boolean
  created_at: string
}

const KIND_TONE: Record<string, string> = {
  invite: 'bg-primary/10 text-primary',
  leaderboard: 'bg-warning-light text-warning',
  achievement: 'bg-success-light text-success',
  mention: 'bg-sky-500/10 text-sky-500',
  challenge: 'bg-rose-500/10 text-error',
  tip: 'bg-tertiary-container/40 text-tertiary',
}

const KIND_GLYPH: Record<string, string> = {
  invite: 'celebration',
  leaderboard: 'leaderboard',
  achievement: 'workspace_premium',
  mention: 'alternate_email',
  challenge: 'bolt',
  tip: 'lightbulb',
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
] as const

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diffMs)) return ''
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d`
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all')
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await http.get('/api/notifications')
      const list = unwrap<NotificationRow[]>(res) ?? []
      setItems(Array.isArray(list) ? list : [])
    } catch (_error) {
      // Failed fetch must not render as "No notifications." — surface a banner.
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const visible = useMemo(() => {
    if (filter === 'unread') return items.filter((n) => !n.read)
    return items
  }, [items, filter])

  const unreadCount = items.filter((n) => !n.read).length

  async function handleMarkAll() {
    if (unreadCount === 0) return
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await http.post('/api/notifications/read-all', {})
    } catch (_error) {
      // Mark-all failed; refresh reverts optimistic read state from server
      void refresh()
    }
  }

  async function handleMarkOne(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    try {
      await http.put(`/api/notifications/${id}/read`, {})
    } catch (_error) {
      // Mark-one failed; refresh reverts optimistic read state from server
      void refresh()
    }
  }

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('py', 8))} data-testid="notifications">
      <header className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), 'flex-wrap gap-4')}>
        <div>
          <span className={cm.cn('text-[10px] uppercase tracking-widest font-black text-primary')}>
            {t('nav.activity', {}, { defaultValue: 'Activity' })}
          </span>
          <h1 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mt-1')}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p
            className={cm.cn('text-sm text-on-surface-variant mt-2 max-w-md')}
            data-testid="notifications-summary"
          >
            {t(
              'notifications.subhead',
              { count: unreadCount },
              {
                defaultValue:
                  '{{count}} unread sparks. Invites, leaderboard moves, and achievements all in one stream.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleMarkAll}
          disabled={unreadCount === 0}
          data-testid="mark-all-read"
          className={cm.cn(
            'px-4 min-h-[40px] inline-flex items-center rounded-xl bg-surface-container-low text-on-surface-variant text-xs font-extrabold uppercase tracking-widest hover:bg-surface-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {t('common.markAllAsRead', {}, { defaultValue: 'Mark all as read' })}
        </button>
      </header>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 1 }),
          'rounded-2xl bg-surface-container-low p-1 w-max',
        )}
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cm.cn(
              'px-4 min-h-[40px] inline-flex items-center rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors',
              filter === f.key
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t(`notifications.filter.${f.key}`, {}, { defaultValue: f.label })}
          </button>
        ))}
      </div>

      <section
        className={cm.cn(
          'rounded-3xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm overflow-hidden',
        )}
      >
        <ul className={cm.cn('divide-y divide-outline-variant/30')}>
          {loading ? (
            <li className={cm.cn(cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
              {t('notifications.loading', {}, { defaultValue: 'Loading…' })}
            </li>
          ) : error ? (
            <li className={cm.cn(cm.sp('p', 5))}>
              <LoadErrorBanner onRetry={() => void refresh()} />
            </li>
          ) : visible.length === 0 ? (
            <li className={cm.cn(cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
              <span
                className={cm.cn(
                  'material-symbols-outlined text-4xl text-primary mb-3 inline-block',
                )}
              >
                inbox
              </span>
              <p className={cm.cn('font-bold text-base')}>
                {t('notifications.empty', {}, { defaultValue: 'No notifications.' })}
              </p>
            </li>
          ) : (
            visible.map((n) => {
              const tone = KIND_TONE[n.type] ?? KIND_TONE.tip
              const glyph = KIND_GLYPH[n.type] ?? 'notifications'
              const unread = !n.read
              return (
                <li
                  key={n.id}
                  data-testid={`notification-${unread ? 'unread' : 'read'}`}
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 4 }),
                    cm.sp('p', 5),
                    unread ? 'bg-primary-container/10' : '',
                  )}
                >
                  <span
                    className={cm.cn(
                      'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0',
                      tone,
                    )}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">{glyph}</span>
                  </span>
                  <div className={cm.flex1}>
                    {n.href ? (
                      <Link
                        to={n.href}
                        onClick={() => unread && void handleMarkOne(n.id)}
                        className={cm.cn(
                          'inline-flex items-center min-h-[40px] font-bold text-sm hover:underline',
                          unread ? 'text-on-surface' : 'text-on-surface-variant',
                        )}
                      >
                        {n.title}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => unread && void handleMarkOne(n.id)}
                        className={cm.cn(
                          'inline-flex items-center min-h-[40px] text-left font-bold text-sm',
                          unread ? 'text-on-surface' : 'text-on-surface-variant',
                        )}
                      >
                        {n.title}
                      </button>
                    )}
                    {n.body ? (
                      <p className={cm.cn('text-xs text-on-surface-variant mt-0.5')}>{n.body}</p>
                    ) : null}
                  </div>
                  <div className={cm.cn('text-right flex-shrink-0')}>
                    <p className={cm.cn('text-xs text-on-surface-variant font-mono')}>
                      {timeAgo(n.created_at)}
                    </p>
                    {unread ? (
                      <span
                        className={cm.cn('inline-block w-2 h-2 rounded-full bg-primary mt-2')}
                        aria-label="unread"
                      />
                    ) : null}
                  </div>
                </li>
              )
            })
          )}
        </ul>
      </section>
    </div>
  )
}

export default Notifications
