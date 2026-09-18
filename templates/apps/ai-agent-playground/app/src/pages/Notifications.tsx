// Pattern source: derived from RunHistory per screen-map.json derivationNotes.
// Authed notification feed — Unread/Read tabs, semantic status dot rows, real
// backend round-trip. Mark-read calls the notifications resource handler.
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageHeader } from '../components/PageHeader.js'

interface NotificationRow {
  id: string
  kind: string
  title: string
  body: string
  link?: string | null
  read_at?: string | null
  created_at?: string
}

const KIND_DOT: Record<string, string> = {
  failed: 'bg-error',
  success: 'bg-emerald-500',
  'tool-alert': 'bg-primary',
  info: 'bg-secondary',
}

function formatRelative(iso?: string | null): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))}s ago`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`
  return `${Math.floor(ms / 86_400_000)}d ago`
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [items, setItems] = useState<NotificationRow[]>([])
  const [tab, setTab] = useState<'unread' | 'read'>('unread')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<NotificationRow[]>('/notifications')
      setItems(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('notifications.loadError', {}, { defaultValue: 'Could not load notifications' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const visible = useMemo(
    () => items.filter((row) => (tab === 'unread' ? !row.read_at : !!row.read_at)),
    [items, tab],
  )
  const unreadCount = useMemo(() => items.filter((row) => !row.read_at).length, [items])

  async function markAllRead() {
    try {
      await http.post('/notifications/mark-all-read', {})
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('notifications.markAllError', {}, { defaultValue: 'Could not mark all as read' }),
      )
    }
  }

  async function markRead(id: string) {
    try {
      await http.patch(`/notifications/${id}`, {})
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'notifications.markReadError',
              {},
              { defaultValue: 'Could not mark notification as read' },
            ),
      )
    }
  }

  return (
    <div data-mol-id="page-notifications">
      <PageHeader
        actions={
          <button
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('medium'),
              cm.textSize('xs'),
              'font-mono uppercase tracking-wider text-on-surface bg-surface-container-high rounded hover:bg-surface-container-highest transition-colors',
            )}
            data-mol-id="notifications-mark-all-read"
            disabled={unreadCount === 0}
            onClick={markAllRead}
            type="button"
          >
            {t('notifications.markAllRead', {}, { defaultValue: 'Mark All As Read' })}
          </button>
        }
        subtitle={t(
          'notifications.subtitle',
          {},
          { defaultValue: 'Workspace events: failed runs, tool alerts, and provider updates.' },
        )}
        title={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
      />

      {error && (
        <p
          className={cm.cn(cm.sp('mb', 4), cm.textSize('sm'), 'text-error font-mono')}
          data-mol-id="notifications-error"
          role="alert"
        >
          {error}
        </p>
      )}

      <div
        className={cm.cn(cm.flex({ gap: 2 }), cm.sp('mb', 4), 'border-b border-outline-variant/15')}
      >
        <button
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            'font-mono uppercase tracking-wider transition-colors',
            tab === 'unread'
              ? 'text-primary border-b-2 border-primary'
              : 'text-tertiary hover:text-on-surface',
          )}
          data-mol-id="notifications-tab-unread"
          onClick={() => setTab('unread')}
          type="button"
        >
          {t(
            'notifications.tabUnread',
            { count: unreadCount },
            { defaultValue: 'Unread ({{count}})' },
          )}
        </button>
        <button
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            'font-mono uppercase tracking-wider transition-colors',
            tab === 'read'
              ? 'text-primary border-b-2 border-primary'
              : 'text-tertiary hover:text-on-surface',
          )}
          data-mol-id="notifications-tab-read"
          onClick={() => setTab('read')}
          type="button"
        >
          {t('notifications.tabRead', {}, { defaultValue: 'Read' })}
        </button>
      </div>

      <div
        className={cm.cn(
          'bg-surface-container-low rounded border border-outline-variant/15 overflow-hidden',
        )}
      >
        {loading ? (
          <div
            className={cm.cn(
              cm.sp('py', 12),
              cm.textCenter,
              'font-mono text-xs text-tertiary uppercase tracking-widest',
            )}
            data-mol-id="notifications-loading"
          >
            {t('nav.loadingNotifications', {}, { defaultValue: 'Loading notifications…' })}
          </div>
        ) : visible.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('py', 12),
              cm.textCenter,
              'font-mono text-xs text-tertiary uppercase tracking-widest',
            )}
            data-mol-id="notifications-empty"
          >
            {tab === 'unread'
              ? t('notifications.emptyUnread', {}, { defaultValue: 'You are all caught up.' })
              : t('notifications.emptyRead', {}, { defaultValue: 'No read notifications yet.' })}
          </div>
        ) : (
          <ul>
            {visible.map((notification) => {
              const dotClass = KIND_DOT[notification.kind] ?? KIND_DOT.info
              return (
                <li
                  key={notification.id}
                  className={cm.cn(
                    cm.flex({ align: 'start', justify: 'between', gap: 4 }),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'border-b border-outline-variant/10 hover:bg-surface-container transition-colors',
                  )}
                  data-mol-id="notification-row"
                >
                  <div className={cm.cn(cm.flex({ align: 'start', gap: 3 }), cm.flex1, 'min-w-0')}>
                    <span
                      className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'mt-2 shrink-0', dotClass)}
                    />
                    <div className={cm.flex1}>
                      <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.sp('mb', 1))}>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            'font-mono uppercase tracking-widest text-tertiary',
                          )}
                        >
                          {notification.kind.toUpperCase()}
                        </span>
                        {notification.title && (
                          <span
                            className={cm.cn(
                              cm.sp('px', 2),
                              cm.textSize('xs'),
                              'font-headline rounded bg-surface-container text-tertiary',
                            )}
                          >
                            {notification.title}
                          </span>
                        )}
                      </div>
                      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-relaxed')}>
                        {notification.body}
                      </p>
                    </div>
                  </div>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'shrink-0')}>
                    <span className="font-mono text-[10px] text-tertiary uppercase tracking-widest">
                      {formatRelative(notification.created_at)}
                    </span>
                    {!notification.read_at && (
                      <button
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          'font-mono uppercase tracking-wider text-tertiary hover:text-on-surface transition-colors',
                        )}
                        data-mol-id="notification-mark-read"
                        onClick={() => markRead(notification.id)}
                        type="button"
                      >
                        {t('notifications.markRead', {}, { defaultValue: 'Mark Read' })}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export default Notifications
