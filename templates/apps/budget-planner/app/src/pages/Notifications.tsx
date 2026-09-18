import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

type NotifType =
  | 'budget_overspent'
  | 'goal_reached'
  | 'goal_milestone'
  | 'monthly_report'
  | 'recurring_due'
  | 'system_message'

interface Notification {
  id: string
  type: NotifType
  title: string
  body: string
  href?: string | null
  created_at: string
  unread: boolean
}

const TYPE_ICON: Record<NotifType, string> = {
  budget_overspent: 'warning',
  goal_reached: 'celebration',
  goal_milestone: 'flag',
  monthly_report: 'description',
  recurring_due: 'event',
  system_message: 'info',
}

function fmtRelativeShort(iso: string): string {
  const t = new Date(iso).getTime()
  const now = Date.now()
  const diff = (now - t) / 1000
  if (diff < 60) return `${Math.max(1, Math.floor(diff))}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [readAllBusy, setReadAllBusy] = useState(false)

  function load(cancelled: { v: boolean }) {
    setLoading(true)
    setError(null)
    http
      .get('/api/notifications')
      .then((res) => {
        if (!cancelled.v) setNotifs(unwrapList<Notification>(res))
      })
      .catch(() => {
        if (!cancelled.v)
          setError(
            t(
              'nav.failedToLoadNotifications',
              {},
              { defaultValue: 'Failed to load notifications.' },
            ),
          )
      })
      .finally(() => {
        if (!cancelled.v) setLoading(false)
      })
  }

  useEffect(() => {
    const cancelled = { v: false }
    load(cancelled)
    return () => {
      cancelled.v = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, t])

  async function markRead(id: string) {
    setBusyId(id)
    try {
      await http.post(`/api/notifications/${id}/read`, {})
      setNotifs((cur) => cur.map((n) => (n.id === id ? { ...n, unread: false } : n)))
    } finally {
      setBusyId(null)
    }
  }

  async function markAllRead() {
    setReadAllBusy(true)
    try {
      await http.post('/api/notifications/read-all', {})
      setNotifs((cur) => cur.map((n) => ({ ...n, unread: false })))
    } finally {
      setReadAllBusy(false)
    }
  }

  const unreadCount = notifs.filter((n) => n.unread).length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              void markAllRead()
            }}
            disabled={readAllBusy}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'border border-outline rounded-md hover:bg-surface-container disabled:opacity-50',
            )}
            data-testid="notifications-read-all"
          >
            {readAllBusy
              ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
              : t(
                  'notifications.readAll',
                  { count: unreadCount },
                  { defaultValue: 'Mark all read ({{count}})' },
                )}
          </button>
        ) : null}
      </header>
      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : notifs.length === 0 ? (
        <p
          className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
          data-testid="notifications-empty"
        >
          {t('nav.noNewNotifications', {}, { defaultValue: 'No new notifications.' })}
        </p>
      ) : (
        <ul
          className={cm.cn('max-w-3xl space-y-2')}
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        >
          {notifs.map((n) => (
            <li key={n.id} data-testid={`notif-${n.id}`}>
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
                    {TYPE_ICON[n.type]}
                  </span>
                </div>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                    {n.href ? (
                      <Link
                        to={n.href}
                        onClick={() => {
                          if (n.unread) void markRead(n.id)
                        }}
                        className={cm.cn(
                          cm.textSize('base'),
                          cm.fontWeight('semibold'),
                          'hover:underline',
                        )}
                      >
                        {n.title}
                      </Link>
                    ) : (
                      <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                        {n.title}
                      </h2>
                    )}
                    <span className={cm.cn(cm.textSize('xs'), cm.textMuted, 'whitespace-nowrap')}>
                      {fmtRelativeShort(n.created_at)}
                    </span>
                  </div>
                  <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mt', 1))}>{n.body}</p>
                  {n.unread ? (
                    <button
                      type="button"
                      onClick={() => {
                        void markRead(n.id)
                      }}
                      disabled={busyId === n.id}
                      className={cm.cn(
                        cm.sp('mt', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        cm.textPrimary,
                        'hover:underline disabled:opacity-50',
                      )}
                      data-testid={`notif-read-${n.id}`}
                    >
                      {busyId === n.id
                        ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
                        : t('common.markAsRead', {}, { defaultValue: 'Mark as read' })}
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
