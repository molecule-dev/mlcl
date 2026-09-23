import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/api.js'

type NotificationKind =
  'score' | 'trade' | 'injury' | 'announcement' | 'final_score' | 'welcome' | 'system'

interface NotificationRow {
  id: string
  type?: NotificationKind | string | null
  title: string
  body?: string | null
  href?: string | null
  read: boolean
  created_at: string
}

type Filter = 'all' | 'score' | 'trade' | 'injury' | 'announcement' | 'unread'

const KIND_TINT: Record<string, { strip: string; chip: string; chipText: string; icon: string }> = {
  score: {
    strip: 'border-l-primary',
    chip: 'bg-primary-container',
    chipText: 'text-on-primary-container',
    icon: 'sports_score',
  },
  final_score: {
    strip: 'border-l-primary',
    chip: 'bg-primary-container',
    chipText: 'text-on-primary-container',
    icon: 'sports_score',
  },
  trade: {
    strip: 'border-l-accent',
    chip: 'bg-secondary-container',
    chipText: 'text-on-secondary-container',
    icon: 'swap_horiz',
  },
  injury: {
    strip: 'border-l-loss',
    chip: 'bg-error-container',
    chipText: 'text-on-error-container',
    icon: 'medical_services',
  },
  announcement: {
    strip: 'border-l-live',
    chip: 'bg-warning-container',
    chipText: 'text-on-warning-container',
    icon: 'campaign',
  },
  welcome: {
    strip: 'border-l-primary',
    chip: 'bg-primary-container',
    chipText: 'text-on-primary-container',
    icon: 'celebration',
  },
  system: {
    strip: 'border-l-outline',
    chip: 'bg-surface-container',
    chipText: 'text-on-surface',
    icon: 'campaign',
  },
}

type TranslateFn = ReturnType<typeof useTranslation>['t']

function timeAgo(iso: string, t: TranslateFn, now = Date.now()): string {
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return ''
  const sec = Math.max(0, Math.round((now - ts) / 1000))
  if (sec < 60) return t('time.secondsAgo', { count: sec }, { defaultValue: '{{count}}s ago' })
  const m = Math.round(sec / 60)
  if (m < 60) return t('time.minutesAgo', { count: m }, { defaultValue: '{{count}}m ago' })
  const h = Math.round(m / 60)
  if (h < 24) return t('time.hoursAgo', { count: h }, { defaultValue: '{{count}}h ago' })
  return t('time.daysAgo', { count: Math.round(h / 24) }, { defaultValue: '{{count}}d ago' })
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await http.get<NotificationRow[]>('/api/notifications')
      const list = unwrapList<NotificationRow>(res)
      setItems(list)
      setError(null)
    } catch (err) {
      setError(
        (err as Error).message ??
          t('notifications.loadError', {}, { defaultValue: 'Failed to load notifications' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const visible = useMemo(() => {
    if (filter === 'all') return items
    if (filter === 'unread') return items.filter((n) => !n.read)
    if (filter === 'score')
      return items.filter((n) => n.type === 'score' || n.type === 'final_score')
    return items.filter((n) => n.type === filter)
  }, [items, filter])

  const unread = useMemo(() => items.filter((n) => !n.read).length, [items])

  async function markOne(id: string) {
    setBusy(true)
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    try {
      await http.post(`/api/notifications/${id}/read`, {})
      void track({ name: 'notification.read', properties: { notification_id: id } })
    } catch (error) {
      logError('notifications.markOne', error)
      void refresh()
    } finally {
      setBusy(false)
    }
  }

  async function markAll() {
    if (unread === 0) return
    setBusy(true)
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await http.post('/api/notifications/read-all', {})
      void track({ name: 'notifications.read_all', properties: { count: unread } })
    } catch (error) {
      logError('notifications.markAll', error)
      void refresh()
    } finally {
      setBusy(false)
    }
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('status.all', {}, { defaultValue: 'All' }) },
    { key: 'unread', label: t('status.unread', {}, { defaultValue: 'Unread' }) },
    { key: 'score', label: t('notifications.filterScore', {}, { defaultValue: 'Scores' }) },
    { key: 'trade', label: t('notifications.filterTrade', {}, { defaultValue: 'Trades' }) },
    { key: 'injury', label: t('notifications.filterInjury', {}, { defaultValue: 'Injuries' }) },
    {
      key: 'announcement',
      label: t('notifications.filterAnnouncement', {}, { defaultValue: 'Announcements' }),
    },
  ]

  return (
    <div className={cm.cn('px-4 py-6 sm:px-8 sm:py-8', cm.maxW('4xl'), cm.mxAuto, cm.stack(6))}>
      <header>
        <p
          className={cm.cn('text-[11px] font-black uppercase tracking-[0.28em] text-primary mb-2')}
        >
          {t('notifications.eyebrow', {}, { defaultValue: 'League alerts' })}
        </p>
        <div
          className={cm.cn(
            cm.flex({ align: 'baseline', justify: 'between', gap: 'md', wrap: 'wrap' }),
          )}
        >
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          {unread > 0 ? (
            <button
              type="button"
              onClick={markAll}
              disabled={busy}
              data-testid="notifications-mark-all"
              className={cm.cn(
                cm.textSize('sm'),
                'font-bold text-primary hover:underline disabled:opacity-50',
              )}
            >
              {t(
                'notifications.markAllRead',
                { count: unread },
                { defaultValue: 'Mark {{count}} as read' },
              )}
            </button>
          ) : null}
        </div>
      </header>

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

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
          cm.sp('p', 1),
          'rounded-full bg-surface-container-lowest border border-outline-variant/40 w-fit',
        )}
      >
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            data-testid={`notifications-filter-${f.key}`}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-full transition-colors',
              filter === f.key
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-low',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('notifications.loading', {}, { defaultValue: 'Loading notifications\u2026' })}
        </p>
      ) : (
        <ol
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
          data-testid="notifications-list"
        >
          {visible.map((n) => {
            const kind = String(n.type ?? 'system')
            const tint = KIND_TINT[kind] ?? KIND_TINT.system
            return (
              <li
                key={n.id}
                data-testid={`notification-${n.id}`}
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 'md' }),
                  cm.sp('p', 5),
                  'rounded-xl bg-surface border border-outline-variant/40 border-l-4 shadow-sm',
                  tint.strip,
                  !n.read ? 'ring-1 ring-primary/20' : '',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn(
                    'inline-flex items-center justify-center w-10 h-10 rounded-lg',
                    tint.chip,
                    tint.chipText,
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-xl')}>{tint.icon}</span>
                </span>
                <div className={cm.flex1}>
                  <div
                    className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}
                  >
                    <h3
                      className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'tracking-tight')}
                    >
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
                    </h3>
                    <span
                      className={cm.cn(
                        'text-[11px] font-bold uppercase tracking-widest tabular-nums text-on-surface-variant whitespace-nowrap',
                      )}
                    >
                      {timeAgo(n.created_at, t)}
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
                </div>
                {!n.read ? (
                  <button
                    type="button"
                    onClick={() => void markOne(n.id)}
                    disabled={busy}
                    data-testid={`notification-mark-${n.id}`}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'rounded-full border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('common.markRead', {}, { defaultValue: 'Mark read' })}
                  </button>
                ) : null}
              </li>
            )
          })}
          {visible.length === 0 ? (
            <li
              className={cm.cn(
                cm.sp('py', 12),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
              data-testid="notifications-empty"
            >
              {t('notifications.empty', {}, { defaultValue: 'No notifications in this view.' })}
            </li>
          ) : null}
        </ol>
      )}
    </div>
  )
}
