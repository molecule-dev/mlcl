import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import SideNavBar from '../components/SideNavBar.js'
import TopNavBar from '../components/TopNavBar.js'

interface NotificationItem {
  id: string
  kind: 'comment' | 'reaction' | 'bookmark'
  body?: string
  type?: string
  resourceType?: string
  resourceId?: string
  createdAt?: string
}

function describe(n: NotificationItem, t: ReturnType<typeof useTranslation>['t']): string {
  switch (n.kind) {
    case 'comment':
      return t(
        'notifications.commentItem',
        { body: (n.body ?? '').slice(0, 80) },
        { defaultValue: 'New comment: {{body}}' },
      )
    case 'reaction':
      return t(
        'notifications.reactionItem',
        { type: n.type ?? 'reaction' },
        { defaultValue: 'New {{type}} reaction' },
      )
    case 'bookmark':
      return t('notifications.bookmarkItem', {}, { defaultValue: 'Someone bookmarked your post' })
    default:
      return ''
  }
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    http
      .get('/api/notifications')
      .then((res: unknown) => {
        if (!active) return
        const r = res as { data?: unknown } | unknown[] | null
        const body = r && typeof r === 'object' && 'data' in r ? (r as { data: unknown }).data : r
        const innerData =
          body && typeof body === 'object' && 'data' in body
            ? (body as { data: unknown }).data
            : body
        if (Array.isArray(innerData)) setItems(innerData as NotificationItem[])
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(
          err instanceof Error
            ? err.message
            : t('notifications.loadFailed', {}, { defaultValue: 'Failed to load notifications' }),
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [http, t])

  return (
    <>
      <SideNavBar />
      <TopNavBar />
      <main
        data-mol-id="page-notifications"
        className={cm.cn('max-w-3xl', cm.sp('px', 6), cm.sp('py', 8), 'ml-[240px] pt-24')}
      >
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        {loading ? (
          <p className={cm.textMuted}>{t('common.loading', {}, { defaultValue: 'Loading...' })}</p>
        ) : error ? (
          <p className={cm.textMuted} role="alert">
            {error}
          </p>
        ) : items.length === 0 ? (
          <p className={cm.textMuted}>
            {t('notifications.empty', {}, { defaultValue: "You're all caught up." })}
          </p>
        ) : (
          <ul className={cm.cn(cm.stack(2))}>
            {items.map((n) => (
              <li
                key={n.id}
                className={cm.cn(
                  cm.sp('p', 4),
                  'rounded-lg border border-outline-variant/15 bg-surface-container-low',
                )}
                data-notification-kind={n.kind}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    cm.textSize('sm'),
                  )}
                >
                  <span>{describe(n, t)}</span>
                  {n.createdAt ? (
                    <time className={cm.textMuted} dateTime={n.createdAt}>
                      {new Date(n.createdAt).toLocaleString()}
                    </time>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}

export default Notifications
