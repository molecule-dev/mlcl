import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { unwrapList } from '../lib/unwrap.js'

type NotifType = 'order_status' | 'driver_message' | 'promo' | 'account'

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
  order_status: 'receipt_long',
  driver_message: 'chat',
  promo: 'local_offer',
  account: 'person',
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()

  function fmtRelative(iso: string): string {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    const mins = Math.round(diff / 60000)
    if (mins < 1) return t('notifications.justNow', {}, { defaultValue: 'just now' })
    if (mins < 60)
      return t('notifications.minutesShort', { count: mins }, { defaultValue: '{{count}}m' })
    const hrs = Math.round(mins / 60)
    if (hrs < 24)
      return t('notifications.hoursShort', { count: hrs }, { defaultValue: '{{count}}h' })
    const days = Math.round(hrs / 24)
    return t('notifications.daysShort', { count: days }, { defaultValue: '{{count}}d' })
  }
  const http = useHttpClient()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [readAllBusy, setReadAllBusy] = useState(false)

  const reload = useCallback((): Promise<void> => {
    setLoading(true)
    setError(null)
    return http
      .get('/api/notifications')
      .then((res) => setNotifs(unwrapList<Notification>(res)))
      .catch(() =>
        setError(
          t('nav.failedToLoadNotifications', {}, { defaultValue: 'Failed to load notifications.' }),
        ),
      )
      .finally(() => setLoading(false))
  }, [http, t])

  useEffect(() => {
    reload()
  }, [reload])

  async function markRead(id: string): Promise<void> {
    try {
      await http.post(`/api/notifications/${id}/read`, {})
      setNotifs((current) => current.map((n) => (n.id === id ? { ...n, unread: false } : n)))
    } catch (_error) {
      // best-effort — UI already reflects read state; server sync failure is non-critical
    }
  }

  async function markAllRead(): Promise<void> {
    if (readAllBusy) return
    setReadAllBusy(true)
    try {
      await http.post('/api/notifications/read-all', {})
      setNotifs((current) => current.map((n) => ({ ...n, unread: false })))
    } catch (_error) {
      // best-effort — UI already reflects read state; server sync failure is non-critical
    } finally {
      setReadAllBusy(false)
    }
  }

  const unreadCount = notifs.filter((n) => n.unread).length
  const orderCount = notifs.filter((n) => n.type === 'order_status').length

  return (
    <div className={cm.cn(cm.maxW('2xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('notifications.eyebrow', {}, { defaultValue: 'Your activity' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mt', 1))}>
          {t(
            'notifications.subheading',
            {},
            { defaultValue: 'Order status, driver messages, and offers.' },
          )}
        </p>
        {!loading && !error && notifs.length > 0 ? (
          <div
            className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap', align: 'center' }), cm.sp('mt', 4))}
          >
            <span
              data-testid="notifications-unread-count"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-primary-container text-on-primary-container uppercase tracking-wider',
              )}
            >
              {t(
                'common.countUnread',
                { count: unreadCount },
                { defaultValue: '{{count}} unread' },
              )}
            </span>
            {orderCount > 0 ? (
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'bg-success-light text-success uppercase tracking-wider',
                )}
              >
                {t(
                  'notifications.orderCount',
                  { count: orderCount },
                  { defaultValue: '{{count}} order updates' },
                )}
              </span>
            ) : null}
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                disabled={readAllBusy}
                data-testid="notifications-mark-all-read"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'border border-outline rounded-full hover:bg-surface-container disabled:opacity-50 uppercase tracking-wider',
                )}
              >
                {readAllBusy
                  ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
                  : t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      {error ? (
        <LoadErrorBanner message={error} onRetry={reload} />
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : notifs.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              cm.sp('mb', 4),
              'h-16 w-16 mx-auto bg-primary-container/40',
            )}
          >
            <span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">
              restaurant
            </span>
          </div>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 1))}>
            {t('notifications.emptyHeading', {}, { defaultValue: "You're all caught up" })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'notifications.empty',
              {},
              { defaultValue: "No new notifications. We'll let you know when something arrives." },
            )}
          </p>
        </div>
      ) : (
        <ul
          data-testid="notifications-list"
          className="space-y-2"
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        >
          {notifs.map((n) => {
            const Inner = (
              <div
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'start', gap: 'md' }),
                  'bg-surface rounded-xl shadow-sm',
                  n.unread ? cm.accentCard({ tone: 'primary' }) : '',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.roundedFull,
                    'h-10 w-10 bg-primary-container text-on-primary-container shrink-0',
                  )}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {TYPE_ICON[n.type] ?? 'notifications'}
                  </span>
                </div>
                <div className={'flex-1 min-w-0'}>
                  <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                    <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                      {n.title}
                    </h2>
                    <span className={cm.cn(cm.textSize('xs'), cm.textMuted, 'whitespace-nowrap')}>
                      {fmtRelative(n.created_at)}
                    </span>
                  </div>
                  <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{n.body}</p>
                </div>
              </div>
            )
            return (
              <li
                key={n.id}
                data-testid="notification-row"
                data-unread={n.unread ? 'true' : 'false'}
                data-notif-id={n.id}
              >
                {n.href ? (
                  <Link
                    to={n.href}
                    onClick={() => {
                      if (n.unread) void markRead(n.id)
                    }}
                    className="block"
                  >
                    {Inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (n.unread) void markRead(n.id)
                    }}
                    data-testid="notification-mark-read"
                    className="block w-full text-left"
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
