import { useEffect, useState } from 'react'

import { type FeedItem, NotificationFeed } from '@molecule/app-notification-feed-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-react'

import { unwrapList } from '../lib/unwrap.js'

type NotifType =
  'pipeline_passed' | 'pipeline_failed' | 'deploy_complete' | 'mention' | 'review_request'

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
  pipeline_passed: 'check_circle',
  pipeline_failed: 'cancel',
  deploy_complete: 'cloud_upload',
  mention: 'alternate_email',
  review_request: 'rate_review',
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/notifications')
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

  const unreadCount = notifs.filter((n) => n.unread).length

  const markAllRead = async () => {
    setMarking(true)
    try {
      await http.post('/api/notifications/read-all', {})
      setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })))
    } catch (_error) {
      // mark-all failed — surfaced to the user via setError below; raw error not needed here
      setError(
        t('notifications.markError', {}, { defaultValue: 'Failed to mark notifications as read.' }),
      )
    } finally {
      setMarking(false)
    }
  }

  const items: FeedItem[] = notifs.map((n) => ({
    id: n.id,
    icon: TYPE_ICON[n.type],
    title: n.title,
    body: n.body,
    createdAt: n.created_at,
    href: n.href,
    unread: n.unread,
  }))

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <Flex align="center" justify="between" className={cm.sp('mb', 6)}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            loading={marking}
            data-testid="mark-all-read"
          >
            {t(
              'common.markAllAsRead',
              { count: unreadCount },
              { defaultValue: 'Mark all as read' },
            )}
          </Button>
        )}
      </Flex>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : items.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('nav.noNewNotifications', {}, { defaultValue: 'No new notifications.' })}
        </p>
      ) : (
        <div className="max-w-3xl">
          <NotificationFeed
            items={items}
            ariaLabel={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          />
        </div>
      )}
    </div>
  )
}
