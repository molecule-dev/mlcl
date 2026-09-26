/**
 * Notifications — /notifications activity feed for replies + mentions
 * derived from posts/replies the actor authored.
 *
 * Data: `GET /api/notifications` returns `{ items, unreadCount,
 * lastSeenAt }`. `POST /api/notifications/mark-all-read` resets the
 * unread bar.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatRelativeTime } from '../utils/threads.js'

const FILTERS = [
  { id: 'all', labelKey: 'notifications.filterAll', defaultLabel: 'All' },
  { id: 'mentions', labelKey: 'notifications.filterMentions', defaultLabel: 'Mentions' },
  { id: 'replies', labelKey: 'notifications.filterReplies', defaultLabel: 'Replies' },
] as const

type FilterId = (typeof FILTERS)[number]['id']

type NotificationKind = 'reply' | 'mention'

interface ApiNotification {
  id: string
  kind: NotificationKind
  actor: string
  actorId: string
  thread: string
  threadId: string
  context: string
  timestamp: string
  unread: boolean
}

const KIND_CONFIG: Record<NotificationKind, { icon: string; color: string }> = {
  reply: { icon: 'reply', color: 'var(--color-pinned, var(--mol-color-primary))' },
  mention: { icon: 'alternate_email', color: 'var(--color-moderator)' },
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [filter, setFilter] = useState<FilterId>('all')
  const [items, setItems] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const http = getHttpClient()
      const res = await http.get<{ items: ApiNotification[] }>('/api/notifications')
      setItems(res.data.items ?? [])
    } catch (error) {
      logError('notifications.load', error)
      setError(t('notifications.loadError', {}, { defaultValue: 'Could not load notifications.' }))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const handleMarkAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })))
    try {
      const http = getHttpClient()
      await http.post('/api/notifications/mark-all-read', {})
    } catch (error) {
      logError('notifications.markAllRead', error)
      void load()
    }
  }, [load])

  const visible = useMemo(
    () =>
      items.filter((n) => {
        if (filter === 'all') return true
        if (filter === 'mentions') return n.kind === 'mention'
        if (filter === 'replies') return n.kind === 'reply'
        return true
      }),
    [items, filter],
  )
  const unreadCount = items.filter((n) => n.unread).length

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-primary',
            )}
          >
            {t('nav.inbox', {}, { defaultValue: 'Inbox' })}
          </span>
          <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'notifications.subtitle',
              { count: unreadCount },
              { defaultValue: 'You have {{count}} unread notifications.' },
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-full border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/60',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>done_all</span>
            {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
          </button>
        )}
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
        {FILTERS.map((current) => {
          const isActive = current.id === filter
          return (
            <button
              key={current.id}
              type="button"
              onClick={() => setFilter(current.id)}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-full transition-colors',
                isActive
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/60',
              )}
            >
              {t(current.labelKey, {}, { defaultValue: current.defaultLabel })}
            </button>
          )
        })}
      </div>

      <ul
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'rounded-xl border border-outline-variant/40 bg-surface divide-y divide-outline-variant/30',
        )}
      >
        {loading ? (
          <li
            className={cm.cn(
              cm.textSize('sm'),
              cm.textCenter,
              cm.sp('py', 12),
              'text-on-surface-variant',
            )}
          >
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </li>
        ) : error ? (
          <li className={cm.cn(cm.textSize('sm'), cm.textCenter, cm.sp('py', 12), 'text-error')}>
            {error}
          </li>
        ) : visible.length === 0 ? (
          <li
            className={cm.cn(
              cm.textSize('sm'),
              cm.textCenter,
              cm.sp('py', 12),
              'text-on-surface-variant',
            )}
          >
            {t(
              'notifications.empty',
              {},
              { defaultValue: 'Nothing new here. Quiet rooms are good rooms.' },
            )}
          </li>
        ) : (
          visible.map((n) => {
            const cfg = KIND_CONFIG[n.kind]
            return (
              <li key={n.id}>
                <Link
                  to={`/thread/${n.threadId}`}
                  onClick={() =>
                    setItems((prev) =>
                      prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)),
                    )
                  }
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 'md' }),
                    cm.sp('p', 4),
                    'transition-colors hover:bg-surface-container-low/40',
                    n.unread ? 'bg-primary-container/10' : '',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(10),
                      cm.h(10),
                      cm.roundedFull,
                      'shrink-0',
                    )}
                    style={{ backgroundColor: `${cfg.color}1f`, color: cfg.color }}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-lg')}>{cfg.icon}</span>
                  </span>
                  <div
                    className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}
                  >
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
                      <span
                        className={cm.cn(
                          cm.fontWeight('semibold'),
                          cm.textSize('sm'),
                          'text-on-surface',
                        )}
                      >
                        <span style={{ color: 'var(--color-primary, var(--color-pinned))' }}>
                          {t('threadView.userPrefix', {}, { defaultValue: 'u/' })}
                          {n.actor}
                        </span>{' '}
                        {n.kind === 'reply'
                          ? t('notifications.repliedTo', {}, { defaultValue: 'replied to' })
                          : t(
                              'notifications.mentionedYouIn',
                              {},
                              { defaultValue: 'mentioned you in' },
                            )}{' '}
                        <span className="text-on-surface-variant font-normal">{n.thread}</span>
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant ml-auto')}>
                        {formatRelativeTime(n.timestamp)}
                      </span>
                    </div>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant leading-relaxed line-clamp-2',
                      )}
                    >
                      {n.context}
                    </p>
                  </div>
                  {n.unread && (
                    <span
                      className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'shrink-0 mt-2')}
                      style={{ backgroundColor: 'var(--color-primary, var(--color-pinned))' }}
                      aria-label={t('status.unread', {}, { defaultValue: 'Unread' })}
                    />
                  )}
                </Link>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}

export default Notifications
