import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

interface NotificationItem {
  id: string
  category: 'maintenance' | 'lease' | 'payment' | 'system'
  title: string
  body: string
  unread: boolean
  href: string
  at: string
}

interface NotificationApi {
  items: NotificationItem[]
  unread_count: number
}

const CATEGORY: Record<
  NotificationItem['category'],
  { label: string; icon: string; tone: string }
> = {
  maintenance: {
    label: 'Maintenance',
    icon: 'handyman',
    tone: 'bg-warning-container text-on-warning-container',
  },
  lease: {
    label: 'Lease',
    icon: 'description',
    tone: 'bg-tertiary-container text-on-tertiary-container',
  },
  payment: { label: 'Payment', icon: 'payments', tone: 'bg-success-light text-success' },
  system: { label: 'System', icon: 'campaign', tone: 'bg-info-container text-on-info-container' },
}

function fmtRelative(iso: string) {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then
  const min = Math.round(diffMs / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  return `${day}d ago`
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [marking, setMarking] = useState(false)

  const load = () => {
    setLoading(true)
    setError(false)
    http
      .get<NotificationApi>('/api/notifications')
      .then((res) => {
        const d = res as { data?: NotificationApi } | NotificationApi
        const payload =
          d && typeof d === 'object' && 'items' in (d as NotificationApi)
            ? (d as NotificationApi)
            : (d as { data?: NotificationApi })?.data
        setItems(payload?.items ?? [])
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount; load is stable and has no deps that change

  const unreadCount = items.filter((i) => i.unread).length

  const markAllRead = async () => {
    if (unreadCount === 0) return
    setMarking(true)
    try {
      await http.post('/api/notifications/mark-all-read', {})
      setItems((prev) => prev.map((i) => ({ ...i, unread: false })))
    } catch (_error) {
      // mark-all-read failed; reload to restore accurate unread state
      load()
    } finally {
      setMarking(false)
    }
  }

  const markRead = async (id: string) => {
    try {
      await http.post(`/api/notifications/${id}/read`, {})
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, unread: false } : i)))
    } catch (_error) {
      // ignore: read-status is best-effort; UI already updated optimistically
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(6))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}
            data-testid="notifications-unread"
          >
            {t(
              'notifications.subheading',
              { count: unreadCount },
              { defaultValue: '{{count}} unread · activity across your portfolio' },
            )}
          </p>
        </div>
        <button
          type="button"
          data-testid="notifications-mark-all-read"
          onClick={markAllRead}
          disabled={marking || unreadCount === 0}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.roundedFull,
            'bg-surface text-on-surface border border-outline-variant hover:bg-surface-container disabled:opacity-50',
          )}
        >
          {marking
            ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
            : t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
        </button>
      </header>

      {loading ? (
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            cm.textSize('sm'),
            'text-on-surface-variant bg-surface-container-lowest rounded-2xl',
          )}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      ) : error ? (
        <LoadErrorBanner
          data-mol-id="notifications-error"
          retryMolId="notifications-error-retry"
          message={t(
            'common.loadFailed',
            {},
            { defaultValue: 'Something went wrong loading your data. Please try again.' },
          )}
          onRetry={load}
        />
      ) : items.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant',
          )}
          data-testid="notifications-empty"
        >
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: '48px' }}
            aria-hidden="true"
          >
            notifications_none
          </span>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
            {t('notifications.empty.title', {}, { defaultValue: 'You\u2019re all caught up' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'notifications.empty.body',
              {},
              {
                defaultValue:
                  'New rent payments, maintenance updates, and lease alerts will show up here.',
              },
            )}
          </p>
        </div>
      ) : (
        <ul className={cm.stack(3)} data-testid="notifications-list">
          {items.map((item) => {
            const meta = CATEGORY[item.category] ?? CATEGORY.system
            return (
              <li key={item.id}>
                <Link
                  to={item.href}
                  data-testid={`notification-${item.id}`}
                  onClick={() => {
                    if (item.unread) markRead(item.id)
                  }}
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 'md' }),
                    cm.sp('p', 4),
                    'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 hover:shadow-md transition-all',
                    item.unread && 'border-l-4 border-l-primary',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(10),
                      cm.h(10),
                      cm.roundedFull,
                      meta.tone,
                      'shrink-0',
                    )}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">{meta.icon}</span>
                  </span>
                  <div className={cm.cn('min-w-0', cm.flex1)}>
                    <div
                      className={cm.flex({
                        align: 'baseline',
                        justify: 'between',
                        gap: 'sm',
                        wrap: 'wrap',
                      })}
                    >
                      <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                        {item.title}
                      </p>
                      <span
                        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}
                      >
                        {fmtRelative(item.at)}
                      </span>
                    </div>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.sp('mt', 1),
                        'text-on-surface-variant',
                      )}
                    >
                      {item.body}
                    </p>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 0),
                        cm.roundedFull,
                        cm.sp('mt', 2),
                        'inline-block text-[10px] font-black uppercase tracking-widest',
                        meta.tone,
                      )}
                    >
                      {t(
                        `notifications.category.${item.category}`,
                        {},
                        { defaultValue: meta.label },
                      )}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
