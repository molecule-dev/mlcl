import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import type { ActivityKind } from '../components/ActivityFeedItem.js'
import { ActivityFeedItem } from '../components/ActivityFeedItem.js'
import { DesignCanvasLayout } from '../components/DesignCanvasLayout.js'

interface NotificationRow {
  id: string
  kind: string
  actor_name: string | null
  actor_color: string | null
  sentence: string | null
  target_label: string | null
  target_href: string | null
  preview: string | null
  bucket: 'today' | 'week' | 'older' | string
  unread: boolean
  created_at: string | null
}

const FILTERS = [
  { id: 'all', label: 'All', icon: 'inbox' },
  { id: 'unread', label: 'Unread', icon: 'mark_email_unread' },
  { id: 'mentions', label: 'Mentions', icon: 'alternate_email' },
  { id: 'comments', label: 'Comments', icon: 'forum' },
  { id: 'invites', label: 'Invites', icon: 'group_add' },
] as const

type FilterId = (typeof FILTERS)[number]['id']

function relativeTime(iso: string | null): string {
  if (!iso) return 'just now'
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return 'just now'
  const min = Math.max(1, Math.round(ms / 60_000))
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const d = Math.round(hr / 24)
  return `${d} days ago`
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [filter, setFilter] = useState<FilterId>('all')
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)

  const load = () => {
    setLoading(true)
    http
      .get('/api/notifications')
      .then((resp) => {
        const data = ((resp as { data?: unknown }).data ?? []) as NotificationRow[]
        setItems(data)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const markAllRead = async () => {
    setMarking(true)
    try {
      await http.patch('/api/notifications/read-all', {})
      load()
    } finally {
      setMarking(false)
    }
  }

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (filter === 'all') return true
      if (filter === 'unread') return n.unread
      if (filter === 'mentions') return n.kind === 'mention'
      if (filter === 'comments') return n.kind === 'comment'
      if (filter === 'invites') return n.kind === 'invite'
      return true
    })
  }, [items, filter])

  const buckets: Array<{ id: 'today' | 'week' | 'older'; label: string }> = [
    { id: 'today', label: t('status.today', {}, { defaultValue: 'Today' })! },
    { id: 'week', label: t('status.thisWeek', {}, { defaultValue: 'This week' })! },
    { id: 'older', label: t('notifications.older', {}, { defaultValue: 'Older' })! },
  ]

  return (
    <DesignCanvasLayout
      eyebrow={t('notifications.eyebrow', {}, { defaultValue: 'Workspace inbox' })}
      title={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
      actions={
        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={marking}
          data-mol-id="notifications-mark-all-read"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            cm.flex({ align: 'center', gap: 'xs' }),
            'bg-surface-container text-on-surface rounded-xl border border-outline-variant/40 hover:bg-surface-container-high transition-colors disabled:opacity-60',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>done_all</span>
          {marking
            ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
            : t('common.markAllAsRead', {}, { defaultValue: 'Mark all as read' })}
        </button>
      }
    >
      <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }))}>
        <aside className={cm.cn('col-span-3', cm.stack(1), 'sticky top-24 self-start')}>
          {FILTERS.map((f) => {
            const active = f.id === filter
            const count =
              f.id === 'all'
                ? items.length
                : f.id === 'unread'
                  ? items.filter((n) => n.unread).length
                  : f.id === 'mentions'
                    ? items.filter((n) => n.kind === 'mention').length
                    : f.id === 'comments'
                      ? items.filter((n) => n.kind === 'comment').length
                      : items.filter((n) => n.kind === 'invite').length
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                data-mol-id={`notifications-filter-${f.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  active
                    ? 'bg-primary-fixed/40 text-on-primary-container border-l-4 border-primary rounded-r-lg'
                    : 'text-on-surface-variant hover:bg-surface-container/60 rounded-lg transition-colors',
                )}
              >
                <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                    {f.icon}
                  </span>
                  {t(`notifications.filter.${f.id}`, {}, { defaultValue: f.label })}
                </span>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.fontWeight('bold'),
                    'rounded-full text-[10px] uppercase tracking-widest bg-surface-container text-on-surface-variant',
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </aside>

        <section className={cm.cn('col-span-9', cm.stack(8))} data-mol-id="notifications-list">
          {loading ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('notifications.loading', {}, { defaultValue: 'Loading inbox…' })}
            </p>
          ) : filtered.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('p', 12),
                cm.textCenter,
                cm.stack(3),
                'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40 text-on-surface-variant',
              )}
              data-mol-id="notifications-empty"
            >
              <span className={cm.cn('material-symbols-outlined text-[40px] text-primary')}>
                inbox
              </span>
              <p className={cm.cn(cm.fontWeight('semibold'))}>
                {t('notifications.empty.title', {}, { defaultValue: 'You’re all caught up' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'))}>
                {t(
                  'notifications.empty.body',
                  {},
                  { defaultValue: 'New mentions, invites, and comments will land here.' },
                )}
              </p>
            </div>
          ) : (
            buckets.map((bucket) => {
              const inBucket = filtered.filter((n) => n.bucket === bucket.id)
              if (inBucket.length === 0) return null
              return (
                <div key={bucket.id} className={cm.cn(cm.stack(3))}>
                  <h2
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {bucket.label}
                  </h2>
                  <div className={cm.cn(cm.stack(2))}>
                    {inBucket.map((item) => (
                      <ActivityFeedItem
                        key={item.id}
                        item={{
                          id: item.id,
                          kind: (item.kind as ActivityKind) ?? 'comment',
                          actorName: item.actor_name ?? APP_NAME,
                          actorColor: item.actor_color ?? '#7c3aed',
                          sentence: item.sentence ?? '',
                          target: item.target_label ?? undefined,
                          targetHref: item.target_href ?? undefined,
                          preview: item.preview ?? undefined,
                          timeLabel: relativeTime(item.created_at),
                          unread: item.unread,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </section>
      </div>
    </DesignCanvasLayout>
  )
}

export default Notifications
