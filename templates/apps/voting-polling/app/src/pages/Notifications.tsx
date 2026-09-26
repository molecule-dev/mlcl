import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrap } from '../lib/api.js'

interface NotificationRow {
  id: string
  type?: string | null
  title: string
  body?: string | null
  href?: string | null
  read: boolean
  created_at: string
}

const TYPE_ICON: Record<string, string> = {
  welcome: 'celebration',
  tip: 'lightbulb',
  system: 'campaign',
  poll: 'how_to_vote',
  vote: 'check_circle',
  quorum: 'balance',
  qa: 'forum',
  closed: 'lock_clock',
}

const TYPE_TONE: Record<string, { bg: string; fg: string }> = {
  welcome: {
    bg: 'color-mix(in srgb, var(--mol-color-info) 10%, transparent)',
    fg: 'var(--mol-color-info)',
  },
  tip: {
    bg: 'color-mix(in srgb, var(--mol-color-warning) 12%, transparent)',
    fg: 'var(--mol-color-warning)',
  },
  system: {
    bg: 'color-mix(in srgb, var(--color-on-surface) 8%, transparent)',
    fg: 'var(--color-on-surface)',
  },
  poll: {
    bg: 'color-mix(in srgb, var(--mol-color-info) 10%, transparent)',
    fg: 'var(--mol-color-info)',
  },
  vote: {
    bg: 'color-mix(in srgb, var(--mol-color-success) 10%, transparent)',
    fg: 'var(--mol-color-success)',
  },
  quorum: {
    bg: 'color-mix(in srgb, var(--mol-color-warning) 12%, transparent)',
    fg: 'var(--mol-color-warning)',
  },
  qa: {
    bg: 'color-mix(in srgb, var(--color-on-surface) 8%, transparent)',
    fg: 'var(--color-on-surface)',
  },
  closed: {
    bg: 'color-mix(in srgb, var(--color-on-surface-variant) 12%, transparent)',
    fg: 'var(--color-on-surface-variant)',
  },
}

const FILTERS = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'unread', defaultLabel: 'Unread' },
  { key: 'system', defaultLabel: 'System' },
] as const

function timeAgo(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const sec = Math.max(0, Math.round((now - t) / 1000))
  if (sec < 60) return `${sec}s ago`
  const m = Math.round(sec / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await http.get<NotificationRow[]>('/api/notifications')
      const list = unwrap<NotificationRow[]>(res.data) ?? []
      setItems(Array.isArray(list) ? list : [])
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const visible = useMemo(() => {
    if (filter === 'unread') return items.filter((i) => !i.read)
    if (filter === 'system') return items.filter((i) => i.type === 'system')
    return items
  }, [items, filter])

  const unreadCount = useMemo(() => items.filter((i) => !i.read).length, [items])

  async function markOne(id: string) {
    setBusy(true)
    try {
      await http.put(`/api/notifications/${id}/read`, {})
      await refresh()
    } catch (_error) {
      // surface via error state on next refresh
    } finally {
      setBusy(false)
    }
  }

  async function markAll() {
    setBusy(true)
    try {
      await http.post('/api/notifications/read-all', {})
      await refresh()
    } catch (_error) {
      // mark-all failure is non-fatal; list will refresh on next load
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <div className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
            {t('notifications.eyebrow', {}, { defaultValue: 'Event center' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), 'font-medium text-on-surface-variant')}>
            {t(
              'notifications.subheading',
              {},
              {
                defaultValue:
                  'Quorum updates, vote events, on-stage Q&A promotions, and integration health.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={markAll}
          disabled={busy || unreadCount === 0}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'rounded-xl border border-outline-variant/30 text-on-surface hover:bg-surface-container-low disabled:opacity-50 transition-colors',
          )}
          data-test="notifications-mark-all"
        >
          {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border border-error/30 bg-error/5 text-error text-sm font-semibold',
          )}
        >
          {error}
        </div>
      ) : null}

      <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
        {FILTERS.map((f) => {
          const isActive = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'inline-flex min-h-[40px] items-center rounded-full uppercase tracking-widest transition-colors',
                isActive
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-low',
              )}
              data-test={`notifications-filter-${f.key}`}
            >
              {t(`notifications.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
              {f.key === 'unread' && unreadCount > 0 ? ` · ${unreadCount}` : ''}
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className="text-on-surface-variant text-sm" data-test="notifications-loading">
          {t('notifications.loading', {}, { defaultValue: 'Loading notifications…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className="text-on-surface-variant text-sm" data-test="notifications-empty">
          {t('notifications.empty', {}, { defaultValue: 'No notifications to show.' })}
        </p>
      ) : (
        <ul className={cm.stack(3)} data-test="notifications-list">
          {visible.map((n) => {
            const tone = TYPE_TONE[n.type ?? 'system'] ?? TYPE_TONE.system
            const icon = TYPE_ICON[n.type ?? 'system'] ?? 'notifications'
            return (
              <li
                key={n.id}
                className={cm.cn(
                  cm.sp('p', 5),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex items-start gap-4',
                  !n.read && 'border-l-4 border-l-primary',
                )}
                data-test={`notification-${n.id}`}
              >
                <span
                  className={cm.cn(
                    'grid h-11 w-11 place-items-center rounded-full material-symbols-outlined text-[22px] shrink-0',
                  )}
                  style={{ backgroundColor: tone.bg, color: tone.fg }}
                  aria-hidden="true"
                >
                  {icon}
                </span>
                <div className={cm.cn('min-w-0 flex-1')}>
                  <div
                    className={cm.flex({
                      align: 'center',
                      justify: 'between',
                      gap: 'sm',
                      wrap: 'wrap',
                    })}
                  >
                    <p className={cm.cn('text-base font-extrabold text-on-surface')}>
                      {n.href ? (
                        <Link
                          to={n.href}
                          onClick={() => !n.read && void markOne(n.id)}
                          className="hover:underline"
                        >
                          {n.title}
                        </Link>
                      ) : (
                        n.title
                      )}
                    </p>
                    <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant tabular-nums">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  {n.body ? (
                    <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>{n.body}</p>
                  ) : null}
                </div>
                {!n.read ? (
                  <button
                    type="button"
                    onClick={() => void markOne(n.id)}
                    disabled={busy}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'inline-flex min-h-[40px] shrink-0 items-center rounded-full border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low transition-colors',
                    )}
                    data-test={`notification-mark-${n.id}`}
                  >
                    {t('common.markRead', {}, { defaultValue: 'Mark read' })}
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
