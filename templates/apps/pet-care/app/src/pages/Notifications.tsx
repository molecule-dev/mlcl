import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import type { TranslateFunction } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

type NotificationCategory = 'reminder' | 'message' | 'booking' | 'health' | 'system'

interface ApiNotification {
  id: string
  kind: string
  payload?: Record<string, unknown> | string | null
  read_at?: string | null
  created_at?: string
}

const CATEGORY_ICON: Record<NotificationCategory, string> = {
  reminder: 'alarm',
  message: 'chat',
  booking: 'event_available',
  health: 'medical_information',
  system: 'campaign',
}

const CATEGORY_COLOR: Record<NotificationCategory, string> = {
  reminder: 'var(--color-pet-attention)',
  message: 'var(--color-pet-booked)',
  booking: 'var(--color-pet-vaccinated)',
  health: 'var(--color-pet-critical)',
  system: 'var(--color-pet-healthy)',
}

function categoryOf(kind: string): NotificationCategory {
  if (kind.startsWith('booking.')) return 'booking'
  if (kind.startsWith('message.')) return 'message'
  if (kind.startsWith('health.') || kind.includes('vaccin') || kind.includes('vet')) return 'health'
  if (kind.startsWith('reminder.') || kind.includes('refill') || kind.includes('medication'))
    return 'reminder'
  return 'system'
}

function parsePayload(payload: ApiNotification['payload']): Record<string, unknown> {
  if (!payload) return {}
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload) ?? {}
    } catch (_error) {
      // JSON.parse failed — payload is malformed; fall back to empty object
      return {}
    }
  }
  return payload
}

function titleFor(kind: string, payload: Record<string, unknown>, t: TranslateFunction): string {
  if (kind === 'booking.created') {
    const sitter = String(payload.sitterName ?? '')
    const service = String(
      payload.service ?? t('bookings.fallbackService', {}, { defaultValue: 'Booking' }),
    )
    return sitter
      ? t(
          'notifications.title.bookingRequestedWith',
          { service, sitter },
          { defaultValue: '{{service}} requested with {{sitter}}' },
        )
      : t(
          'notifications.title.bookingRequested',
          { service },
          { defaultValue: '{{service}} requested' },
        )
  }
  if (kind === 'booking.confirmed')
    return t('notifications.title.bookingConfirmed', {}, { defaultValue: 'Booking confirmed' })
  if (kind === 'booking.cancelled')
    return t('notifications.title.bookingCancelled', {}, { defaultValue: 'Booking cancelled' })
  if (kind === 'message.received')
    return t('notifications.title.newMessage', {}, { defaultValue: 'New message' })
  if (kind === 'health.reminder')
    return String(
      payload.title ??
        t('notifications.title.healthReminder', {}, { defaultValue: 'Health reminder' }),
    )
  return kind.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function bodyFor(kind: string, payload: Record<string, unknown>, t: TranslateFunction): string {
  if (kind === 'booking.created') {
    const startsAt = payload.startsAt
      ? new Date(String(payload.startsAt)).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : ''
    return startsAt
      ? t(
          'notifications.body.scheduledFor',
          { date: startsAt },
          { defaultValue: 'Scheduled for {{date}}' },
        )
      : t(
          'notifications.body.awaitingConfirmation',
          {},
          { defaultValue: 'Awaiting sitter confirmation.' },
        )
  }
  return String(payload.body ?? payload.message ?? '')
}

function linkFor(kind: string, payload: Record<string, unknown>): string | undefined {
  const bookingId = payload.bookingId
  if (
    typeof bookingId === 'string' &&
    (kind.startsWith('booking.') || kind.startsWith('message.'))
  ) {
    return `/bookings/${bookingId}`
  }
  return undefined
}

function fmtAgo(iso: string | undefined, t: TranslateFunction): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return t('notifications.time.justNow', {}, { defaultValue: 'Just now' })
  if (ms < 3600_000)
    return t(
      'notifications.time.minutesAgo',
      { count: Math.floor(ms / 60_000) },
      { defaultValue: '{{count}} min ago' },
    )
  if (ms < 86_400_000)
    return t(
      'notifications.time.hoursAgo',
      { count: Math.floor(ms / 3600_000) },
      { defaultValue: '{{count}} hr ago' },
    )
  if (ms < 7 * 86_400_000)
    return t(
      'notifications.time.daysAgo',
      { count: Math.floor(ms / 86_400_000) },
      { defaultValue: '{{count}} days ago' },
    )
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/notifications?limit=100')
      .then((res) => {
        if (cancelled) return
        setItems(unwrapList<ApiNotification>(res))
      })
      .catch((err: unknown) => {
        console.error('[Notifications] failed to load', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const unreadCount = useMemo(() => items.filter((n) => !n.read_at).length, [items])

  const markRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    )
    try {
      await http.post(`/api/notifications/${id}/read`, {})
    } catch (err: unknown) {
      console.error('[Notifications] mark read failed', err)
    }
  }

  const markAllRead = async () => {
    const now = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })))
    try {
      await http.post('/api/notifications/mark-all-read', {})
    } catch (err: unknown) {
      console.error('[Notifications] mark all read failed', err)
    }
  }

  return (
    <div
      className={cm.cn(cm.maxW('4xl'), cm.mxAuto, cm.sp('p', 8))}
      data-mol-id="page-notifications"
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p
            className={cm.cn(
              'text-[10px] font-bold uppercase tracking-widest text-primary-dark dark:text-primary mb-1',
            )}
          >
            {t('nav.activityFeed', {}, { defaultValue: 'Activity feed' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t('common.countUnread', { count: unreadCount }, { defaultValue: '{{count}} unread' })}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-xl border border-primary/40 text-primary hover:bg-primary-container transition-all disabled:opacity-50',
          )}
          data-mol-id="cta-mark-all-read"
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>done_all</span>
          {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
        </button>
      </div>

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : items.length === 0 ? (
        <div
          className={cm.cn(cm.textCenter, cm.sp('py', 12), 'rounded-xl bg-surface-container-low')}
          data-mol-id="notifications-empty"
        >
          <span
            className={cm.cn(
              'material-symbols-outlined text-6xl text-primary mb-2 block opacity-50',
            )}
          >
            notifications_off
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {t('notifications.empty.title', {}, { defaultValue: "You're all caught up" })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('notifications.empty.body', {}, { defaultValue: 'New activity will show up here.' })}
          </p>
        </div>
      ) : (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          {items.map((n) => {
            const payload = parsePayload(n.payload)
            const cat = categoryOf(n.kind)
            return (
              <Card
                key={n.id}
                id={n.id}
                category={cat}
                title={titleFor(n.kind, payload, t)}
                body={bodyFor(n.kind, payload, t)}
                timeLabel={fmtAgo(n.created_at, t)}
                unread={!n.read_at}
                link={linkFor(n.kind, payload)}
                onMarkRead={() => markRead(n.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

interface CardProps {
  id: string
  category: NotificationCategory
  title: string
  body: string
  timeLabel: string
  unread: boolean
  link?: string
  onMarkRead: () => void
}

function Card({ id, category, title, body, timeLabel, unread, link, onMarkRead }: CardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const inner = (
    <article
      data-mol-id={`notification-${id}`}
      className={cm.cn(
        cm.flex({ align: 'start', gap: 'md' }),
        cm.sp('p', 5),
        'rounded-xl shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all',
        unread ? 'bg-primary-container/40' : 'bg-surface-container-lowest',
        unread && cm.accentCard({ tone: 'primary' }),
      )}
    >
      <span
        className={cm.cn(
          cm.shrink0,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.roundedFull,
          'w-10 h-10',
        )}
        style={{
          backgroundColor: 'color-mix(in srgb, ' + CATEGORY_COLOR[category] + ' 18%, white)',
          color: CATEGORY_COLOR[category],
        }}
        aria-hidden="true"
      >
        <span
          className={cm.cn('material-symbols-outlined text-base')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {CATEGORY_ICON[category]}
        </span>
      </span>
      <div className={cm.cn(cm.flex1, 'min-w-0')}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'truncate')}>{title}</p>
          <span className={cm.cn(cm.textSize('xs'), 'shrink-0 text-on-surface-variant')}>
            {timeLabel}
          </span>
        </div>
        {body && (
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {body}
          </p>
        )}
      </div>
      {unread && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onMarkRead()
          }}
          aria-label={t('common.markAsRead', {}, { defaultValue: 'Mark as read' })}
          className={cm.cn(cm.shrink0, 'text-on-surface-variant hover:text-primary')}
          data-mol-id={`mark-read-${id}`}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>check_circle</span>
        </button>
      )}
    </article>
  )
  return link ? (
    <Link to={link} className={cm.cn('block')}>
      {inner}
    </Link>
  ) : (
    inner
  )
}
