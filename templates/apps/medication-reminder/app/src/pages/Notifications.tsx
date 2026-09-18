import { useEffect, useState } from 'react'

import { type FeedItem, NotificationFeed } from '@molecule/app-notification-feed-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

type NotifKind =
  | 'dose_due'
  | 'dose_missed'
  | 'refill_warning'
  | 'caregiver_request'
  | 'achievement'
  | 'system_message'

interface NotificationRow {
  id: string
  /** Backend stores the discriminator as `kind` (see api/handlers/notifications.ts). */
  kind: NotifKind | string
  title: string
  body: string | null
  href?: string | null
  created_at: string
  /** Backend column is `read` (boolean) — UI renders the inverse. */
  read: boolean
}

const TYPE_ICON: Record<NotifKind, string> = {
  dose_due: 'alarm',
  dose_missed: 'warning',
  refill_warning: 'inventory_2',
  caregiver_request: 'group',
  achievement: 'emoji_events',
  system_message: 'info',
}

const iconForKind = (kind: string): string => TYPE_ICON[kind as NotifKind] ?? 'info'

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [notifs, setNotifs] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/notifications')
      .then((res) => {
        if (!cancelled) setNotifs(unwrapList<NotificationRow>(res))
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

  const unreadIds = notifs.filter((n) => !n.read).map((n) => n.id)
  const [marking, setMarking] = useState(false)

  const markAllRead = async () => {
    if (unreadIds.length === 0) return
    setMarking(true)
    setNotifs((curr) => curr.map((n) => ({ ...n, read: true })))
    try {
      await Promise.all(unreadIds.map((id) => http.post(`/api/notifications/${id}/read`, {})))
    } catch (_error) {
      /* optimistic — refresh-on-mount will reconcile if any actually failed */
    } finally {
      setMarking(false)
    }
  }

  const items: FeedItem[] = notifs.map((n) => ({
    id: n.id,
    icon: iconForKind(n.kind),
    title: n.title,
    body: n.body ?? '',
    createdAt: n.created_at,
    href: n.href,
    unread: !n.read,
  }))

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('mb', 6),
          'gap-4 flex-wrap',
        )}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('notifications.heading', {}, { defaultValue: 'Notifications' })}
        </h1>
        {unreadIds.length > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            disabled={marking}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md disabled:opacity-50',
            )}
          >
            {marking
              ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
              : t(
                  'notifications.markAllRead',
                  { count: unreadIds.length },
                  { defaultValue: 'Mark all read ({{count}})' },
                )}
          </button>
        )}
      </header>
      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : items.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('notifications.empty', {}, { defaultValue: 'No notifications.' })}
        </p>
      ) : (
        <div className="max-w-3xl">
          <NotificationFeed
            items={items}
            ariaLabel={t('notifications.heading', {}, { defaultValue: 'Notifications' })}
          />
        </div>
      )}
    </div>
  )
}
