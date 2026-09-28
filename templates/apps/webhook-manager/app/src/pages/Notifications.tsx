import { useMemo, useState } from 'react'

import { getClient as getHttpClient } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { MetricStatCard } from '../components/MetricStatCard.js'
import { useApi } from '../lib/useApi.js'

const PANEL_BG = 'var(--mol-color-surface)'
const PANEL_BORDER = 'var(--mol-color-border)'

interface ApiNotification {
  id: string
  user_id: string
  endpoint_id: string | null
  type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  body: string | null
  is_read: boolean
  created_at: string
}

const SEVERITY_TINT: Record<
  ApiNotification['severity'],
  { fg: string; bg: string; border: string; icon: string }
> = {
  critical: {
    fg: 'var(--mol-color-error)',
    bg: 'color-mix(in srgb, var(--mol-color-error) 15%, transparent)',
    border: 'var(--mol-color-error)',
    icon: 'priority_high',
  },
  warning: {
    fg: 'var(--mol-color-warning)',
    bg: 'color-mix(in srgb, var(--mol-color-warning) 15%, transparent)',
    border: 'var(--mol-color-warning)',
    icon: 'warning',
  },
  info: {
    fg: 'var(--mol-color-secondary)',
    bg: 'color-mix(in srgb, var(--mol-color-secondary) 15%, transparent)',
    border: 'var(--mol-color-secondary)',
    icon: 'info',
  },
}

const fmtAgo = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}s`
  const mins = Math.floor(sec / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical' | 'warning' | 'info'>('all')
  const [error, setError] = useState<string | null>(null)
  const { data: notifData, refetch } = useApi<ApiNotification[]>(
    `/notifications?filter=${filter}&limit=200`,
    [filter],
  )
  const items = notifData ?? []

  // Pull a separate "all" set for the metric counts (so they remain stable as filter changes).
  const { data: allData } = useApi<ApiNotification[]>('/notifications?filter=all&limit=200')
  const all = useMemo(() => allData ?? [], [allData])
  const unreadCount = all.filter((n) => !n.is_read).length
  const criticalCount = all.filter((n) => n.severity === 'critical').length

  const markAllRead = async () => {
    try {
      const client = getHttpClient()
      await client.post('/notifications/read-all', {})
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all read.')
    }
  }

  const markRead = async (id: string, currentlyUnread: boolean) => {
    if (!currentlyUnread) return
    try {
      const client = getHttpClient()
      await client.patch(`/notifications/${id}`, { is_read: true })
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark read.')
    }
  }

  return (
    <div
      className={cm.cn(cm.sp('p', 6), 'max-w-5xl mx-auto')}
      style={{ color: 'var(--mol-color-text)' }}
      data-mol-id="notifications-root"
    >
      <div className={cm.cn('flex items-end justify-between gap-4 flex-wrap mb-6')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t('notifications.eyebrow', {}, { defaultValue: 'inbox · operational alerts' })}
          </p>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
            style={{ color: 'var(--mol-color-text)' }}
          >
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p
            className={cm.cn('mt-2 text-sm max-w-xl')}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {t(
              'notifications.body',
              { app: APP_NAME },
              {
                defaultValue:
                  'Failures, secret rotations, threshold breaches. {{app}} writes here before paging — read it daily.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className={cm.cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          style={{
            border: '1px solid var(--mol-color-border)',
            color: 'var(--mol-color-text)',
          }}
          data-mol-id="notifications-mark-all-read"
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            done_all
          </span>
          {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
        </button>
      </div>

      {error && (
        <p
          className={cm.cn('mb-4 text-xs font-mono')}
          style={{ color: 'var(--mol-color-error)' }}
          role="alert"
        >
          {error}
        </p>
      )}

      <div className={cm.cn('grid gap-4 mb-6 grid-cols-1 sm:grid-cols-3')}>
        <MetricStatCard
          eyebrow={t('status.unread', {}, { defaultValue: 'Unread' })}
          value={String(unreadCount)}
          tone={unreadCount > 0 ? 'warning' : 'neutral'}
          icon="mark_email_unread"
        />
        <MetricStatCard
          eyebrow={t('notifications.metric.critical', {}, { defaultValue: 'Critical · 24h' })}
          value={String(criticalCount)}
          tone="error"
          icon="priority_high"
        />
        <MetricStatCard
          eyebrow={t('nav.total', {}, { defaultValue: 'Total' })}
          value={String(all.length)}
          caption={t('notifications.metric.totalCaption', {}, { defaultValue: 'all-time inbox' })}
          tone="info"
          icon="campaign"
        />
      </div>

      <div
        className={cm.cn('rounded-xl p-3 mb-5 flex items-center gap-1 flex-wrap')}
        style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
        data-mol-id="notifications-filter-bar"
      >
        {(['all', 'unread', 'critical', 'warning', 'info'] as const).map((f) => {
          const active = filter === f
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cm.cn(
                'inline-flex items-center px-3 py-1.5 rounded-md font-mono text-[11px] font-bold uppercase tracking-widest transition-colors',
              )}
              style={{
                backgroundColor: active
                  ? 'color-mix(in srgb, var(--mol-color-primary) 15%, transparent)'
                  : 'transparent',
                color: active ? 'var(--mol-color-primary)' : 'var(--mol-color-text-secondary)',
                boxShadow: active
                  ? 'inset 0 0 0 1px color-mix(in srgb, var(--mol-color-primary) 35%, transparent)'
                  : undefined,
              }}
              data-mol-id={`notifications-filter-${f}`}
            >
              {t(`notifications.filter.${f}`, {}, { defaultValue: f })}
            </button>
          )
        })}
      </div>

      {items.length === 0 ? (
        <div
          className={cm.cn('rounded-xl p-12 text-center')}
          style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
          data-mol-id="notifications-empty"
        >
          <p
            className={cm.cn('font-mono text-sm font-bold mb-1')}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {filter === 'all'
              ? t('notifications.empty.all', {}, { defaultValue: 'No notifications yet.' })
              : t(
                  'notifications.empty.filtered',
                  {},
                  { defaultValue: 'Nothing matches that filter.' },
                )}
          </p>
          <p className={cm.cn('text-xs')} style={{ color: 'var(--mol-color-text-tertiary)' }}>
            {t(
              'notifications.emptyHint',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} will write here when delivery anomalies, rotations, or breaches occur.',
              },
            )}
          </p>
        </div>
      ) : (
        <ul className={cm.cn('flex flex-col gap-3')} data-mol-id="notifications-list">
          {items.map((n) => {
            const tint = SEVERITY_TINT[n.severity] ?? SEVERITY_TINT.info
            return (
              <li key={n.id} data-mol-id={`notification-${n.id}`}>
                <button
                  type="button"
                  className={cm.cn(
                    cm.accentCard({ tone: 'custom' }),
                    'w-full text-left rounded-xl px-5 py-4 transition-all hover:-translate-y-0.5 cursor-pointer',
                  )}
                  style={{
                    backgroundColor: 'var(--mol-color-surface)',
                    border: '1px solid var(--mol-color-border)',
                    ['--mol-accent' as string]: tint.border,
                  }}
                  onClick={() => markRead(n.id, !n.is_read)}
                  aria-pressed={n.is_read}
                >
                  <div className={cm.cn('flex items-start gap-3')}>
                    <span
                      className={cm.cn(
                        'inline-flex h-8 w-8 items-center justify-center rounded-full shrink-0',
                      )}
                      style={{ backgroundColor: tint.bg, color: tint.fg }}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-base')}
                        aria-hidden="true"
                      >
                        {tint.icon}
                      </span>
                    </span>
                    <div className={cm.cn('flex-1 min-w-0')}>
                      <div className={cm.cn('flex items-center gap-2 flex-wrap')}>
                        <span
                          className={cm.cn('block text-sm font-extrabold')}
                          style={{ color: 'var(--mol-color-text)' }}
                        >
                          {n.title}
                        </span>
                        {!n.is_read ? (
                          <span
                            className={cm.cn('h-2 w-2 rounded-full')}
                            style={{ backgroundColor: BRAND_COLOR }}
                            aria-label="unread"
                          />
                        ) : null}
                        <span
                          className={cm.cn('ml-auto font-mono text-[11px]')}
                          style={{ color: 'var(--mol-color-text-tertiary)' }}
                        >
                          {fmtAgo(n.created_at)} ago
                        </span>
                      </div>
                      {n.body && (
                        <p
                          className={cm.cn('mt-1 text-sm leading-relaxed')}
                          style={{ color: 'var(--mol-color-text-secondary)' }}
                        >
                          {n.body}
                        </p>
                      )}
                      {n.endpoint_id ? (
                        <p
                          className={cm.cn('mt-2 font-mono text-[11px]')}
                          style={{ color: 'var(--mol-color-text-tertiary)' }}
                        >
                          <span
                            className={cm.cn(
                              'material-symbols-outlined text-[12px] align-middle mr-1',
                            )}
                            aria-hidden="true"
                          >
                            cloud_sync
                          </span>
                          {n.endpoint_id}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
