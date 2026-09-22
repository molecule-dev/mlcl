import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { get, post } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { RapportLayout } from '../components/RapportLayout.js'
import { StatusBadge } from '../components/StatusBadge.js'

type EventType = 'escalation' | 'mention' | 'assignment' | 'reply' | 'system'

interface NotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  metadata_json: { conversationId?: string; actor?: string; initials?: string } | null
  read_at: string | null
  created_at: string
}

const FILTERS: Array<{
  id: EventType | 'all'
  labelKey: string
  labelDefault: string
  icon: string
}> = [
  { id: 'all', labelKey: 'notifications.filters.all', labelDefault: 'All', icon: 'inbox' },
  {
    id: 'escalation',
    labelKey: 'notifications.filters.escalation',
    labelDefault: 'Escalations',
    icon: 'priority_high',
  },
  {
    id: 'mention',
    labelKey: 'notifications.filters.mention',
    labelDefault: 'Mentions',
    icon: 'alternate_email',
  },
  {
    id: 'assignment',
    labelKey: 'notifications.filters.assignment',
    labelDefault: 'Assignments',
    icon: 'person_add',
  },
  { id: 'reply', labelKey: 'notifications.filters.reply', labelDefault: 'Replies', icon: 'reply' },
  { id: 'system', labelKey: 'notifications.filters.system', labelDefault: 'System', icon: 'info' },
]

const TYPE_COLOR: Record<string, string> = {
  escalation: 'bg-[var(--color-status-escalated-bg)] text-[var(--color-status-escalated-text)]',
  mention: 'bg-background text-primary-hover',
  assignment: 'bg-primary/10 text-primary',
  reply: 'bg-[color:var(--color-success-container)] text-[color:var(--color-on-success-container)]',
  system: 'bg-surface-container-high text-on-surface-variant',
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const day = Math.floor(hr / 24)
  return `${day} day${day === 1 ? '' : 's'} ago`
}

function initialsFor(name: string | undefined): string {
  if (!name) return 'NX'
  return (
    name
      .split(/\s+/)
      .map((s) => s[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'NX'
  )
}

function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [filter, setFilter] = useState<EventType | 'all'>('all')
  const [quiet, setQuiet] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)

  async function loadNotifications() {
    setLoading(true)
    setError(null)
    try {
      const response = await get<NotificationRow[]>('/api/notifications')
      const rows = Array.isArray(response.data) ? response.data : []
      setNotifications(rows)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('notifications.loadError', {}, { defaultValue: 'Failed to load notifications' }),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications
    return notifications.filter((n) => n.type === filter)
  }, [notifications, filter])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read_at).length, [notifications])

  async function handleMarkAllRead() {
    setMarking(true)
    setError(null)
    try {
      await post('/api/notifications/read-all', {})
      await loadNotifications()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('notifications.markError', {}, { defaultValue: 'Failed to mark notifications' }),
      )
    } finally {
      setMarking(false)
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await post(`/api/notifications/${id}/read`, {})
      setNotifications((list) =>
        list.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('notifications.markError', {}, { defaultValue: 'Failed to mark notification' }),
      )
    }
  }

  return (
    <RapportLayout>
      <div
        data-mol-id="page-notifications"
        className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), 'flex-wrap gap-4')}
      >
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-4xl tracking-tight text-on-background leading-tight',
            )}
          >
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'notifications.subtitle',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Escalations, mentions, and replies — quiet by default unless you ask {{appName}} to nudge.',
              },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 3 })}>
          <button
            data-mol-id="notifications-mark-all"
            type="button"
            onClick={handleMarkAllRead}
            disabled={marking || unreadCount === 0}
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full bg-primary text-on-primary px-4 py-2 hover:scale-[1.02] transition-transform disabled:opacity-50',
            )}
          >
            {marking
              ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
              : t(
                  'notifications.markAll',
                  { count: unreadCount },
                  { defaultValue: 'Mark all read ({{count}})' },
                )}
          </button>
          <label
            data-mol-id="notifications-quiet-toggle"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 3 }),
              cm.sp('p', 4),
              'rounded-2xl bg-surface-container-lowest shadow-sm cursor-pointer',
            )}
          >
            <span className="material-symbols-outlined text-primary text-xl">bedtime</span>
            <div className={cm.flex({ direction: 'col' })}>
              <span
                className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-on-surface')}
              >
                {t('notifications.quietLabel', {}, { defaultValue: 'Quiet hours' })}
              </span>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'notifications.quietDesc',
                  {},
                  { defaultValue: '20:00 — 09:00 in your timezone' },
                )}
              </span>
            </div>
            <input
              data-mol-id="notifications-quiet-checkbox"
              type="checkbox"
              checked={quiet}
              onChange={(e) => setQuiet(e.target.checked)}
              className="h-5 w-5 accent-primary ml-3"
            />
          </label>
        </div>
      </div>

      <div className={cm.cn(cm.flex({ gap: 2 }), 'flex-wrap')} data-mol-id="notifications-filters">
        {FILTERS.map((f) => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              data-mol-id={`notifications-filter-${f.id}`}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 1.5 }),
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                cm.touchTargetCompact,
                'rounded-full px-3 py-1.5 transition-colors',
                active
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
              )}
            >
              <span className="material-symbols-outlined text-base">{f.icon}</span>
              {t(f.labelKey, {}, { defaultValue: f.labelDefault })}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div
          data-mol-id="notifications-loading"
          className={cm.cn(cm.textCenter, cm.sp('p', 8), 'text-on-surface-variant')}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      ) : error ? (
        <div
          data-mol-id="notifications-error"
          role="alert"
          className={cm.cn(cm.textCenter, cm.sp('p', 8), 'text-error')}
        >
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div
          data-mol-id="notifications-empty"
          className={cm.cn(
            cm.textCenter,
            cm.sp('p', 8),
            cm.flex({ direction: 'col', gap: 2 }),
            'text-on-surface-variant',
          )}
        >
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/50">
            notifications_off
          </span>
          <span>{t('notifications.empty', {}, { defaultValue: 'No notifications yet' })}</span>
        </div>
      ) : (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 3 }),
            cm.sp('p', 5),
            'rounded-2xl bg-surface-container-lowest shadow-sm',
          )}
          data-mol-id="notifications-list"
        >
          {filtered.map((n) => {
            const meta = n.metadata_json ?? {}
            const actor = meta.actor ?? APP_NAME
            const initials = meta.initials ?? initialsFor(actor)
            const conversationId = meta.conversationId
            const unread = !n.read_at
            const inner = (
              <>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'shrink-0',
                    TYPE_COLOR[n.type] ?? TYPE_COLOR.system,
                  )}
                >
                  {initials}
                </div>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }), cm.flex1)}>
                  <div className={cm.flex({ align: 'center', gap: 2 })}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        'text-on-surface',
                      )}
                    >
                      {actor}
                    </span>
                    {unread && (
                      <StatusBadge
                        variant="active"
                        label={t('status.new', {}, { defaultValue: 'New' })}
                      />
                    )}
                  </div>
                  <span
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {n.body}
                  </span>
                </div>
                <div className={cm.flex({ direction: 'col', gap: 1, align: 'end' })}>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant shrink-0')}>
                    {relativeTime(n.created_at)}
                  </span>
                  {unread && (
                    <button
                      data-mol-id={`notifications-mark-${n.id}`}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void handleMarkRead(n.id)
                      }}
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-primary hover:text-primary-container transition-colors',
                      )}
                    >
                      {t('common.markRead', {}, { defaultValue: 'Mark read' })}
                    </button>
                  )}
                </div>
              </>
            )
            return conversationId ? (
              <Link
                key={n.id}
                data-mol-id={`notification-${n.id}`}
                to={`/conversations/${conversationId}`}
                className={cm.cn(
                  cm.flex({ gap: 4 }),
                  cm.sp('p', 4),
                  'rounded-xl transition-colors',
                  unread ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-surface-container-low',
                )}
              >
                {inner}
              </Link>
            ) : (
              <div
                key={n.id}
                data-mol-id={`notification-${n.id}`}
                className={cm.cn(
                  cm.flex({ gap: 4 }),
                  cm.sp('p', 4),
                  'rounded-xl transition-colors',
                  unread ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-surface-container-low',
                )}
              >
                {inner}
              </div>
            )
          })}
        </div>
      )}
    </RapportLayout>
  )
}

export default Notifications
export { Notifications, Notifications as NotificationsPage }
