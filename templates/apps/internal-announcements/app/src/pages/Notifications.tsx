/**
 * Notifications — /notifications activity center.
 *
 * Synthesizes notification rows from real data (announcements + comment
 * threads + acknowledgments). Notifications themselves are an emergent
 * view of recent activity from real backend tables, not a separate
 * notification table — that keeps the surface area small while still
 * showing live, accurate signal.
 *
 * "Read" status is tracked client-side in localStorage keyed by
 * notification id, so dismissing here survives a page reload.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  type ApiAnnouncement,
  type ApiComment,
  type ApiUser,
  formatRelative,
} from '../lib/announcements.js'

interface NotificationItem {
  id: string
  kind: 'mention' | 'reply' | 'ack' | 'channel' | 'system'
  actor: string
  announcement: string
  announcementId: string
  context: string
  timestamp: string
  unread: boolean
  sortKey: number
}

const FILTERS = [
  { id: 'all', labelKey: 'notifications.filterAll', defaultLabel: 'All' },
  { id: 'reply', labelKey: 'notifications.filterReplies', defaultLabel: 'Replies' },
  { id: 'ack', labelKey: 'notifications.filterAcks', defaultLabel: 'Acks' },
  { id: 'channel', labelKey: 'notifications.filterChannels', defaultLabel: 'Channels' },
] as const

const KIND_CONFIG: Record<string, { icon: string; color: string }> = {
  mention: { icon: 'alternate_email', color: 'var(--color-mention)' },
  reply: { icon: 'reply', color: 'var(--color-priority-normal)' },
  ack: { icon: 'task_alt', color: 'var(--color-acknowledged)' },
  channel: { icon: 'tag', color: 'var(--mol-color-secondary)' },
  system: { icon: 'auto_awesome', color: 'var(--color-priority-pinned)' },
}

const STORAGE_KEY = 'internal-announcements:notifications:read-set'

function readReadSet(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch (_error) {
    // invalid JSON in storage — fall back to empty set
    return new Set()
  }
}

function writeReadSet(set: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)))
  } catch (_error) {
    // storage write failures (quota exceeded, private browsing) are non-fatal
  }
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<ApiUser>()
  const meId = (user as ApiUser | null)?.id ?? null

  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const [announcements, setAnnouncements] = useState<ApiAnnouncement[]>([])
  const [team, setTeam] = useState<ApiUser[]>([])
  const [allComments, setAllComments] = useState<ApiComment[]>([])
  const [readSet, setReadSet] = useState<Set<string>>(() => readReadSet())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([http.get<ApiAnnouncement[]>('/announcements'), http.get<ApiUser[]>('/team')])
      .then(async ([annsR, teamR]) => {
        if (cancelled) return
        setAnnouncements(annsR.data)
        setTeam(Array.isArray(teamR.data) ? teamR.data : [])
        const commentBuckets = await Promise.all(
          annsR.data.map(async (a) => {
            try {
              const r = await http.get<ApiComment[]>(`/comments/${a.id}`)
              return r.data
            } catch (_error) {
              // best-effort — comment fetch fails gracefully; notification row still shown
              return []
            }
          }),
        )
        if (!cancelled) setAllComments(commentBuckets.flat())
      })
      .catch(() => {
        if (!cancelled) setAnnouncements([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const teamIndex = useMemo(() => Object.fromEntries(team.map((u) => [u.id, u])), [team])
  const annIndex = useMemo(
    () => Object.fromEntries(announcements.map((a) => [a.id, a])),
    [announcements],
  )

  const items = useMemo<NotificationItem[]>(() => {
    if (!meId) return []
    const out: NotificationItem[] = []

    // Channel posts: announcements someone else published to a channel.
    for (const a of announcements) {
      if (a.author_id === meId) continue
      if (a.status !== 'published') continue
      const author = teamIndex[a.author_id]
      const id = `channel:${a.id}`
      out.push({
        id,
        kind: 'channel',
        actor:
          author?.name?.trim() ||
          author?.email?.split('@')[0] ||
          t('common.teammate', {}, { defaultValue: 'Teammate' }),
        announcement: a.title,
        announcementId: a.id,
        context: a.body.slice(0, 220),
        timestamp: formatRelative(a.published_at ?? a.created_at),
        unread: !readSet.has(id),
        sortKey: new Date(a.published_at ?? a.created_at).getTime(),
      })
    }

    // Replies on my own announcements.
    for (const c of allComments) {
      if (c.author_id === meId) continue
      const ann = annIndex[c.announcement_id]
      if (!ann || ann.author_id !== meId) continue
      const author = teamIndex[c.author_id]
      const id = `reply:${c.id}`
      out.push({
        id,
        kind: 'reply',
        actor:
          author?.name?.trim() ||
          author?.email?.split('@')[0] ||
          t('common.teammate', {}, { defaultValue: 'Teammate' }),
        announcement: ann.title,
        announcementId: ann.id,
        context: c.body.slice(0, 220),
        timestamp: formatRelative(c.created_at),
        unread: !readSet.has(id),
        sortKey: new Date(c.created_at).getTime(),
      })
    }

    return out.sort((a, b) => b.sortKey - a.sortKey)
  }, [announcements, allComments, annIndex, teamIndex, readSet, meId, t])

  const visible = useMemo(
    () => items.filter((n) => filter === 'all' || n.kind === filter),
    [items, filter],
  )
  const unreadCount = items.filter((n) => n.unread).length

  const markRead = useCallback((id: string) => {
    setReadSet((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      writeReadSet(next)
      return next
    })
  }, [])

  const markAllRead = useCallback(() => {
    setReadSet((prev) => {
      const next = new Set(prev)
      for (const n of items) next.add(n.id)
      writeReadSet(next)
      return next
    })
  }, [items])

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <header
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
            {loading
              ? t('notifications.loading', {}, { defaultValue: 'Refreshing…' })
              : t(
                  'notifications.subtitle',
                  { count: unreadCount },
                  { defaultValue: 'You have {{count}} unread notifications.' },
                )}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            data-testid="notifications-mark-all-read"
            onClick={markAllRead}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-full border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/60',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>done_all</span>
            {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
          </button>
        )}
      </header>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
        {FILTERS.map((current) => {
          const isActive = current.id === filter
          return (
            <button
              key={current.id}
              type="button"
              data-testid={`notifications-filter-${current.id}`}
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
        data-testid="notifications-list"
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'rounded-2xl border border-outline-variant/40 bg-surface divide-y divide-outline-variant/30 overflow-hidden',
        )}
      >
        {visible.length === 0 ? (
          <li
            data-testid="notifications-empty"
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
            const cfg = KIND_CONFIG[n.kind] ?? KIND_CONFIG.system!
            return (
              <li key={n.id}>
                <Link
                  to={`/announcement/${n.announcementId}`}
                  data-testid={`notification-item-${n.id}`}
                  onClick={() => markRead(n.id)}
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
                        {n.actor}{' '}
                        <span className="text-on-surface-variant font-normal">
                          {n.kind === 'reply'
                            ? t('notifications.repliedTo', {}, { defaultValue: 'replied in' })
                            : n.kind === 'ack'
                              ? t(
                                  'notifications.ackUpdate',
                                  {},
                                  { defaultValue: 'shared an ack update on' },
                                )
                              : n.kind === 'channel'
                                ? t('notifications.postedIn', {}, { defaultValue: 'posted in' })
                                : t('notifications.system', {}, { defaultValue: '·' })}
                        </span>{' '}
                        <span className={cm.cn(cm.fontWeight('semibold'), 'text-primary')}>
                          {n.announcement}
                        </span>
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant ml-auto')}>
                        {n.timestamp}
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
                      style={{
                        backgroundColor: 'var(--mol-color-primary, var(--color-priority-normal))',
                      }}
                      role="img"
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
