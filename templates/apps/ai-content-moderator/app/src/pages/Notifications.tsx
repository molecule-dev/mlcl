import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SiftLayout } from '../components/SiftLayout.js'

type EventType = 'assignment' | 'escalation' | 'mention' | 'rule-fired' | 'system'

interface ApiNotification {
  id: string
  kind: EventType
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  createdAt: string
}

const FILTERS: { id: EventType | 'all'; labelKey: string; defaultLabel: string }[] = [
  { id: 'all', labelKey: 'notifications.filter.all', defaultLabel: 'All' },
  { id: 'assignment', labelKey: 'notifications.filter.assigned', defaultLabel: 'Assignments' },
  { id: 'escalation', labelKey: 'notifications.filter.escalated', defaultLabel: 'Escalations' },
  { id: 'mention', labelKey: 'notifications.filter.mentions', defaultLabel: 'Mentions' },
  { id: 'rule-fired', labelKey: 'notifications.filter.rules', defaultLabel: 'Rule alerts' },
]

const EVENT_STYLES: Record<EventType, { icon: string; tint: string }> = {
  assignment: { icon: 'assignment', tint: 'text-sky-700 bg-sky-50' },
  escalation: { icon: 'crisis_alert', tint: 'text-purple-700 bg-purple-50' },
  mention: { icon: 'alternate_email', tint: 'text-primary bg-primary/10' },
  'rule-fired': { icon: 'rule', tint: 'text-warning bg-warning-light' },
  system: { icon: 'campaign', tint: 'text-on-surface-variant bg-surface-container-low' },
}

function relativeAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(1, Math.floor(diff / 60_000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterParam = searchParams.get('filter') as EventType | 'all' | null
  const filter: EventType | 'all' = filterParam ?? 'all'
  const setFilter = (next: EventType | 'all') => {
    const params = new URLSearchParams(searchParams)
    params.set('filter', next)
    setSearchParams(params, { replace: false })
  }
  const [items, setItems] = useState<ApiNotification[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function loadItems() {
    http
      .get<ApiNotification[]>('/api/notifications')
      .then((res) => setItems(res.data ?? []))
      .catch(() => {
        setError(
          t('nav.couldNotLoadNotifications', {}, { defaultValue: 'Could not load notifications.' }),
        )
        setItems([])
      })
  }

  useEffect(() => {
    let cancelled = false
    http
      .get<ApiNotification[]>('/api/notifications')
      .then((res) => {
        if (cancelled) return
        setItems(res.data ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setError(
          t('nav.couldNotLoadNotifications', {}, { defaultValue: 'Could not load notifications.' }),
        )
        setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = useMemo(() => {
    if (!items) return []
    if (filter === 'all') return items
    return items.filter((n) => n.kind === filter)
  }, [items, filter])

  const unread = (items ?? []).filter((i) => !i.read_at).length

  async function markAllRead() {
    setBusy(true)
    try {
      await http.post('/api/notifications/read-all', {})
      loadItems()
    } catch (error) {
      logError('notifications.markAllRead', error)
      setError(t('notifications.markError', {}, { defaultValue: 'Could not mark as read.' }))
    } finally {
      setBusy(false)
    }
  }

  async function markRead(id: string) {
    setBusy(true)
    try {
      await http.post(`/api/notifications/${id}/read`, {})
      loadItems()
    } catch (error) {
      logError('notifications.markRead', error)
      setError(t('notifications.markError', {}, { defaultValue: 'Could not mark as read.' }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SiftLayout
      actions={
        unread > 0 ? (
          <button
            type="button"
            onClick={markAllRead}
            disabled={busy}
            className={cm.cn(
              'border border-outline-variant text-on-surface text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-lg hover:bg-surface-container-low transition-colors disabled:opacity-60',
            )}
          >
            {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
          </button>
        ) : null
      }
    >
      <header className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), 'gap-4 flex-wrap')}>
        <div>
          <h1
            className={cm.cn(
              cm.flex({ align: 'center' }),
              'text-4xl font-bold tracking-tight font-headline text-on-surface mb-2 gap-3',
            )}
          >
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            {unread > 0 && (
              <span
                className={cm.cn(
                  'text-[11px] font-bold uppercase tracking-widest bg-primary text-white rounded-full px-2.5 py-1',
                )}
              >
                {t(
                  'notifications.unreadCount',
                  { count: unread },
                  { defaultValue: `${unread} new` },
                )}
              </span>
            )}
          </h1>
          <p className={cm.cn('text-on-surface-variant')}>
            {t(
              'notifications.subheading',
              {},
              { defaultValue: 'Assignments, escalations, mentions and rule-trigger alerts.' },
            )}
          </p>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            'rounded-lg border-l-4 border-red-500 bg-error-light px-4 py-3 text-sm text-error',
          )}
        >
          {error}
        </div>
      )}

      <section
        className={cm.cn('rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden')}
      >
        <div
          className={cm.cn(
            'px-6 py-4 border-b border-surface-container flex items-center gap-2 flex-wrap',
          )}
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={cm.cn(
                'px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-colors',
                filter === f.id
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface-container-low text-on-surface-variant border-surface-container hover:bg-surface-container',
              )}
            >
              {t(f.labelKey, {}, { defaultValue: f.defaultLabel })}
            </button>
          ))}
        </div>
        <ul className={cm.cn('divide-y divide-surface-container')}>
          {items === null && (
            <li className={cm.cn('px-6 py-12 text-center text-sm text-on-surface-variant')}>
              {t('nav.loadingNotifications', {}, { defaultValue: 'Loading notifications…' })}
            </li>
          )}
          {visible.map((notification) => {
            const style = EVENT_STYLES[notification.kind] ?? EVENT_STYLES.system
            return (
              <li
                key={notification.id}
                className={cm.cn(
                  'px-6 py-4 flex items-start gap-4 transition-colors',
                  notification.read_at ? '' : 'bg-primary/5',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn(
                    'material-symbols-outlined p-2 rounded-full text-[20px]',
                    style.tint,
                  )}
                >
                  {style.icon}
                </span>
                <div className={cm.cn('flex-1 min-w-0')}>
                  <p className={cm.cn('text-sm text-on-surface')}>
                    <strong>{notification.title}</strong>
                    {notification.body ? (
                      <span className={cm.cn('text-on-surface-variant')}> {notification.body}</span>
                    ) : null}
                  </p>
                  <p className={cm.cn('text-xs text-on-surface-variant mt-1')}>
                    {relativeAge(notification.createdAt)}
                  </p>
                </div>
                <div className={cm.cn('flex items-center gap-2')}>
                  {notification.link && (
                    <Link
                      to={notification.link}
                      onClick={() => markRead(notification.id)}
                      className={cm.cn(
                        'text-xs text-primary font-bold uppercase tracking-wider hover:underline',
                      )}
                    >
                      {t('common.open', {}, { defaultValue: 'Open' })}
                    </Link>
                  )}
                  {!notification.read_at && (
                    <button
                      type="button"
                      onClick={() => markRead(notification.id)}
                      disabled={busy}
                      className={cm.cn(
                        'text-xs text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50',
                      )}
                      aria-label={t('common.markAsRead', {}, { defaultValue: 'Mark as read' })}
                    >
                      <span
                        aria-hidden="true"
                        className={cm.cn('material-symbols-outlined text-[18px]')}
                      >
                        mark_email_read
                      </span>
                    </button>
                  )}
                </div>
              </li>
            )
          })}
          {items !== null && visible.length === 0 && (
            <li className={cm.cn('px-6 py-12 text-center text-sm text-on-surface-variant')}>
              {t(
                'notifications.empty',
                {},
                { defaultValue: 'No notifications match this filter.' },
              )}
            </li>
          )}
        </ul>
      </section>
    </SiftLayout>
  )
}

export default Notifications
