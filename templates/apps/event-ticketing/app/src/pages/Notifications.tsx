import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type NotificationKind, NotificationRow } from '../components/NotificationRow.js'

interface NotificationItem {
  id: string
  kind: NotificationKind
  title: string
  body: string
  time_ago: string
  unread: boolean
  to?: string
}

type Filter = 'all' | 'unread' | NotificationKind

const FILTERS: { key: Filter; defaultLabel: string; icon: string }[] = [
  { key: 'all', defaultLabel: 'All', icon: 'notifications' },
  { key: 'unread', defaultLabel: 'Unread', icon: 'fiber_manual_record' },
  { key: 'purchase', defaultLabel: 'Purchases', icon: 'confirmation_number' },
  { key: 'check_in', defaultLabel: 'Check-ins', icon: 'qr_code_2' },
  { key: 'transfer', defaultLabel: 'Transfers', icon: 'swap_horiz' },
  { key: 'refund', defaultLabel: 'Refunds', icon: 'undo' },
  { key: 'announcement', defaultLabel: 'Announcements', icon: 'campaign' },
]

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [filter, setFilter] = useState<Filter>('all')
  const [items, setItems] = useState<NotificationItem[]>([])
  const [readSet, setReadSet] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await http.get('/api/notifications')
        if (cancelled) return
        setItems((res.data as NotificationItem[]) ?? [])
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? 'Failed to load notifications')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  const all = items.map((n) => ({ ...n, unread: n.unread && !readSet.has(n.id) }))
  const visible = all.filter((n) => {
    if (filter === 'all') return true
    if (filter === 'unread') return n.unread
    return n.kind === filter
  })

  const unreadCount = all.filter((n) => n.unread).length

  /**
   * Persist the "all caught up" timestamp to the user's profile so
   * subsequent loads honor the marked-read state across reload. Notifications
   * derived from real DB rows (orders, transfers, check-ins) are flagged
   * `unread: false` server-side once the user's last_notifications_read_at
   * is set after their newest activity.
   */
  async function markAllRead() {
    setMarking(true)
    setReadSet(new Set(items.map((n) => n.id)))
    try {
      await http.post('/api/notifications/read-all', {})
    } catch (e) {
      setError((e as Error).message ?? 'Could not save read state')
    } finally {
      setMarking(false)
    }
  }

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(8), 'max-w-4xl w-full mx-auto')}
      data-mol-id="page-notifications"
    >
      <header className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), 'flex-wrap gap-4')}>
        <div>
          <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary mb-2')}>
            {t('nav.activity', {}, { defaultValue: 'Activity' })}
          </p>
          <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            {unreadCount > 0 ? (
              <span
                className={cm.cn(
                  'ml-3 px-2.5 py-1 rounded-full text-[12px] font-black tabular-nums text-white align-middle',
                )}
                style={{ background: 'var(--color-accent)' }}
              >
                {unreadCount}
              </span>
            ) : null}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'mt-2 text-on-surface-variant max-w-xl')}>
            {t(
              'notifications.subtitle',
              {},
              {
                defaultValue:
                  'Sales, transfers, check-ins, and announcements — everything happening across your tickets and events.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={marking}
          data-mol-id="mark-all-read"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2.5),
            'rounded-full border border-outline-variant text-sm font-bold inline-flex items-center gap-2 disabled:opacity-40',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            done_all
          </span>
          {marking
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
        </button>
      </header>

      <div className={cm.cn('flex items-center gap-2 overflow-x-auto pb-1')}>
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap border transition-colors',
                active
                  ? 'border-transparent text-white shadow-md shadow-primary/30'
                  : 'border-outline-variant text-on-surface-variant hover:text-on-surface',
              )}
              style={
                active
                  ? {
                      background:
                        'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    }
                  : undefined
              }
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                {f.icon}
              </span>
              {t(`notifications.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
            </button>
          )
        })}
      </div>

      {error ? (
        <div
          role="alert"
          className={cm.cn('p-3 rounded-xl bg-error/10 text-error text-sm font-bold')}
        >
          {error}
        </div>
      ) : null}
      {loading ? (
        <p className={cm.cn(cm.textCenter, cm.sp('py', 8), cm.textMuted)}>
          {t('notifications.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : null}

      <div className={cm.cn(cm.stack(2))}>
        {visible.map((n) => (
          <NotificationRow
            key={n.id}
            kind={n.kind}
            title={n.title}
            body={n.body}
            timeAgo={n.time_ago}
            unread={n.unread}
            to={n.to}
          />
        ))}
        {visible.length === 0 ? (
          <div
            className={cm.cn(
              cm.textCenter,
              cm.sp('py', 12),
              'rounded-2xl border border-dashed border-outline-variant/60',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-5xl text-primary/40')}
              aria-hidden="true"
            >
              notifications_off
            </span>
            <p className={cm.cn(cm.sp('mt', 3), cm.textSize('sm'), cm.textMuted)}>
              {t(
                'notifications.empty',
                {},
                { defaultValue: 'You’re caught up — nothing new in this view.' },
              )}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default Notifications
