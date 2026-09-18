import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  type AppNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationType,
} from '../lib/api.js'

const TYPE_ICON: Record<NotificationType, string> = {
  reminder: 'alarm',
  overdue: 'warning',
  assigned: 'person_add',
  mention: 'alternate_email',
  recurring: 'event_repeat',
  system_message: 'info',
}

function relTime(iso: string): string {
  const ts = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.round((now - ts) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [notifs, setNotifs] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listNotifications(http)
      .then((items) => {
        if (!cancelled) setNotifs(items)
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

  const onItemClick = async (n: AppNotification) => {
    if (n.unread) {
      // Optimistic update so the badge feels instant.
      setNotifs((prev) =>
        prev.map((x) =>
          x.id === n.id ? { ...x, unread: false, read_at: new Date().toISOString() } : x,
        ),
      )
      await markNotificationRead(http, n.id).catch(() => null)
    }
    if (n.href) navigate(n.href)
  }

  const onMarkAllRead = async () => {
    if (busy || notifs.every((n) => !n.unread)) return
    setBusy(true)
    try {
      await markAllNotificationsRead(http)
      setNotifs((prev) =>
        prev.map((n) => ({ ...n, unread: false, read_at: n.read_at ?? new Date().toISOString() })),
      )
    } finally {
      setBusy(false)
    }
  }

  const unreadCount = notifs.filter((n) => n.unread).length
  const overdueCount = notifs.filter((n) => n.type === 'overdue').length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.sp('mb', 6)}>
        <div
          className={cm.cn(
            cm.flex({ align: 'start', justify: 'between', gap: 'md', wrap: 'wrap' }),
          )}
        >
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('nav.activity', {}, { defaultValue: 'Activity' })}
            </p>
            <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
              {t(
                'notifications.subheading',
                {},
                { defaultValue: 'Reminders, mentions, and overdue tasks.' },
              )}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={busy}
              data-mol-id="notifications-mark-all-read"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-md border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-40',
              )}
            >
              {busy
                ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
                : t(
                    'notifications.markAllRead',
                    { count: unreadCount },
                    { defaultValue: 'Mark all read ({{count}})' },
                  )}
            </button>
          )}
        </div>
        {!loading && !error && notifs.length > 0 ? (
          <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 4))}>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-primary-container text-primary uppercase tracking-wider',
              )}
            >
              {t(
                'common.countUnread',
                { count: unreadCount },
                { defaultValue: '{{count}} unread' },
              )}
            </span>
            {overdueCount > 0 ? (
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'bg-error-light text-error uppercase tracking-wider',
                )}
              >
                {t(
                  'notifications.overdueCount',
                  { count: overdueCount },
                  { defaultValue: '{{count}} overdue' },
                )}
              </span>
            ) : null}
          </div>
        ) : null}
      </header>
      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : notifs.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.maxW('lg'), cm.mxAuto)}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              cm.sp('mb', 4),
              'h-16 w-16 mx-auto bg-primary-container/40',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-3xl text-primary')}
              aria-hidden="true"
            >
              task_alt
            </span>
          </div>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 1))}>
            {t('notifications.emptyHeading', {}, { defaultValue: 'Inbox zero' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'notifications.empty',
              {},
              { defaultValue: 'Nothing here yet. Quiet enough to focus.' },
            )}
          </p>
        </div>
      ) : (
        <ul
          className={cm.cn('max-w-3xl space-y-2')}
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        >
          {notifs.map((n) => {
            const icon = TYPE_ICON[n.type] ?? 'notifications'
            const Inner = (
              <div
                className={cm.cn(
                  cm.card(),
                  cm.sp('p', 4),
                  cm.flex({ align: 'start', gap: 'md' }),
                  n.unread ? 'border-l-4 border-primary' : '',
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
                    {icon}
                  </span>
                </div>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                    <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                      {n.title}
                    </h2>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant whitespace-nowrap',
                      )}
                    >
                      {relTime(n.created_at)}
                    </span>
                  </div>
                  {n.body ? (
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
                      {n.body}
                    </p>
                  ) : null}
                </div>
              </div>
            )
            return (
              <li key={n.id} data-mol-id={`notification-${n.id}`}>
                {n.href ? (
                  <Link to={n.href} className="block" onClick={() => onItemClick(n)}>
                    {Inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => onItemClick(n)}
                  >
                    {Inner}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
