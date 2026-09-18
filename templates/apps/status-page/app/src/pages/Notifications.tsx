import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList } from '../lib/unwrap.js'

interface AppNotification {
  id: string
  kind: 'incident' | 'subscriber' | 'maintenance' | 'team' | 'system'
  title: string
  body?: string | null
  payload?: Record<string, unknown> | string | null
  read_at?: string | null
  created_at: string
}

const KIND_TINT: Record<AppNotification['kind'], { bg: string; text: string; icon: string }> = {
  incident: { bg: 'rgba(239, 68, 68, 0.18)', text: '#fca5a5', icon: 'report' },
  maintenance: { bg: 'rgba(99, 102, 241, 0.18)', text: '#a5b4fc', icon: 'engineering' },
  subscriber: { bg: 'rgba(16, 185, 129, 0.18)', text: '#6ee7b7', icon: 'mark_email_read' },
  team: { bg: 'rgba(245, 158, 11, 0.18)', text: '#fcd34d', icon: 'group' },
  system: { bg: 'rgba(148, 163, 184, 0.18)', text: '#cbd5e1', icon: 'info' },
}

const KIND_LABEL: Record<AppNotification['kind'], string> = {
  incident: 'Incident',
  subscriber: 'Subscriber',
  maintenance: 'Maintenance',
  team: 'Team',
  system: 'System',
}

function isUnread(n: AppNotification): boolean {
  return !n.read_at
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(0, Math.floor(ms / 60_000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | AppNotification['kind']>('all')
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)

  const refresh = async () => {
    const res = await http.get('/api/notifications')
    setNotifications(unwrapList<AppNotification>(res))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/notifications')
      .then((res) => {
        if (!cancelled) setNotifications(unwrapList<AppNotification>(res))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const markAllRead = async () => {
    setMarking(true)
    try {
      await http.post('/api/notifications/read-all', {})
      await refresh()
    } finally {
      setMarking(false)
    }
  }

  const markOneRead = async (id: string) => {
    await http.post(`/api/notifications/${id}/read`, {})
    await refresh()
  }

  const visible = useMemo(() => {
    if (filter === 'all') return notifications
    if (filter === 'unread') return notifications.filter(isUnread)
    return notifications.filter((n) => n.kind === filter)
  }, [filter, notifications])

  const counts = useMemo(() => {
    return {
      total: notifications.length,
      unread: notifications.filter(isUnread).length,
      incident: notifications.filter((n) => n.kind === 'incident').length,
      subscriber: notifications.filter((n) => n.kind === 'subscriber').length,
      maintenance: notifications.filter((n) => n.kind === 'maintenance').length,
      team: notifications.filter((n) => n.kind === 'team').length,
    }
  }, [notifications])

  const filters: { key: typeof filter; label: string; count: number }[] = [
    { key: 'all', label: t('status.all', {}, { defaultValue: 'All' }), count: counts.total },
    {
      key: 'unread',
      label: t('status.unread', {}, { defaultValue: 'Unread' }),
      count: counts.unread,
    },
    {
      key: 'incident',
      label: t('notifications.filter.incident', {}, { defaultValue: 'Incidents' }),
      count: counts.incident,
    },
    {
      key: 'subscriber',
      label: t('nav.subscribers', {}, { defaultValue: 'Subscribers' }),
      count: counts.subscriber,
    },
    {
      key: 'maintenance',
      label: t('notifications.filter.maintenance', {}, { defaultValue: 'Maintenance' }),
      count: counts.maintenance,
    },
    { key: 'team', label: t('nav.team', {}, { defaultValue: 'Team' }), count: counts.team },
  ]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))} data-mol-id="page-notifications">
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn(
              'font-mono text-xs font-bold uppercase tracking-widest text-primary mb-2',
            )}
          >
            {t(
              'notifications.eyebrow',
              { app: APP_NAME },
              { defaultValue: '$ {{app}} notifications --inbox' },
            )}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'notifications.subheading',
              {},
              {
                defaultValue:
                  'Pages, audit events, and subscriber activity for your operator account.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          data-testid="mark-all-read-btn"
          disabled={marking || counts.unread === 0}
          className={cm.cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest disabled:opacity-50',
          )}
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.6)',
            color: 'var(--color-chip-text)',
            border: '1px solid var(--color-border-card)',
          }}
          onClick={markAllRead}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            mark_email_read
          </span>
          {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
        </button>
      </header>

      <div className={cm.cn('flex flex-wrap items-center gap-2 mb-4')}>
        {filters.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cm.cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-xs font-bold uppercase tracking-widest transition-colors',
              )}
              style={{
                backgroundColor: active ? 'rgba(16, 185, 129, 0.20)' : 'rgba(30, 41, 59, 0.6)',
                color: active ? 'var(--color-link-hover)' : 'var(--color-chip-text)',
                border: `1px solid ${active ? 'rgba(16, 185, 129, 0.40)' : 'var(--color-border-card)'}`,
              }}
            >
              {f.label}
              <span className={cm.cn('opacity-70')}>{f.count}</span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('notifications.empty', {}, { defaultValue: 'No notifications match this filter.' })}
        </p>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {visible.map((n) => {
            const tint = KIND_TINT[n.kind] ?? KIND_TINT.system
            const unread = isUnread(n)
            return (
              <li key={n.id} data-testid={`notification-${n.id}`}>
                <button
                  type="button"
                  onClick={() => markOneRead(n.id)}
                  disabled={!unread}
                  className={cm.cn(
                    'w-full text-left rounded-xl px-4 py-3 flex items-start gap-3',
                    unread ? 'cursor-pointer' : 'cursor-default',
                  )}
                  style={{
                    backgroundColor: unread ? 'rgba(30, 41, 59, 0.7)' : 'rgba(30, 41, 59, 0.4)',
                    border: '1px solid var(--color-border-card)',
                  }}
                >
                  <span
                    className={cm.cn(
                      'inline-flex h-9 w-9 items-center justify-center rounded-lg shrink-0',
                    )}
                    style={{ backgroundColor: tint.bg, color: tint.text }}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-base')}>
                      {tint.icon}
                    </span>
                  </span>
                  <div className={cm.cn('flex-1 min-w-0')}>
                    <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
                      <span
                        className={cm.cn(
                          'font-mono text-[10px] font-black uppercase tracking-widest',
                        )}
                        style={{ color: tint.text }}
                      >
                        {t(
                          `notifications.kind.${n.kind}`,
                          {},
                          { defaultValue: KIND_LABEL[n.kind] ?? n.kind },
                        )}
                      </span>
                      {unread ? (
                        <span
                          className={cm.cn('inline-block h-1.5 w-1.5 rounded-full')}
                          style={{ backgroundColor: 'var(--color-status-operational)' }}
                          aria-hidden="true"
                        />
                      ) : null}
                      <span
                        className={cm.cn('font-mono text-[11px] text-on-surface-variant ml-auto')}
                      >
                        {fmtRelative(n.created_at)}
                      </span>
                    </div>
                    <p className={cm.cn('mt-1 font-bold text-on-surface')}>{n.title}</p>
                    {n.body ? (
                      <p
                        className={cm.cn('mt-0.5 text-sm text-on-surface-variant leading-relaxed')}
                      >
                        {n.body}
                      </p>
                    ) : null}
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
