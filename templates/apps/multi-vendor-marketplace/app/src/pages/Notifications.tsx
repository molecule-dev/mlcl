import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ApiNotification {
  id: string
  type: string
  title: string
  body: string
  href: string | null
  unread: boolean
  created_at: string
}

interface ApiNotificationsResponse {
  data: ApiNotification[]
  total: number
  unread: number
}

const KIND_TONE: Record<string, { bg: string; text: string; icon: string }> = {
  order_status: { bg: 'bg-primary/10', text: 'text-primary', icon: 'local_shipping' },
  review: { bg: 'bg-warning/15', text: 'text-warning', icon: 'star' },
  payout: { bg: 'bg-success/10', text: 'text-success', icon: 'payments' },
  message: { bg: 'bg-info/10', text: 'text-info', icon: 'forum' },
  vendor_drop: { bg: 'bg-tertiary/10', text: 'text-info', icon: 'storefront' },
  promo: { bg: 'bg-tertiary/10', text: 'text-info', icon: 'campaign' },
  welcome: { bg: 'bg-info/10', text: 'text-info', icon: 'celebration' },
  system_message: { bg: 'bg-info/10', text: 'text-info', icon: 'notifications' },
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  function relativeTime(iso: string): string {
    const ts = new Date(iso).getTime()
    if (!Number.isFinite(ts)) return ''
    const diffMs = Date.now() - ts
    const minutes = Math.round(diffMs / 60_000)
    if (minutes < 1) return t('notifications.time.justNow', {}, { defaultValue: 'just now' })
    if (minutes < 60)
      return t(
        'notifications.time.minutesAgo',
        { count: minutes },
        { defaultValue: '{{count}} min ago' },
      )
    const hours = Math.round(minutes / 60)
    if (hours < 24)
      return hours === 1
        ? t('notifications.time.hourAgo', {}, { defaultValue: '1 hour ago' })
        : t(
            'notifications.time.hoursAgo',
            { count: hours },
            { defaultValue: '{{count}} hours ago' },
          )
    const days = Math.round(hours / 24)
    if (days === 1) return t('notifications.time.yesterday', {}, { defaultValue: 'Yesterday' })
    if (days < 7)
      return t(
        'notifications.time.daysAgo',
        { count: days },
        { defaultValue: '{{count}} days ago' },
      )
    return new Date(ts).toLocaleDateString()
  }

  const [items, setItems] = useState<ApiNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await http.get<ApiNotificationsResponse | { data?: ApiNotificationsResponse }>(
        '/api/notifications',
      )
      const raw = (res as { data?: unknown })?.data ?? res
      const body = (
        raw &&
        typeof raw === 'object' &&
        'data' in (raw as Record<string, unknown>) &&
        Array.isArray((raw as { data?: unknown }).data) === false &&
        (raw as { data?: ApiNotificationsResponse }).data?.data !== undefined
          ? (raw as { data?: ApiNotificationsResponse }).data
          : (raw as ApiNotificationsResponse)
      ) as ApiNotificationsResponse | undefined
      const data = body && Array.isArray(body.data) ? body : { data: [], total: 0, unread: 0 }
      setItems(data.data ?? [])
      setUnreadCount(data.unread ?? data.data.filter((n) => n.unread).length)
      setError(null)
    } catch (error) {
      logError('notifications.refresh', error)
      setError(
        t('nav.couldNotLoadNotifications', {}, { defaultValue: 'Could not load notifications.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function markAllRead() {
    setBusy(true)
    setError(null)
    try {
      await http.post('/api/notifications/read-all', {})
      await refresh()
    } catch (error) {
      logError('notifications.markAllRead', error)
      setError(t('notifications.markAllError', {}, { defaultValue: 'Could not mark all read.' }))
    } finally {
      setBusy(false)
    }
  }

  async function markRead(id: string) {
    setBusy(true)
    try {
      await http.post(`/api/notifications/${encodeURIComponent(id)}/read`, {})
      await refresh()
    } catch (_error) {
      // best-effort: read-marking is non-critical; UI will resync on next refresh
    } finally {
      setBusy(false)
    }
  }

  async function removeOne(id: string) {
    setBusy(true)
    try {
      await http.delete(`/api/notifications/${encodeURIComponent(id)}`)
      await refresh()
    } catch (_error) {
      // best-effort: deletion is non-critical; UI will resync on next refresh
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      data-testid="notifications-page"
      className={cm.cn(cm.maxW('full'), cm.mxAuto, cm.sp('p', 8), 'max-w-[1100px] space-y-8')}
    >
      <div
        className={cm.cn(cm.flex({ justify: 'between', align: 'center', wrap: 'wrap', gap: 'md' }))}
      >
        <div className={cm.cn(cm.stack(2))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-orange-700 dark:text-primary',
            )}
          >
            {t('nav.activity', {}, { defaultValue: 'Activity' })}
          </p>
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-4xl tracking-tight font-extrabold text-on-surface',
            )}
          >
            {t(
              'notifications.title',
              { count: unreadCount },
              { defaultValue: 'Notifications · {{count}} new' },
            )}
          </h1>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={busy || unreadCount === 0}
          data-testid="notifications-mark-all"
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.roundedFull,
            'border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className={cm.cn(
            cm.textSize('sm'),
            'rounded-xl border border-error/30 bg-error/10 px-4 py-2 text-error',
          )}
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-on-surface-variant">
          {t('nav.loadingNotifications', {}, { defaultValue: 'Loading notifications…' })}
        </p>
      ) : items.length === 0 ? (
        <div
          data-testid="notifications-empty"
          className={cm.cn(
            cm.sp('p', 10),
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            'rounded-3xl border border-dashed border-outline-variant text-center',
          )}
        >
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: '48px' }}
            aria-hidden
          >
            inbox
          </span>
          <p className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 4), 'text-on-surface text-lg')}>
            {t('notifications.empty.title', {}, { defaultValue: 'You’re all caught up' })}
          </p>
          <p className={cm.cn(cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'notifications.empty.body',
              {},
              { defaultValue: 'New shop drops, payouts, and order updates land here.' },
            )}
          </p>
        </div>
      ) : (
        <ul className={cm.cn(cm.stack(3))}>
          {items.map((row) => {
            const tone = KIND_TONE[row.type] ?? KIND_TONE.system_message
            return (
              <li key={row.id}>
                <article
                  data-testid="notification-row"
                  data-notification-id={row.id}
                  data-unread={row.unread ? 'true' : 'false'}
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 'md' }),
                    cm.sp('p', 5),
                    'rounded-2xl border border-outline-variant bg-surface relative',
                    row.unread && 'bg-primary/5 border-primary/20',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-12 w-12 rounded-2xl shrink-0',
                      tone.bg,
                      tone.text,
                    )}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      aria-hidden
                    >
                      {tone.icon}
                    </span>
                  </div>
                  <div className={'min-w-0 flex-1'}>
                    {row.href ? (
                      <Link
                        to={row.href}
                        onClick={() => row.unread && void markRead(row.id)}
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          'text-on-surface hover:text-primary block',
                        )}
                      >
                        {row.title}
                      </Link>
                    ) : (
                      <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>{row.title}</p>
                    )}
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant leading-relaxed',
                      )}
                    >
                      {row.body}
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mt', 1),
                        'text-on-surface-variant',
                      )}
                    >
                      {relativeTime(row.created_at)}
                    </p>
                  </div>
                  <div className={cm.cn(cm.flex({ direction: 'col', align: 'end', gap: 'xs' }))}>
                    {row.unread ? (
                      <button
                        type="button"
                        onClick={() => void markRead(row.id)}
                        className={cm.cn(cm.textSize('xs'), 'text-primary hover:underline')}
                        data-testid="notification-mark-read"
                      >
                        {t('common.markRead', {}, { defaultValue: 'Mark read' })}
                      </button>
                    ) : (
                      <span
                        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
                        data-testid="notification-read-flag"
                      >
                        {t('notifications.read', {}, { defaultValue: 'Read' })}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void removeOne(row.id)}
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant hover:text-error',
                      )}
                      data-testid="notification-remove"
                    >
                      {t('notifications.dismiss', {}, { defaultValue: 'Dismiss' })}
                    </button>
                  </div>
                  {row.unread && (
                    <span
                      className={'absolute right-5 top-5 h-2.5 w-2.5 rounded-full bg-primary'}
                      aria-label={t('status.unread', {}, { defaultValue: 'Unread' })}
                    />
                  )}
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default Notifications
