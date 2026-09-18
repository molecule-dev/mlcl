import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { NotificationRow } from '../lib/api.js'

type NotificationKind = 'class' | 'mention' | 'grade' | 'hand' | 'announcement' | 'system'

const KIND_TONE: Record<NotificationKind, { icon: string; bg: string; text: string }> = {
  class: { icon: 'video_call', bg: 'bg-primary-container', text: 'text-on-primary-container' },
  mention: { icon: 'forum', bg: 'bg-tertiary-container', text: 'text-on-tertiary-container' },
  grade: { icon: 'grade', bg: 'bg-success/15', text: 'text-success' },
  hand: { icon: 'front_hand', bg: 'bg-warning/15', text: 'text-warning' },
  announcement: { icon: 'campaign', bg: 'bg-secondary/15', text: 'text-secondary-dark' },
  system: { icon: 'check_circle', bg: 'bg-secondary/15', text: 'text-secondary-dark' },
}

function classifyKind(type: string): NotificationKind {
  if (type.startsWith('class') || type.startsWith('room')) return 'class'
  if (type.startsWith('mention') || type.startsWith('chat')) return 'mention'
  if (type.startsWith('grade')) return 'grade'
  if (type.startsWith('hand')) return 'hand'
  if (type.startsWith('announce') || type.startsWith('assignment')) return 'announcement'
  return 'system'
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return ''
  const m = Math.round(ms / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  if (d === 1) return 'yesterday'
  if (d < 7) return `${d} d ago`
  return new Date(iso).toLocaleDateString()
}

const FILTERS: { key: 'all' | NotificationKind; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'class', label: 'Classes' },
  { key: 'mention', label: 'Mentions' },
  { key: 'grade', label: 'Grades' },
  { key: 'announcement', label: 'Announcements' },
  { key: 'system', label: 'System' },
]

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [notifs, setNotifs] = useState<NotificationRow[]>([])
  const [filter, setFilter] = useState<'all' | NotificationKind>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<NotificationRow[]>('/api/notifications')
      .then((res) => {
        if (cancelled) return
        setNotifs(res.data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load notifications')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const enriched = useMemo(
    () =>
      notifs.map((n) => ({
        row: n,
        kind: classifyKind(n.type),
        time: relativeTime(n.created_at),
      })),
    [notifs],
  )

  const visible = filter === 'all' ? enriched : enriched.filter((n) => n.kind === filter)
  const unreadCount = notifs.filter((n) => !n.read_at).length

  const markAllRead = async () => {
    setBusy(true)
    try {
      await http.post('/api/notifications/read-all', {})
      setNotifs((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
      )
    } finally {
      setBusy(false)
    }
  }

  const markOneRead = async (id: string) => {
    try {
      await http.post(`/api/notifications/${id}/read`, {})
      setNotifs((prev) =>
        prev.map((n) =>
          n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n,
        ),
      )
    } catch (_error) {
      // best-effort mark-read — next page load will reconcile from the server
    }
  }

  return (
    <div className={cm.stack(8)} data-testid="notifications-root">
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div className={cm.stack(1)}>
          <span className={cm.cn('text-[11px] font-black uppercase tracking-widest text-primary')}>
            {t('nav.activity', {}, { defaultValue: 'Activity' })}
          </span>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
            {unreadCount === 0
              ? t('notifications.bodyNone', {}, { defaultValue: 'You are all caught up.' })
              : t(
                  'notifications.body',
                  { count: unreadCount },
                  { defaultValue: 'You have {{count}} unread updates from your classes.' },
                )}
          </p>
        </div>
        <button
          type="button"
          data-testid="notifications-mark-all-read"
          onClick={markAllRead}
          disabled={busy || unreadCount === 0}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 1 }),
            cm.fontWeight('bold'),
            cm.sp('px', 4),
            cm.sp('py', 2.5),
            cm.textSize('sm'),
            'rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>done_all</span>
          {t('common.markAllAsRead', {}, { defaultValue: 'Mark all as read' })}
        </button>
      </header>

      <nav className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full transition-colors',
              filter === f.key
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {t(`notifications.filter_${f.key}`, {}, { defaultValue: f.label })}
          </button>
        ))}
      </nav>

      {error ? (
        <div
          role="alert"
          className={cm.cn(cm.sp('p', 4), 'rounded-xl bg-error-container text-on-error-container')}
        >
          {error}
        </div>
      ) : null}

      <ul
        data-testid="notifications-list"
        className={cm.cn(
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/10 divide-y divide-outline-variant/15 overflow-hidden',
        )}
      >
        {loading ? (
          <li className={cm.cn(cm.sp('p', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('notifications.loading', {}, { defaultValue: 'Loading…' })}
          </li>
        ) : visible.length === 0 ? (
          <li className={cm.cn(cm.sp('p', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('notifications.empty', {}, { defaultValue: 'No notifications in this lane.' })}
          </li>
        ) : (
          visible.map(({ row, kind, time }) => {
            const tone = KIND_TONE[kind]
            const unread = !row.read_at
            const InnerWrapper: React.ElementType = row.link ? Link : 'div'
            const wrapperProps = row.link ? { to: row.link } : {}
            return (
              <li
                key={row.id}
                data-testid={`notification-${row.id}`}
                data-unread={unread ? 'true' : 'false'}
                className={cm.cn('relative', unread && 'bg-primary/[0.04]')}
              >
                <InnerWrapper
                  {...wrapperProps}
                  onClick={() => unread && markOneRead(row.id)}
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 4 }),
                    cm.sp('p', 5),
                    'hover:bg-surface-container-low transition-colors',
                  )}
                >
                  <div
                    className={cm.cn(
                      'h-11 w-11 rounded-xl flex items-center justify-center shrink-0',
                      tone.bg,
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-[20px]', tone.text)}>
                      {tone.icon}
                    </span>
                  </div>
                  <div className={cm.cn(cm.flex1, cm.stack(1), 'min-w-0')}>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}>
                      <h3
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'text-on-surface',
                        )}
                      >
                        {row.title}
                      </h3>
                      {unread ? (
                        <span
                          className={cm.cn('h-2 w-2 rounded-full bg-secondary')}
                          aria-label={t('status.unread', {}, { defaultValue: 'Unread' })}
                        ></span>
                      ) : null}
                    </div>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant leading-relaxed',
                      )}
                    >
                      {row.body}
                    </p>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {time}
                    </span>
                  </div>
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-on-surface-variant/60 shrink-0',
                    )}
                  >
                    chevron_right
                  </span>
                </InnerWrapper>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}

export default Notifications
