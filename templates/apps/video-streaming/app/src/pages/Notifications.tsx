import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

type NotificationKind = 'upload' | 'comment' | 'reply' | 'mention' | 'milestone' | 'live'

interface NotificationRow {
  id: string
  kind: NotificationKind
  channel_name: string
  channel_avatar_index: number
  body: string
  context?: string
  link: string
  created_at: string
  read: boolean
}

const SAMPLE_NOTIFICATIONS: NotificationRow[] = [
  {
    id: 'n-1',
    kind: 'upload',
    channel_name: 'Northern Field Studio',
    channel_avatar_index: 0,
    body: 'New video — How a film label fell in love with reels again',
    context: '24 minutes',
    link: '/watch/v-1',
    created_at: new Date(Date.now() - 24 * 60000).toISOString(),
    read: false,
  },
  {
    id: 'n-2',
    kind: 'live',
    channel_name: 'Resonant Labs',
    channel_avatar_index: 4,
    body: 'Live now — Building a synth in 60 minutes',
    context: 'Started 12 minutes ago',
    link: '/watch/v-5',
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
    read: false,
  },
  {
    id: 'n-3',
    kind: 'comment',
    channel_name: 'Mira C.',
    channel_avatar_index: 1,
    body: 'replied to your comment on "The last analogue cinema in Lisbon"',
    context: '"Yes — the projection room scene at 13:02 is the one."',
    link: '/watch/v-4',
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    read: false,
  },
  {
    id: 'n-4',
    kind: 'milestone',
    channel_name: 'Spool',
    channel_avatar_index: 2,
    body: 'Your channel just passed 10K subscribers — congrats!',
    link: '/studio',
    created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
    read: true,
  },
  {
    id: 'n-5',
    kind: 'mention',
    channel_name: 'Lina Reyes',
    channel_avatar_index: 1,
    body: 'mentioned you in a comment on "I built a 1M-viewer channel from a closet"',
    context: '"@you — your archive video is the one that got me started."',
    link: '/watch/v-2',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    read: true,
  },
  {
    id: 'n-6',
    kind: 'upload',
    channel_name: 'Slow Spoon',
    channel_avatar_index: 2,
    body: 'New video — Late-night ambient cooking — chickpea three ways',
    link: '/watch/v-3',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    read: true,
  },
]

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #f43f5e 0%, #be185d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #c2410c 100%)',
  'linear-gradient(135deg, #10b981 0%, #047857 100%)',
]

const KIND_ICON: Record<NotificationKind, string> = {
  upload: 'video_library',
  comment: 'chat_bubble',
  reply: 'reply',
  mention: 'alternate_email',
  milestone: 'celebration',
  live: 'sensors',
}

const KIND_TINT: Record<NotificationKind, string> = {
  upload: 'text-primary',
  comment: 'text-violet-500',
  reply: 'text-cyan-500',
  mention: 'text-warning',
  milestone: 'text-success',
  live: 'text-error',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days}d ago`
  const hours = Math.floor(diff / 3600000)
  if (hours > 0) return `${hours}h ago`
  const mins = Math.floor(diff / 60000)
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

const FILTERS = ['all', 'unread', 'mentions'] as const
type Filter = (typeof FILTERS)[number]

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationRow[]>(SAMPLE_NOTIFICATIONS)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/notifications')
      .then((res) => {
        if (cancelled) return
        const raw = unwrapList<Partial<NotificationRow> & Record<string, unknown>>(res)
        const apiItems = raw
          .filter(
            (n) =>
              n &&
              (typeof n.link === 'string' ||
                typeof (n as Record<string, unknown>).target_id === 'string'),
          )
          .map((n): NotificationRow => ({
            id: String(n.id ?? ''),
            kind: KIND_ICON[n.kind as NotificationKind] ? (n.kind as NotificationKind) : 'upload',
            channel_name: String(n.channel_name ?? ''),
            channel_avatar_index:
              typeof n.channel_avatar_index === 'number' ? n.channel_avatar_index : 0,
            body: String(n.body ?? n.title ?? ''),
            context: typeof n.context === 'string' ? n.context : undefined,
            link: String(n.link ?? ''),
            created_at: String(n.created_at ?? new Date().toISOString()),
            // The notifications table stores `read_at` (timestamp); the UI
            // model uses a boolean `read`. A non-null timestamp means it was
            // read by the user.
            read: !!(n.read ?? (n as Record<string, unknown>).read_at),
          }))
        if (apiItems.length > 0) setItems(apiItems)
      })
      .catch(() => {
        /* sample fallback */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const handleMarkAllRead = async () => {
    const previous = items
    setItems(items.map((i) => ({ ...i, read: true })))
    try {
      await http.post('/api/notifications/read-all', {})
    } catch (_error) {
      // Rollback optimistic update on failure.
      setItems(previous)
    }
  }

  const handleNotificationClick = async (n: NotificationRow) => {
    if (n.read) return
    setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, read: true } : p)))
    try {
      await http.post(`/api/notifications/${n.id}/read`, {})
    } catch (_error) {
      // Leave the optimistic update in place even on failure — clicking the
      // link is the primary intent; missing the read-mark roundtrip is fine.
    }
  }

  const filtered =
    filter === 'all'
      ? items
      : filter === 'unread'
        ? items.filter((i) => !i.read)
        : items.filter((i) => i.kind === 'mention' || i.kind === 'reply')
  const unreadCount = items.filter((i) => !i.read).length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-8')}>
      <header className={cm.cn('space-y-2')}>
        <p className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
          {t('nav.activityFeed', {}, { defaultValue: 'Activity feed' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]')}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        <p className={cm.cn('text-base text-on-surface-variant')}>
          {t(
            'notifications.subheading',
            { count: unreadCount },
            { defaultValue: '{{count}} unread · uploads, comments, mentions, milestones.' },
          )}
        </p>
      </header>

      <nav
        aria-label={t('notifications.filterLabel', {}, { defaultValue: 'Filter notifications' })}
        className={cm.flex({ gap: 'xs', align: 'center' })}
      >
        {FILTERS.map((f) => {
          const active = filter === f
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cm.cn(
                'px-4 py-2 rounded-full text-sm font-bold transition-colors',
                active
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant hover:text-on-surface',
              )}
              aria-pressed={active}
            >
              {t(
                `notifications.filter.${f}`,
                {},
                { defaultValue: f.charAt(0).toUpperCase() + f.slice(1) },
              )}
            </button>
          )
        })}
        <div className={cm.cn('ml-auto')}>
          <button
            type="button"
            onClick={handleMarkAllRead}
            className={cm.cn(
              'px-3 h-9 rounded-full text-xs font-bold uppercase tracking-widest bg-surface-container-lowest border border-outline-variant hover:bg-surface-container transition-colors',
            )}
          >
            {t('notifications.markAllRead', {}, { defaultValue: 'Mark all read' })}
          </button>
        </div>
      </nav>

      <ul
        className={cm.cn(
          'rounded-2xl bg-surface-container-lowest divide-y divide-outline-variant/40 overflow-hidden',
        )}
      >
        {filtered.length === 0 ? (
          <li className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant text-sm')}>
            {t('notifications.empty', {}, { defaultValue: 'You\u2019re all caught up.' })}
          </li>
        ) : (
          filtered.map((n) => {
            const grad = AVATAR_GRADIENTS[n.channel_avatar_index % AVATAR_GRADIENTS.length]
            return (
              <li key={n.id}>
                <Link
                  to={n.link || '#'}
                  onClick={() => handleNotificationClick(n)}
                  className={cm.cn(
                    'flex items-start gap-4 px-5 py-4 transition-colors hover:bg-surface-container',
                    !n.read && 'bg-primary/5',
                  )}
                >
                  <div className={cm.cn('relative shrink-0')}>
                    <div
                      className={cm.cn(
                        'w-12 h-12 rounded-full flex items-center justify-center shadow',
                      )}
                      style={{ background: grad }}
                      aria-hidden="true"
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[24px] text-white/85')}
                      >
                        person
                      </span>
                    </div>
                    <span
                      className={cm.cn(
                        'absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-surface-container-lowest border-2 border-surface-container-lowest shadow flex items-center justify-center',
                        KIND_TINT[n.kind],
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[16px]')}
                        aria-hidden="true"
                      >
                        {KIND_ICON[n.kind]}
                      </span>
                    </span>
                  </div>
                  <div className={cm.cn('flex-1 min-w-0')}>
                    <p className={cm.cn('text-sm leading-snug')}>
                      <span className={cm.cn('font-bold')}>{n.channel_name}</span> {n.body}
                    </p>
                    {n.context && (
                      <p
                        className={cm.cn(
                          'mt-1 text-xs text-on-surface-variant italic line-clamp-2',
                        )}
                      >
                        {n.context}
                      </p>
                    )}
                    <div
                      className={cm.cn(
                        'mt-1 flex items-center gap-2 text-[11px] text-on-surface-variant',
                      )}
                    >
                      <span>{timeAgo(n.created_at)}</span>
                      {!n.read && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span
                            className={cm.cn('text-primary font-bold uppercase tracking-widest')}
                          >
                            {t('status.new', {}, { defaultValue: 'New' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {!n.read && (
                    <span
                      className={cm.cn('w-2 h-2 mt-2 rounded-full bg-primary shrink-0')}
                      aria-hidden="true"
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
