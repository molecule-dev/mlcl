import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SecretsManagerLayout } from '../components/SecretsManagerLayout.js'
import { SecretStatusPill, type SecretStatusTone } from '../components/SecretStatusPill.js'

interface NotificationApi {
  id: string
  kind: string
  title: string
  body?: string
  read_at?: string | null
  created_at: string
  meta?: Record<string, unknown> | null
}

const KIND_TONE: Record<string, SecretStatusTone> = {
  rotation: 'expiring',
  approval: 'pending',
  anomaly: 'inherited',
  compromise: 'revoked',
  info: 'masked',
  digest: 'masked',
}

const KIND_ICON: Record<string, string> = {
  rotation: 'autorenew',
  approval: 'how_to_reg',
  anomaly: 'wifi_tethering',
  compromise: 'gpp_bad',
  info: 'info',
  digest: 'mail',
}

const CHANNEL_LABELS = {
  slack: 'Slack',
  email: 'Email',
  webPush: 'Web Push',
} as const

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const reload = async () => {
    try {
      const res = await http.get<NotificationApi[]>('/api/notifications')
      setItems(Array.isArray(res.data) ? (res.data as NotificationApi[]) : [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    }
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await reload()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const visible = useMemo(() => {
    if (filter === 'unread') return items.filter((n) => !n.read_at)
    return items
  }, [items, filter])

  const unreadCount = items.filter((n) => !n.read_at).length

  const markAllRead = async () => {
    try {
      await http.post('/api/notifications/read-all', {})
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'mark read failed')
    }
  }

  const markRead = async (id: string) => {
    try {
      await http.post(`/api/notifications/${id}/read`, {})
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'mark read failed')
    }
  }

  const remove = async (id: string) => {
    try {
      await http.delete(`/api/notifications/${id}`)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'delete failed')
    }
  }

  const channels = [
    { key: 'slack', icon: 'tag', active: true },
    { key: 'email', icon: 'mail', active: true },
    { key: 'webPush', icon: 'notifications_active', active: false },
  ] as const

  return (
    <SecretsManagerLayout
      topAction={
        unreadCount > 0 ? (
          <button
            type="button"
            onClick={markAllRead}
            data-mol-id="notifications-mark-all-read"
            className={cm.cn(
              'inline-flex h-8 items-center gap-1 rounded border border-border bg-surface px-3 font-headline text-[12px] font-semibold text-text transition-colors hover:border-primary hover:text-primary',
            )}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
              done_all
            </span>
            {t(
              'nav.inbox',
              { count: unreadCount },
              { defaultValue: `Mark all read (${unreadCount})` },
            )}
          </button>
        ) : undefined
      }
    >
      <div className={cm.cn('flex flex-col gap-5 p-6 pb-12 md:p-8')}>
        <header className={cm.cn('flex flex-col gap-2')}>
          <span className={cm.cn('font-mono text-[11px] uppercase tracking-widest text-muted')}>
            {t(
              'notifications.kicker',
              { count: items.length, unread: unreadCount },
              { defaultValue: `${items.length} events · ${unreadCount} unread` },
            )}
          </span>
          <h1 className={cm.cn('font-headline text-3xl font-extrabold tracking-tight text-text')}>
            {t('notifications.heading', {}, { defaultValue: 'Inbox' })}
          </h1>
          <p className={cm.cn('font-body text-sm text-muted')}>
            {t(
              'notifications.subheading',
              {},
              {
                defaultValue:
                  'Rotation status, anomaly alerts, and approval requests across every vault.',
              },
            )}
          </p>
        </header>

        <div
          className={cm.cn(
            'flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8',
          )}
        >
          <div className={cm.cn('flex min-w-0 flex-col gap-5')}>
            <div
              className={cm.cn(
                'flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-widest',
              )}
            >
              {(['all', 'unread'] as const).map((key) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setFilter(key)}
                  data-mol-id={`notifications-filter-${key}`}
                  aria-pressed={filter === key}
                  className={cm.cn(
                    'rounded border px-3 py-1 transition-colors',
                    filter === key
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border text-muted hover:border-primary/30 hover:text-text',
                  )}
                >
                  {key === 'unread'
                    ? `${t('status.unread', {}, { defaultValue: 'Unread' })} ${unreadCount}`
                    : t('status.all', {}, { defaultValue: 'All' })}
                </button>
              ))}
            </div>

            {loading ? (
              <div
                data-mol-id="notifications-loading"
                className={cm.cn(
                  'rounded-lg border border-border bg-surface p-6 text-center font-mono text-xs text-muted',
                )}
              >
                {t('nav.loadingNotifications', {}, { defaultValue: 'Loading notifications…' })}
              </div>
            ) : error ? (
              <div
                data-mol-id="notifications-error"
                className={cm.cn(
                  'rounded-lg border border-error/40 bg-error/10 p-4 font-mono text-xs text-error',
                )}
              >
                {error}
              </div>
            ) : visible.length === 0 ? (
              <div
                data-mol-id="notifications-empty"
                className={cm.cn(
                  'flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-surface p-10 text-center',
                )}
              >
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[28px] text-muted"
                >
                  notifications_none
                </span>
                <p className={cm.cn('font-body text-sm text-muted')}>
                  {filter === 'unread'
                    ? t(
                        'notifications.unreadEmpty',
                        {},
                        { defaultValue: 'Inbox zero — all caught up.' },
                      )
                    : t('notifications.empty', {}, { defaultValue: 'No notifications yet.' })}
                </p>
              </div>
            ) : (
              <ol data-mol-id="notifications-list" className={cm.cn('flex flex-col gap-2')}>
                {visible.map((n) => {
                  const tone = KIND_TONE[n.kind] ?? 'masked'
                  const icon = KIND_ICON[n.kind] ?? 'circle_notifications'
                  return (
                    <li
                      key={n.id}
                      data-mol-id={`notification-${n.id}`}
                      className={cm.cn(
                        'flex items-start gap-3 rounded-xl border bg-surface p-4',
                        n.read_at ? 'border-border' : 'border-primary/40 bg-primary/5',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cm.cn(
                          'inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary',
                        )}
                      >
                        <span className="material-symbols-outlined text-[20px]">{icon}</span>
                      </span>
                      <div className={cm.cn('flex flex-1 flex-col gap-1')}>
                        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                          <h3 className={cm.cn('font-headline text-sm font-semibold text-text')}>
                            {n.title}
                          </h3>
                          <SecretStatusPill tone={tone} label={n.kind} compact />
                        </div>
                        {n.body ? (
                          <p className={cm.cn('font-body text-sm text-muted')}>{n.body}</p>
                        ) : null}
                        <span className={cm.cn('font-mono text-[11px] text-muted')}>
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                        {!n.read_at ? (
                          <button
                            type="button"
                            onClick={() => markRead(n.id)}
                            data-mol-id={`notification-read-${n.id}`}
                            aria-label={t(
                              'common.markAsRead',
                              {},
                              { defaultValue: 'Mark as read' },
                            )}
                            className={cm.cn(
                              'inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-surface text-muted transition-colors hover:border-primary hover:text-primary',
                            )}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              mark_email_read
                            </span>
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => remove(n.id)}
                          data-mol-id={`notification-delete-${n.id}`}
                          aria-label={t(
                            'notifications.delete',
                            {},
                            { defaultValue: 'Delete notification' },
                          )}
                          className={cm.cn(
                            'inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-surface text-muted transition-colors hover:border-error hover:text-error',
                          )}
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>

          <aside
            data-mol-id="notification-channels"
            aria-labelledby="notification-channels-heading"
            className={cm.cn(
              'flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 lg:sticky lg:top-8',
            )}
          >
            <h2
              id="notification-channels-heading"
              className={cm.cn(
                'flex items-center gap-2 font-headline text-sm font-semibold text-text',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary',
                )}
              >
                <span className="material-symbols-outlined text-[14px]">campaign</span>
              </span>
              {t('notifications.channels.heading', {}, { defaultValue: 'Notification Channels' })}
            </h2>
            <ul className={cm.cn('flex flex-col font-mono text-xs')}>
              {channels.map((channel, idx) => (
                <li
                  key={channel.key}
                  data-mol-id={`notification-channel-${channel.key}`}
                  className={cm.cn(
                    'flex items-center justify-between py-2',
                    idx < channels.length - 1 && 'border-b border-border/60',
                  )}
                >
                  <span
                    className={cm.cn(
                      'flex items-center gap-2',
                      channel.active ? 'text-text' : 'text-muted',
                    )}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                      {channel.icon}
                    </span>
                    {t(
                      `notifications.channels.${channel.key}`,
                      {},
                      { defaultValue: CHANNEL_LABELS[channel.key] },
                    )}
                  </span>
                  <span
                    className={cm.cn(
                      'flex items-center gap-1.5',
                      channel.active ? 'text-secret-active' : 'text-muted',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cm.cn(
                        'inline-block h-1.5 w-1.5 rounded-full',
                        channel.active ? 'bg-secret-active' : 'bg-muted',
                      )}
                      style={
                        channel.active
                          ? {
                              boxShadow:
                                '0 0 6px color-mix(in srgb, var(--color-secret-active) 55%, transparent)',
                            }
                          : undefined
                      }
                    />
                    {channel.active
                      ? t('notifications.channels.stateActive', {}, { defaultValue: 'Active' })
                      : t('notifications.channels.stateOff', {}, { defaultValue: 'Off' })}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              data-mol-id="notifications-channels-configure"
              className={cm.cn(
                'mt-1 w-full rounded border border-border bg-transparent py-2 font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:border-primary/40 hover:text-primary',
              )}
            >
              {t('notifications.channels.configure', {}, { defaultValue: 'Configure channels' })}
            </button>
          </aside>
        </div>
      </div>
    </SecretsManagerLayout>
  )
}

export default Notifications
