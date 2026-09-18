import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { api, type ApiNotification } from '../lib/api.js'

const KIND_TINT: Record<ApiNotification['kind'], string> = {
  pledge_received: 'bg-primary/10 text-primary',
  pledge_made: 'bg-tertiary/10 text-tertiary',
  campaign_funded: 'bg-success/10 text-success',
  campaign_update: 'bg-warning/10 text-warning',
}
const KIND_ICON: Record<ApiNotification['kind'], string> = {
  pledge_received: 'volunteer_activism',
  pledge_made: 'favorite',
  campaign_funded: 'rocket_launch',
  campaign_update: 'campaign',
}

const FILTERS = ['all', 'unread', 'pledges', 'updates'] as const
type FilterKey = (typeof FILTERS)[number]

function relTime(iso: string, t: ReturnType<typeof useTranslation>['t']): string {
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return ''
  const diff = Date.now() - ts
  if (diff < 60_000) return t('common.justNow', {}, { defaultValue: 'just now' })
  const m = Math.round(diff / 60000)
  if (m < 60) return t('common.minutesAgo', { count: m }, { defaultValue: '{{count}}m ago' })
  const h = Math.round(m / 60)
  if (h < 24) return t('common.hoursAgo', { count: h }, { defaultValue: '{{count}}h ago' })
  const d = Math.round(h / 24)
  return t('common.daysAgo', { count: d }, { defaultValue: '{{count}}d ago' })
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [filter, setFilter] = useState<FilterKey>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const res = await api.listNotifications(http)
        if (alive) setNotifications(res.notifications)
        try {
          await api.markNotificationsRead(http)
        } catch (_error) {
          // Best-effort: marking-read failure is non-fatal — user just sees them as unread next visit.
        }
      } catch (err) {
        if (alive)
          setError(
            err instanceof Error
              ? err.message
              : t('notifications.loadError', {}, { defaultValue: 'Failed to load notifications' }),
          )
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [http, t])

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'all') return true
      if (filter === 'unread') return !n.read
      if (filter === 'pledges') return n.kind === 'pledge_received' || n.kind === 'pledge_made'
      if (filter === 'updates') return n.kind === 'campaign_update' || n.kind === 'campaign_funded'
      return true
    })
  }, [notifications, filter])

  const filterLabel: Record<FilterKey, string> = {
    all: t('status.all', {}, { defaultValue: 'All' }),
    unread: t('status.unread', {}, { defaultValue: 'Unread' }),
    pledges: t('notifications.filter.pledges', {}, { defaultValue: 'Pledges' }),
    updates: t('notifications.filter.updates', {}, { defaultValue: 'Updates' }),
  }

  return (
    <div
      className={cm.cn(
        cm.maxW('5xl'),
        cm.mxAuto,
        cm.w('full'),
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.stack(8),
      )}
      data-mol-id="page-notifications"
    >
      <header className={cm.stack(2)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('nav.activity', {}, { defaultValue: 'Activity' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
      </header>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              'transition-colors',
              f === filter
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant hover:border-primary hover:text-primary',
            )}
            data-mol-id={`filter-${f}`}
          >
            {filterLabel[f]}
          </button>
        ))}
      </div>

      {error ? (
        <div className={cm.cn(cm.textSize('sm'), 'text-error')} data-mol-id="notif-error">
          {error}
        </div>
      ) : loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : filtered.length === 0 ? (
        <div
          className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}
          data-mol-id="notif-empty"
        >
          {t(
            'notifications.empty',
            {},
            { defaultValue: 'No notifications yet — pledges and updates will appear here.' },
          )}
        </div>
      ) : (
        <ul className={cm.stack(2)}>
          {filtered.map((n) => (
            <li
              key={n.id}
              className={cm.cn(
                cm.sp('p', 5),
                cm.flex({ align: 'start', gap: 'md' }),
                'rounded-xl border transition-colors',
                !n.read
                  ? 'bg-surface-container-lowest border-primary/30'
                  : 'bg-surface-container-lowest border-outline-variant hover:bg-surface-container',
              )}
              data-mol-id={`notification-${n.id}`}
            >
              <div
                className={cm.cn(
                  cm.w(10),
                  cm.h(10),
                  cm.roundedFull,
                  cm.flex({ align: 'center', justify: 'center' }),
                  'shrink-0',
                  KIND_TINT[n.kind],
                )}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {KIND_ICON[n.kind]}
                </span>
              </div>
              <div className={cm.cn(cm.flex1, cm.stack(1), 'min-w-0')}>
                <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
                    {n.title}
                  </p>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant whitespace-nowrap ml-3',
                    )}
                  >
                    {relTime(n.created_at, t)}
                  </span>
                </div>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{n.body}</p>
                {n.campaign_title ? (
                  <Link
                    to={`/campaign/${n.campaign_id}`}
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'text-primary uppercase tracking-widest hover:underline',
                    )}
                  >
                    {n.campaign_title}
                  </Link>
                ) : null}
              </div>
              {!n.read && (
                <span
                  className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-primary mt-2')}
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Notifications
