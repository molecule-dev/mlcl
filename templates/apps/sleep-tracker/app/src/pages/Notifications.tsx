import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

type ActorKind = 'alarm' | 'coach' | 'device' | 'achievement' | 'reminder' | 'general'

interface ApiNotification {
  id: string
  user_id: string
  kind?: string
  category?: string
  title: string
  body?: string
  message?: string
  href?: string
  link?: string
  read?: boolean
  read_at?: string | null
  created_at: string
}

interface NotificationItem {
  id: string
  actor: ActorKind
  title: string
  body: string
  href: string
  createdAt: string
  unread: boolean
}

const ACTOR_PALETTE: Record<ActorKind, { bg: string; fg: string; icon: string; label: string }> = {
  alarm: {
    bg: 'var(--color-badge-amber-bg)',
    fg: 'var(--color-badge-amber-fg)',
    icon: 'alarm',
    label: 'Alarm',
  },
  coach: {
    bg: 'var(--color-badge-indigo-bg)',
    fg: 'var(--color-badge-indigo-fg)',
    icon: 'self_improvement',
    label: 'Coach',
  },
  device: {
    bg: 'var(--color-badge-green-bg)',
    fg: 'var(--color-badge-green-fg)',
    icon: 'watch',
    label: 'Device',
  },
  achievement: {
    bg: 'var(--color-badge-violet-bg)',
    fg: 'var(--color-badge-violet-fg)',
    icon: 'military_tech',
    label: 'Achievement',
  },
  reminder: {
    bg: 'var(--color-badge-indigo-bg)',
    fg: 'var(--color-badge-indigo-fg)',
    icon: 'bedtime',
    label: 'Reminder',
  },
  general: {
    bg: 'var(--color-badge-indigo-bg)',
    fg: 'var(--color-badge-indigo-fg)',
    icon: 'notifications',
    label: 'Notification',
  },
}

function relativeTime(iso: string): string {
  try {
    const then = new Date(iso).getTime()
    const now = Date.now()
    const sec = Math.max(0, Math.round((now - then) / 1000))
    if (sec < 60) return `${sec}s ago`
    const min = Math.round(sec / 60)
    if (min < 60) return `${min}m ago`
    const hr = Math.round(min / 60)
    if (hr < 24) return `${hr}h ago`
    const day = Math.round(hr / 24)
    return `${day}d ago`
  } catch (_error) {
    // invalid date string — return raw value as fallback
    return iso
  }
}

function normaliseActor(kind: string | undefined): ActorKind {
  if (!kind) return 'general'
  if (
    (['alarm', 'coach', 'device', 'achievement', 'reminder'] as ActorKind[]).includes(
      kind as ActorKind,
    )
  ) {
    return kind as ActorKind
  }
  return 'general'
}

function mapNotification(n: ApiNotification): NotificationItem {
  return {
    id: n.id,
    actor: normaliseActor(n.kind ?? n.category),
    title: n.title,
    body: n.body ?? n.message ?? '',
    href: n.href ?? n.link ?? '#',
    createdAt: relativeTime(n.created_at),
    unread: !(n.read === true),
  }
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const res = await http.get('/api/notifications').catch(() => null)
    const list = unwrapList<ApiNotification>(res).map(mapNotification)
    setItems(list)
  }

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/notifications')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<ApiNotification>(res).map(mapNotification)
        setItems(list)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const unreadCount = useMemo(() => items.filter((n) => n.unread).length, [items])

  const markAllRead = async () => {
    const unread = items.filter((n) => n.unread)
    if (unread.length === 0) return
    setBusy(true)
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })))
    try {
      await Promise.all(
        unread.map((n) => http.post(`/api/notifications/${n.id}/read`, {}).catch(() => null)),
      )
      track({ name: 'notifications.read', properties: { count: unread.length } })
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('p', 8), 'space-y-6')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('nav.activityFeed', {}, { defaultValue: 'Activity feed' })}
          </p>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight', cm.sp('mt', 1))}
          >
            {t('settings.notifications', { count: unreadCount }, { defaultValue: 'Notifications' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t('common.countUnread', { count: unreadCount }, { defaultValue: '{{count}} unread' })}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={busy || unreadCount === 0}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-full border-2 border-outline-variant hover:border-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {busy
            ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
            : t('common.markAllAsRead', {}, { defaultValue: 'Mark all as read' })}
        </button>
      </header>

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('nav.loadingNotifications', {}, { defaultValue: 'Loading notifications…' })}
        </p>
      ) : items.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-2xl bg-surface-container-lowest border-2 border-dashed border-outline-variant text-center space-y-3',
          )}
        >
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('notifications.emptyHeading', {}, { defaultValue: "You're all caught up" })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'notifications.emptyBody',
              {},
              {
                defaultValue: 'New activity, alarm reminders, and coaching nudges will land here.',
              },
            )}
          </p>
        </div>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {items.map((n) => {
            const palette = ACTOR_PALETTE[n.actor]
            return (
              <li key={n.id}>
                <Link
                  to={n.href}
                  className={cm.cn(
                    cm.sp('p', 5),
                    'block bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4',
                    n.unread ? '' : 'opacity-80',
                  )}
                  style={{ borderLeftColor: palette.fg }}
                >
                  <div className={cm.cn(cm.flex({ align: 'start', gap: 'md' }))}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'h-10 w-10 rounded-xl shrink-0',
                      )}
                      style={{ backgroundColor: palette.bg, color: palette.fg }}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-xl')}
                        aria-hidden="true"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {palette.icon}
                      </span>
                    </span>
                    <div className={cm.flex1}>
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                          'flex-wrap',
                        )}
                      >
                        <span
                          className={cm.cn(
                            cm.fontWeight('bold'),
                            'text-[10px] uppercase tracking-widest',
                          )}
                          style={{ color: palette.fg }}
                        >
                          {t(`notifications.actor.${n.actor}`, {}, { defaultValue: palette.label })}
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            'text-on-surface-variant whitespace-nowrap',
                          )}
                        >
                          {n.createdAt}
                        </span>
                      </div>
                      <h3
                        className={cm.cn(
                          cm.textSize('base'),
                          cm.fontWeight('bold'),
                          cm.sp('mt', 1),
                        )}
                      >
                        {n.title}
                        {n.unread ? (
                          <span
                            className={cm.cn('ml-2 inline-block rounded-full')}
                            aria-label={t(
                              'notifications.unreadDotAria',
                              {},
                              { defaultValue: 'Unread' },
                            )}
                            style={{ width: 8, height: 8, backgroundColor: palette.fg }}
                          />
                        ) : null}
                      </h3>
                      {n.body ? (
                        <p
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.sp('mt', 1),
                            'text-on-surface-variant',
                          )}
                        >
                          {n.body}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
