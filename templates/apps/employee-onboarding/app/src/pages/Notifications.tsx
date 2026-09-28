import { useCallback, useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface NotificationApi {
  id: string
  kind: string
  title?: string | null
  message?: string | null
  read_at?: string | null
  created_at: string
}

const KIND_VISUALS: Record<string, { icon: string; color: string }> = {
  task: { icon: 'task_alt', color: 'var(--embark-status-complete)' },
  milestone: { icon: 'flag', color: 'var(--embark-milestone)' },
  document: { icon: 'description', color: 'var(--mol-color-error)' },
  training: { icon: 'school', color: 'var(--mol-color-primary)' },
  intro: { icon: 'diversity_3', color: 'var(--mol-color-warning)' },
  default: { icon: 'notifications', color: 'var(--mol-color-text-tertiary)' },
}

function relTime(iso: string, t: ReturnType<typeof useTranslation>['t']): string {
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const mins = Math.round(diffMs / (60 * 1000))
  if (mins < 1) return t('notifications.justNow', {}, { defaultValue: 'just now' })
  if (mins < 60) return t('notifications.minutesAgo', { mins }, { defaultValue: `${mins} min ago` })
  const hours = Math.round(mins / 60)
  if (hours < 24) return t('notifications.hoursAgo', { hours }, { defaultValue: `${hours}h ago` })
  const days = Math.round(hours / 24)
  if (days === 1) return t('notifications.yesterday', {}, { defaultValue: 'yesterday' })
  if (days < 7) return t('notifications.daysAgo', { days }, { defaultValue: `${days}d ago` })
  return new Date(iso).toLocaleDateString()
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationApi[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!http) return
    setLoading(true)
    try {
      const r = await http.get<NotificationApi[]>('/api/notifications')
      setItems(r.data ?? [])
    } catch (_error) {
      // Fetch failed — fall back to empty list; loading=false signals to the UI
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void reload()
  }, [reload])

  const markAllRead = useCallback(async () => {
    if (!http) return
    const unread = items.filter((n) => !n.read_at)
    if (unread.length === 0) return
    try {
      await Promise.all(
        unread.map((n) =>
          http.put(`/api/notifications/${n.id}`, { read_at: new Date().toISOString() }),
        ),
      )
    } catch (_error) {
      // Some updates failed — the reload below re-syncs whatever succeeded
    }
    await reload()
  }, [http, items, reload])

  const markRead = useCallback(
    async (id: string) => {
      if (!http) return
      try {
        await http.put(`/api/notifications/${id}`, { read_at: new Date().toISOString() })
      } catch (_error) {
        // Update failed — the reload below re-syncs state from the server
      }
      await reload()
    },
    [http, reload],
  )

  const unread = items.filter((n) => !n.read_at).length

  return (
    <div data-mol-id="page-notifications" className={cm.flex({ direction: 'col', gap: 'lg' })}>
      <header>
        <p
          className="text-[11px] font-black uppercase tracking-[0.3em]"
          style={{ color: 'var(--mol-color-primary)' }}
        >
          {t('nav.activityFeed', {}, { defaultValue: 'Activity feed' })}
        </p>
        <div
          className={cm.cn(
            cm.flex({ align: 'end', justify: 'between' }),
            cm.sp('mt', 2),
            'flex-wrap gap-4',
          )}
        >
          <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight')}>
            {t('notifications.title', {}, { defaultValue: "What's new for you" })}
          </h1>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <span
              data-mol-id="notifications-unread-badge"
              className="text-[10px] font-black uppercase tracking-[0.18em]"
              style={{
                color: 'var(--mol-color-primary)',
                background: 'rgba(13, 148, 136, 0.10)',
                padding: '4px 14px',
                borderRadius: '999px',
              }}
            >
              {t(
                'notifications.unreadCount',
                { count: unread },
                { defaultValue: `${unread} unread` },
              )}
            </span>
            {unread > 0 && (
              <button
                type="button"
                data-mol-id="notifications-mark-all-button"
                onClick={() => void markAllRead()}
                className="text-xs font-bold uppercase tracking-[0.14em]"
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  background: 'transparent',
                  color: 'var(--color-foreground-secondary, var(--mol-color-text-secondary))',
                  border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
                  cursor: 'pointer',
                }}
              >
                {t('notifications.markAllRead', {}, { defaultValue: 'Mark all read' })}
              </button>
            )}
          </div>
        </div>
      </header>

      {loading ? (
        <p className={cm.textMuted}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : items.length === 0 ? (
        <div className={cm.cn(cm.emptyState, cm.sp('py', 12))}>
          <div className={cm.emptyStateIcon}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '40px', color: 'var(--mol-color-primary)' }}
            >
              notifications_off
            </span>
          </div>
          <p className={cm.emptyStateTitle}>
            {t('notifications.empty.title', {}, { defaultValue: 'All caught up' })}
          </p>
          <p className={cm.emptyStateDescription}>
            {t('notifications.empty.body', {}, { defaultValue: 'New activity will show up here.' })}
          </p>
        </div>
      ) : (
        <ul className={cm.flex({ direction: 'col', gap: 'sm' })}>
          {items.map((n) => {
            const visuals = KIND_VISUALS[n.kind] ?? KIND_VISUALS.default
            const unreadItem = !n.read_at
            return (
              <li key={n.id} data-mol-id={`notification-${n.id}`}>
                <div
                  role="button"
                  tabIndex={0}
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 'md' }),
                    cm.sp('p', 5),
                    // The bar is always laid out so read and unread rows align;
                    // a read row's bar is simply transparent.
                    cm.accentCard({ tone: 'custom' }),
                    'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                  )}
                  style={{
                    background: 'var(--color-surface, var(--mol-color-surface))',
                    borderRadius: '14px',
                    border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
                    ['--mol-accent' as string]: unreadItem ? visuals.color : 'transparent',
                    cursor: unreadItem ? 'pointer' : 'default',
                  }}
                  onClick={() => unreadItem && void markRead(n.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      if (unreadItem) void markRead(n.id)
                    }
                  }}
                >
                  <div
                    className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: `color-mix(in srgb, ${visuals.color} 14%, transparent)`,
                      color: visuals.color,
                      flexShrink: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {visuals.icon}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p>
                      {n.title && <span className={cm.fontWeight('bold')}>{n.title}</span>}{' '}
                      {n.message && <span className={cm.textMuted}>{n.message}</span>}
                    </p>
                    <p className={cm.cn(cm.textMuted, 'text-xs')} style={{ marginTop: '4px' }}>
                      {relTime(n.created_at, t)}
                    </p>
                  </div>
                  {unreadItem && (
                    <span
                      aria-hidden
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: visuals.color,
                        marginTop: '12px',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
