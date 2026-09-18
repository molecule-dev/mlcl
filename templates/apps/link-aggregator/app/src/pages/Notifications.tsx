import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CairnHeroCard } from '../components/CairnHeroCard.js'
import { timeAgo } from '../components/LinkPostCard.js'

interface Notification {
  id: string
  kind: 'reply' | 'mention' | 'vote' | 'milestone' | 'modmail'
  title: string
  body?: string
  link?: string
  unread: boolean
  created_at: string
}

const KIND_META: Record<
  Notification['kind'],
  { icon: string; color: string; labelKey: string; default: string }
> = {
  reply: {
    icon: 'forum',
    color: 'text-primary bg-primary/15',
    labelKey: 'reply',
    default: 'Reply',
  },
  mention: {
    icon: 'alternate_email',
    color: 'text-secondary bg-secondary/15',
    labelKey: 'mention',
    default: 'Mention',
  },
  vote: {
    icon: 'thumb_up',
    color: 'text-primary bg-primary/10',
    labelKey: 'vote',
    default: 'Vote',
  },
  milestone: {
    icon: 'local_fire_department',
    color: 'text-[color:var(--color-karma)] bg-[color:var(--color-karma)]/15',
    labelKey: 'milestone',
    default: 'Milestone',
  },
  modmail: {
    icon: 'shield',
    color: 'text-info bg-info/15',
    labelKey: 'modmail',
    default: 'Modmail',
  },
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    http
      .get<{ data?: unknown }>('/api/notifications')
      .then((res) => {
        if (!active) return
        const envelope = (res as { data?: unknown }).data
        const list =
          envelope && typeof envelope === 'object' && 'data' in envelope
            ? (envelope as { data: unknown }).data
            : envelope
        setNotifs(normalize(list, t))
      })
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof Error
            ? err.message
            : t(
                'nav.failedToLoadNotifications',
                {},
                { defaultValue: 'Failed to load notifications.' },
              ),
        )
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [http, t])

  const markRead = async (id: string) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)))
    try {
      await http.post(`/api/notifications/${id}/read`)
    } catch (_error) {
      // Optimistic — UI already reflects read state; server will sync on next load.
    }
  }

  const markAll = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })))
    try {
      await http.post('/api/notifications/read-all')
    } catch (_error) {
      // Optimistic — UI already reflects read state; server will sync on next load.
    }
  }

  const unreadCount = notifs.filter((n) => n.unread).length

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <CairnHeroCard
        eyebrowKey="eyebrow"
        eyebrowDefault={t('nav.inbox', {}, { defaultValue: 'Inbox' })}
        headlineKey="headline"
        headlineDefault={t(
          'notifications.heroHeadline',
          {},
          { defaultValue: 'Replies, mentions, and milestones.' },
        )}
        bodyKey="body"
        bodyDefault={t(
          'notifications.heroBody',
          {},
          {
            defaultValue:
              'A focused inbox for the conversations and karma moments worth coming back to.',
          },
        )}
        pillIcon="notifications_active"
        pillKey="pill"
        pillDefault={t(
          'common.countUnread',
          { count: unreadCount },
          { defaultValue: '{{count}} unread' },
        )}
        cta={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAll}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest bg-surface text-primary hover:bg-surface/90 transition-colors',
              )}
            >
              {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
            </button>
          ) : null
        }
      />

      <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        {loading && notifs.length === 0 ? (
          <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-on-surface-variant')}>
            {t('notifications.loading', {}, { defaultValue: 'Loading inbox\u2026' })}
          </p>
        ) : error ? (
          <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-error')} role="alert">
            {error}
          </p>
        ) : notifs.length === 0 ? (
          <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-on-surface-variant')}>
            {t('notifications.empty', {}, { defaultValue: 'You\u2019re all caught up.' })}
          </p>
        ) : (
          notifs.map((n) => {
            const meta = KIND_META[n.kind]
            return (
              <article
                key={n.id}
                className={cm.cn(
                  cm.flex({ gap: 'sm' }),
                  cm.sp('p', 4),
                  'rounded-2xl border transition-colors',
                  n.unread
                    ? 'bg-primary/5 border-primary/30'
                    : 'bg-surface-container-lowest border-outline-variant/30',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    'shrink-0',
                    meta.color,
                  )}
                  aria-label={t(
                    `notifications.${meta.labelKey}`,
                    {},
                    { defaultValue: meta.default },
                  )}
                >
                  <span className={'material-symbols-outlined text-xl'}>{meta.icon}</span>
                </span>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}>
                  <header
                    className={cm.cn(
                      cm.flex({ align: 'baseline', justify: 'between', gap: 'sm' }),
                      'flex-wrap',
                    )}
                  >
                    <h3
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        'text-on-surface',
                      )}
                    >
                      {n.title}
                    </h3>
                    <time
                      dateTime={n.created_at}
                      className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}
                    >
                      {timeAgo(n.created_at)}
                    </time>
                  </header>
                  {n.body && (
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant line-clamp-2')}>
                      {n.body}
                    </p>
                  )}
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    {n.link && (
                      <Link
                        to={n.link}
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'uppercase tracking-widest text-primary hover:underline decoration-2 underline-offset-2',
                        )}
                      >
                        {t('notifications.view', {}, { defaultValue: 'View thread' })}
                      </Link>
                    )}
                    {n.unread && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors',
                        )}
                      >
                        {t('common.markRead', {}, { defaultValue: 'Mark read' })}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })
        )}
      </section>
    </div>
  )
}

type Translate = ReturnType<typeof useTranslation>['t']

function normalize(payload: unknown, t: Translate): Notification[] {
  if (!Array.isArray(payload)) return []
  return payload.map((row) => {
    const r = row as Record<string, unknown>
    const rawKind = String(r.kind ?? '')
    const kind: Notification['kind'] =
      rawKind === 'mention' ||
      rawKind === 'milestone' ||
      rawKind === 'modmail' ||
      rawKind === 'vote'
        ? (rawKind as Notification['kind'])
        : 'reply'
    const payloadField =
      typeof r.payload === 'string'
        ? safeJSON(r.payload)
        : ((r.payload as Record<string, unknown> | null) ?? null)
    const title =
      typeof r.title === 'string'
        ? r.title
        : typeof payloadField?.title === 'string'
          ? String(payloadField.title)
          : titleFor(kind, t)
    const body =
      typeof r.body === 'string'
        ? r.body
        : typeof payloadField?.body === 'string'
          ? String(payloadField.body)
          : undefined
    const link = typeof r.link === 'string' ? r.link : r.link_id ? `/links/${r.link_id}` : undefined
    const unread = r.read_at == null && r.unread !== false
    return {
      id: String(r.id ?? ''),
      kind,
      title,
      body,
      link,
      unread,
      created_at: String(r.created_at ?? r.createdAt ?? new Date().toISOString()),
    }
  })
}

function titleFor(kind: Notification['kind'], t: Translate): string {
  switch (kind) {
    case 'mention':
      return t('notifications.title.mention', {}, { defaultValue: 'You were mentioned' })
    case 'reply':
      return t('notifications.title.reply', {}, { defaultValue: 'New reply' })
    case 'vote':
      return t('notifications.title.vote', {}, { defaultValue: 'Your post got a vote' })
    case 'milestone':
      return t('notifications.title.milestone', {}, { defaultValue: 'Milestone reached' })
    case 'modmail':
      return t('notifications.title.modmail', {}, { defaultValue: 'Moderator notice' })
  }
}

function safeJSON(s: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(s)
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
  } catch (_error) {
    // non-JSON payload string — return null so callers fall back to field defaults
    return null
  }
}

export default Notifications
