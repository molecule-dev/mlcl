import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

type NotificationKind = 'reply' | 'mention' | 'follow' | 'badge' | 'moderation' | 'system'

interface Notification {
  id: string
  kind: NotificationKind
  read: boolean
  created_at: string
  actor?: { username: string; avatar_url?: string }
  thread?: { id: string; slug?: string; title: string }
  body: string
  link?: string
}

const KIND_PRESENTATION: Record<
  NotificationKind,
  { icon: string; bg: string; fg: string; labelKey: string; defaultLabel: string }
> = {
  reply: {
    icon: 'chat',
    bg: 'bg-primary/15',
    fg: 'text-primary',
    labelKey: 'notifications.kind.reply',
    defaultLabel: 'Reply',
  },
  mention: {
    icon: 'alternate_email',
    bg: 'bg-warning-light',
    fg: 'text-warning',
    labelKey: 'notifications.kind.mention',
    defaultLabel: 'Mention',
  },
  follow: {
    icon: 'person_add',
    bg: 'bg-success-light',
    fg: 'text-success',
    labelKey: 'notifications.kind.follow',
    defaultLabel: 'Follow',
  },
  badge: {
    icon: 'military_tech',
    bg: 'bg-secondary/20',
    fg: 'text-secondary-dark',
    labelKey: 'notifications.kind.badge',
    defaultLabel: 'Badge',
  },
  moderation: {
    icon: 'gavel',
    bg: 'bg-[var(--color-moderator-light)]',
    fg: 'text-[var(--color-moderator)]',
    labelKey: 'notifications.kind.moderation',
    defaultLabel: 'Moderation',
  },
  system: {
    icon: 'campaign',
    bg: 'bg-border',
    fg: 'text-foreground-secondary',
    labelKey: 'notifications.kind.system',
    defaultLabel: 'Announcement',
  },
}

const formatRelative = (iso: string) => {
  const then = new Date(iso).getTime()
  const diff = Math.max(Date.now() - then, 0)
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [notifications, setNotifications] = useState<Notification[] | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<{ data: Notification[] }>('/api/notifications')
      .then((res) => {
        if (cancelled) return
        setNotifications(res?.data?.data ?? [])
        setError(null)
      })
      .catch((e) => {
        if (cancelled) return
        setNotifications([])
        setError(e instanceof Error ? e.message : 'Failed to load notifications')
      })
    return () => {
      cancelled = true
    }
  }, [http])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = notifications ?? [] // derived inline; useMemo deps below rely on notifications state stability
  const visible = useMemo(
    () => (filter === 'unread' ? list.filter((n) => !n.read) : list),
    [filter, list],
  )
  const unreadCount = list.filter((n) => !n.read).length

  const markAllRead = async () => {
    setNotifications((prev) => (prev ?? []).map((n) => ({ ...n, read: true })))
    track({ name: 'notifications.marked_all_read' })
    try {
      await http.post('/api/notifications/mark-all-read')
    } catch (_error) {
      /* best-effort; UI state already updated optimistically */
    }
  }

  return (
    <div className={cm.cn(cm.stack(6))}>
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(2)}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-[0.3em] text-primary',
            )}
          >
            {t('nav.inbox', {}, { defaultValue: 'Inbox' })}
          </span>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t(
              'notifications.heading',
              { count: unreadCount.toLocaleString() },
              { defaultValue: 'Notifications · {{count}} unread' },
            )}
          </h1>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'text-xs uppercase tracking-widest border border-outline-variant/40 hover:border-primary/40 hover:text-primary disabled:opacity-50 transition-colors',
          )}
        >
          {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
        </button>
      </header>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
        {(['all', 'unread'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'text-xs uppercase tracking-widest transition-colors min-h-10 md:min-h-0',
              filter === key
                ? 'bg-primary text-on-primary shadow-sm shadow-primary/30'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant',
            )}
          >
            {t(
              `notifications.filter.${key}`,
              {},
              { defaultValue: key === 'all' ? 'All' : 'Unread' },
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')} role="alert">
          {error}
        </p>
      )}

      {notifications === null ? (
        <p className={cm.textMuted}>
          {t('notifications.loading', {}, { defaultValue: 'Loading notifications…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.textMuted}>
          {t(
            'notifications.empty',
            {},
            { defaultValue: "You're all caught up. Maybe go read a book." },
          )}
        </p>
      ) : (
        <ul
          className={cm.cn(
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 overflow-hidden divide-y divide-outline-variant/30',
          )}
        >
          {visible.map((n) => {
            // The API derives `kind` from free-form activity actions, so fall
            // back to the generic announcement style for kinds we don't know.
            const presentation = KIND_PRESENTATION[n.kind] ?? KIND_PRESENTATION.system
            const inner = (
              <article
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'start', gap: 'md' }),
                  'transition-colors',
                  n.read
                    ? 'bg-transparent hover:bg-surface-container/40'
                    : 'bg-primary/[0.04] hover:bg-primary/[0.08]',
                )}
              >
                <div
                  className={cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.roundedFull,
                    presentation.bg,
                    presentation.fg,
                    'shrink-0',
                  )}
                  aria-hidden
                >
                  <span className={cm.cn('material-symbols-outlined text-lg')}>
                    {presentation.icon}
                  </span>
                </div>
                <div className={cm.cn(cm.flex1, cm.stack(1), 'min-w-0')}>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.fontWeight('bold'),
                        cm.roundedFull,
                        'py-0.5 text-[10px] uppercase tracking-widest',
                        presentation.bg,
                        presentation.fg,
                      )}
                    >
                      {t(presentation.labelKey, {}, { defaultValue: presentation.defaultLabel })}
                    </span>
                    {!n.read && (
                      <span
                        aria-label={t('status.unread', {}, { defaultValue: 'Unread' })}
                        className={cm.cn(cm.roundedFull, cm.w(2), cm.h(2), 'bg-primary')}
                      />
                    )}
                  </div>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                    {n.actor && (
                      <span className={cm.cn(cm.fontWeight('semibold'), 'text-primary')}>
                        @{n.actor.username}{' '}
                      </span>
                    )}
                    {n.body}
                  </p>
                  {n.thread && (
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                      {n.thread.title}
                    </p>
                  )}
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {formatRelative(n.created_at)}
                  </p>
                </div>
              </article>
            )
            return <li key={n.id}>{n.link ? <Link to={n.link}>{inner}</Link> : inner}</li>
          })}
        </ul>
      )}
    </div>
  )
}

export default Notifications
