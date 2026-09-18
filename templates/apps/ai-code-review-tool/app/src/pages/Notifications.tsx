import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList } from '../lib/unwrap.js'

type NotifType = 'critical_finding' | 'pr_opened' | 'pr_merged' | 'mention' | 'system_message'

interface Notification {
  id: string
  kind?: string
  type?: NotifType
  title: string
  body?: string | null
  link?: string | null
  href?: string | null
  read_at?: string | null
  createdAt?: string
  unread?: boolean
}

const TYPE_ICON: Record<NotifType, string> = {
  critical_finding: 'shield',
  pr_opened: 'merge',
  pr_merged: 'commit',
  mention: 'alternate_email',
  system_message: 'auto_awesome',
}

const FILTERS: ReadonlyArray<{ key: 'all' | NotifType; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'critical_finding', label: 'Critical' },
  { key: 'mention', label: 'Mentions' },
  { key: 'pr_opened', label: 'PR events' },
  { key: 'system_message', label: 'System' },
]

const inferType = (n: Notification): NotifType => {
  const k = (n.type || n.kind || '').toLowerCase()
  if (k.includes('critical')) return 'critical_finding'
  if (k.includes('mention')) return 'mention'
  if (k.includes('merge')) return 'pr_merged'
  if (k.includes('open')) return 'pr_opened'
  return 'system_message'
}
const isUnread = (n: Notification): boolean => {
  if (typeof n.unread === 'boolean') return n.unread
  return !n.read_at
}

function fmtRelative(iso: string | undefined): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return ''
  const s = Math.max(1, Math.floor(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | NotifType>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/notifications')
      .catch(() => null)
      .then((res) => {
        if (!cancelled) setNotifs(unwrapList<Notification>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t(
              'nav.failedToLoadNotifications',
              {},
              { defaultValue: 'Failed to load notifications.' },
            ),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = filter === 'all' ? notifs : notifs.filter((n) => inferType(n) === filter)
  const unreadCount = notifs.filter(isUnread).length
  const criticalCount = notifs.filter((n) => inferType(n) === 'critical_finding').length

  const markRead = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      const stamp = new Date().toISOString()
      setNotifs((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: stamp, unread: false } : n)),
      )
      await http.post(`/api/notifications/${id}/read`, {})
    } catch (err) {
      console.error('[notifications] mark read failed', err)
      setError(t('notifications.markReadError', {}, { defaultValue: 'Failed to mark as read.' }))
      const fresh = await http.get('/api/notifications').catch(() => null)
      setNotifs(unwrapList<Notification>(fresh))
    } finally {
      setBusyId(null)
    }
  }

  const markAllRead = async () => {
    const targets = notifs.filter(isUnread)
    if (targets.length === 0) return
    setBulkBusy(true)
    setError(null)
    try {
      const stamp = new Date().toISOString()
      setNotifs((prev) =>
        prev.map((n) => (isUnread(n) ? { ...n, read_at: stamp, unread: false } : n)),
      )
      await Promise.all(targets.map((n) => http.post(`/api/notifications/${n.id}/read`, {})))
    } catch (err) {
      console.error('[notifications] mark all read failed', err)
      setError(t('notifications.markAllError', {}, { defaultValue: 'Failed to mark all as read.' }))
      const fresh = await http.get('/api/notifications').catch(() => null)
      setNotifs(unwrapList<Notification>(fresh))
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <div
      className={cm.cn(cm.flex1, cm.sp('px', 8), cm.sp('py', 8), cm.stack(6))}
      data-mol-id={`notifications-filter-${filter}`}
    >
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary font-mono',
          )}
          aria-live="polite"
        >
          {t(
            'notifications.eyebrow',
            { appName: APP_NAME, filter },
            { defaultValue: '{{appName}} · activity · {{filter}}' },
          )}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 1),
            'tracking-tight',
          )}
        >
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        <div
          className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap', align: 'center' }), cm.sp('mt', 4))}
        >
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'bg-primary-container text-primary uppercase tracking-wider font-mono',
            )}
            data-mol-id="notif-unread-count"
          >
            {t('common.countUnread', { count: unreadCount }, { defaultValue: '{{count}} unread' })}
          </span>
          {criticalCount > 0 ? (
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-red-500/15 text-error uppercase tracking-wider font-mono',
              )}
            >
              {t(
                'notifications.criticalCount',
                { count: criticalCount },
                { defaultValue: '{{count}} critical' },
              )}
            </span>
          ) : null}
          <button
            type="button"
            onClick={markAllRead}
            disabled={bulkBusy || unreadCount === 0}
            data-mol-id="notif-mark-all-read"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'ml-auto rounded-full uppercase tracking-wider font-mono bg-surface-container-low text-on-surface-variant hover:bg-surface-container disabled:opacity-50 transition-colors',
            )}
          >
            {bulkBusy
              ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
              : t('common.markAllAsRead', {}, { defaultValue: 'Mark all as read' })}
          </button>
        </div>
      </header>

      <nav
        className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }))}
        aria-label={t('notifications.filterLabel', {}, { defaultValue: 'Filter notifications' })}
      >
        {FILTERS.map((f) => {
          const active = f.key === filter
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              disabled={active}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'rounded-full uppercase tracking-widest font-mono transition-colors',
                active
                  ? 'bg-primary-dark text-white'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {t(`notifications.filter.${f.key}`, {}, { defaultValue: f.label })}
            </button>
          )
        })}
      </nav>

      {error ? (
        <p className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-error')} data-mol-id="notif-error">
          {error}
        </p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('notifications.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p
          className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}
          data-mol-id="notif-empty"
        >
          {t(
            'notifications.empty',
            { appName: APP_NAME },
            { defaultValue: 'Inbox zero. {{appName}} will surface PR events here.' },
          )}
        </p>
      ) : (
        <ul
          className={cm.cn('max-w-3xl space-y-2')}
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          data-mol-id="notif-feed"
        >
          {visible.map((n) => {
            const type = inferType(n)
            const unread = isUnread(n)
            const href = n.href ?? n.link ?? ''
            return (
              <li
                key={n.id}
                data-mol-id="notif-item"
                data-notif-id={n.id}
                data-unread={unread ? 'true' : 'false'}
              >
                <div
                  className={cm.cn(
                    cm.card(),
                    cm.sp('p', 4),
                    cm.flex({ align: 'start', gap: 'md' }),
                    unread ? 'border-l-4 border-primary' : '',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.shrink0,
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.roundedFull,
                      cm.textPrimary,
                      'h-10 w-10 bg-primary-container',
                    )}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {TYPE_ICON[type]}
                    </span>
                  </div>
                  <div className={cm.cn(cm.flex1, 'min-w-0')}>
                    <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                      <h2
                        className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}
                        data-mol-id="notif-title"
                      >
                        {n.title}
                      </h2>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.textMuted,
                          'whitespace-nowrap font-mono',
                        )}
                      >
                        {fmtRelative(n.createdAt)}
                      </span>
                    </div>
                    {n.body ? (
                      <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{n.body}</p>
                    ) : null}
                    <div className={cm.cn(cm.flex({ gap: 'sm', align: 'center' }), cm.sp('mt', 2))}>
                      {href ? (
                        <a
                          href={href}
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            'text-primary hover:underline',
                          )}
                        >
                          {t('common.open', {}, { defaultValue: 'Open' })}
                        </a>
                      ) : null}
                      {unread ? (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          disabled={busyId === n.id}
                          data-mol-id="notif-mark-read"
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            'ml-auto text-on-surface-variant hover:text-primary disabled:opacity-50 transition-colors',
                          )}
                        >
                          {busyId === n.id
                            ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
                            : t('common.markAsRead', {}, { defaultValue: 'Mark as read' })}
                        </button>
                      ) : (
                        <span
                          className={cm.cn(
                            'ml-auto text-[10px] font-mono uppercase tracking-widest text-on-surface-variant',
                          )}
                        >
                          {t('notifications.readBadge', {}, { defaultValue: 'Read' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
