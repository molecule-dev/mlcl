import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ApiNotification {
  id: string
  kind?: string
  title?: string | null
  body?: string
  link?: string | null
  read_at?: string | null
  created_at?: string
}

const META: Record<string, { color: string; bg: string; icon: string }> = {
  rush: { color: 'var(--color-priority-rush)', bg: 'var(--color-priority-rush-bg)', icon: 'bolt' },
  rush_order: {
    color: 'var(--color-priority-rush)',
    bg: 'var(--color-priority-rush-bg)',
    icon: 'bolt',
  },
  low_stock: { color: 'var(--color-stock-low)', bg: 'var(--color-stock-low-bg)', icon: 'warning' },
  scan_error: {
    color: 'var(--color-stock-out)',
    bg: 'var(--color-stock-out-bg)',
    icon: 'qr_code_scanner',
  },
  shipment: {
    color: 'var(--color-order-shipped)',
    bg: 'var(--color-order-shipped-bg)',
    icon: 'local_shipping',
  },
}

function rel(iso: string): string {
  const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (diffSec < 60) return `${Math.max(diffSec, 0)}s ago`
  const m = Math.round(diffSec / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString()
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rows, setRows] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    try {
      const res = await http.get<ApiNotification[]>('/notifications')
      const data = res.data
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await http.get<ApiNotification[]>('/notifications')
        if (cancelled) return
        const data = res.data
        setRows(Array.isArray(data) ? data : [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  async function markRead(id: string) {
    await http.patch(`/notifications/${id}`, { read: true })
    await refresh()
  }

  async function dismiss(id: string) {
    await http.delete(`/notifications/${id}`)
    await refresh()
  }

  const unreadCount = rows.filter((r) => !r.read_at).length

  return (
    <div className={cm.stack(6)} data-testid="notifications-page">
      <header className={cm.stack(1)}>
        <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
          {t('notifications.eyebrow', {}, { defaultValue: 'Floor alerts' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'notifications.subtitle',
            { count: rows.length, unread: unreadCount },
            { defaultValue: '{{count}} alerts · {{unread}} unread' },
          )}
        </p>
      </header>

      <article
        className={cm.cn(
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden',
        )}
        data-testid="notifications-list"
      >
        <div className={cm.cn('divide-y divide-outline-variant/50')}>
          {loading && (
            <p className={cm.cn(cm.sp('p', 6), cm.textMuted, 'text-sm')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          )}
          {!loading && rows.length === 0 && (
            <p
              className={cm.cn(cm.sp('p', 6), cm.textMuted, 'text-sm')}
              data-testid="notifications-empty"
            >
              {t('notifications.empty', {}, { defaultValue: 'No notifications.' })}
            </p>
          )}
          {!loading &&
            rows.map((row) => {
              const meta = META[row.kind ?? 'shipment'] ?? META.shipment
              const unread = !row.read_at
              return (
                <div
                  key={row.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                    cm.accentCard({ tone: 'custom' }),
                    'hover:bg-background-secondary transition-colors',
                    unread ? '' : 'opacity-60',
                  )}
                  style={{ ['--mol-accent' as string]: meta.color }}
                  data-testid="notification-row"
                >
                  <span
                    className={cm.cn('h-10 w-10 rounded-full inline-flex')}
                    style={{ backgroundColor: meta.bg, color: meta.color }}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[20px] m-auto')}
                      data-icon={meta.icon}
                    >
                      {meta.icon}
                    </span>
                  </span>
                  <div className={cm.cn('flex-1 min-w-0', cm.stack(0))}>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface truncate',
                      )}
                    >
                      {row.title ?? row.kind}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                      {row.body}
                    </p>
                  </div>
                  {row.link && (
                    <Link to={row.link} className={cm.cn('text-xs text-primary hover:underline')}>
                      {t('common.open', {}, { defaultValue: 'Open' })}
                    </Link>
                  )}
                  {unread && (
                    <button
                      type="button"
                      onClick={() => markRead(row.id)}
                      data-testid="notification-mark-read"
                      className={cm.cn('text-xs text-on-surface-variant hover:text-on-surface')}
                    >
                      {t('common.markRead', {}, { defaultValue: 'Mark read' })}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => dismiss(row.id)}
                    data-testid="notification-dismiss"
                    className={cm.cn('text-xs text-on-surface-variant hover:text-error')}
                  >
                    {t('notifications.dismiss', {}, { defaultValue: 'Dismiss' })}
                  </button>
                  <p
                    className={cm.cn(
                      'text-[10px] uppercase tracking-wider text-on-surface-variant shrink-0',
                    )}
                  >
                    {row.created_at ? rel(row.created_at) : ''}
                  </p>
                </div>
              )
            })}
        </div>
      </article>
    </div>
  )
}

export default Notifications
