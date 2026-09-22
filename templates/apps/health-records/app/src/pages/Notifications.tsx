import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { t as tGlobal } from '@molecule/app-i18n'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface NotificationRow {
  id: string
  kind: string
  payload: unknown
  read_at: string | null
  created_at: string
}

interface UrgencyVisuals {
  border: string
  pill: string
}

const URGENCY_VISUALS: Record<string, UrgencyVisuals> = {
  urgent: {
    border: 'var(--color-clinical-abnormal)',
    pill: 'bg-error-container text-on-error-container',
  },
  caution: {
    border: 'var(--color-clinical-caution)',
    pill: 'bg-warning-container text-on-warning-container',
  },
  routine: {
    border: 'var(--color-clinical-normal)',
    pill: 'bg-success-container text-on-success-container',
  },
}

const KIND_TO_CATEGORY: Record<string, { category: string; icon: string; defaultUrgency: string }> =
  {
    lab_result: { category: 'lab', icon: 'science', defaultUrgency: 'caution' },
    medication_refill: { category: 'refill', icon: 'medication', defaultUrgency: 'caution' },
    visit_reminder: { category: 'visit', icon: 'event_available', defaultUrgency: 'routine' },
    share_invite: { category: 'sharing', icon: 'shield_person', defaultUrgency: 'routine' },
    share_revoked: { category: 'sharing', icon: 'shield_person', defaultUrgency: 'routine' },
    system: { category: 'security', icon: 'security', defaultUrgency: 'routine' },
  }

interface ParsedPayload {
  title: string
  body: string
  urgency: string
}

function parsePayload(p: unknown): ParsedPayload {
  let parsed: Record<string, unknown> = {}
  if (typeof p === 'string') {
    try {
      parsed = JSON.parse(p)
    } catch (_error) {
      // invalid JSON payload falls back to empty object — safe to ignore
      parsed = {}
    }
  } else if (p && typeof p === 'object') {
    parsed = p as Record<string, unknown>
  }
  return {
    title: String(parsed.title ?? ''),
    body: String(parsed.body ?? ''),
    urgency: String(parsed.urgency ?? 'routine'),
  }
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return tGlobal('status.justNow', undefined, { defaultValue: 'Just now' })
  if (min < 60) return tGlobal('status.minAgo', { min }, { defaultValue: '{{min}} min ago' })
  const hr = Math.floor(min / 60)
  if (hr < 24) {
    return hr === 1
      ? tGlobal('status.hourAgo', undefined, { defaultValue: '1 hour ago' })
      : tGlobal('status.hoursAgo', { hours: hr }, { defaultValue: '{{hours}} hours ago' })
  }
  const day = Math.floor(hr / 24)
  if (day === 1) return tGlobal('status.yesterday', undefined, { defaultValue: 'Yesterday' })
  if (day < 7)
    return tGlobal('status.daysAgo', { days: day }, { defaultValue: '{{days}} days ago' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get('/api/notifications')
      setItems(unwrapList<NotificationRow>(res))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'nav.failedToLoadNotifications',
              {},
              { defaultValue: 'Failed to load notifications.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    )
    try {
      await http.post(`/api/notifications/${id}/read`, {})
      track({ name: 'notification.read', properties: { notification_id: id } })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('notifications.markReadError', {}, { defaultValue: 'Mark-as-read failed.' }),
      )
      await fetchItems()
    }
  }

  const handleMarkAllRead = async () => {
    const unreadIds = items.filter((n) => !n.read_at).map((n) => n.id)
    if (unreadIds.length === 0) return
    setItems((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
    )
    try {
      await Promise.all(unreadIds.map((id) => http.post(`/api/notifications/${id}/read`, {})))
      track({ name: 'notification.read_all', properties: { count: unreadIds.length } })
    } catch (error) {
      logError('notifications.markAllRead', error)
      await fetchItems()
    }
  }

  const unreadCount = items.filter((n) => !n.read_at).length

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
          <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-1')}>
            {t('nav.inbox', {}, { defaultValue: 'Inbox' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          {unreadCount > 0 && (
            <span
              data-mol-id="notifications-unread-count"
              className={cm.cn(
                'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary-container text-on-primary-container',
              )}
            >
              {t(
                'common.countUnread',
                { count: unreadCount },
                { defaultValue: '{{count}} unread' },
              )}
            </span>
          )}
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className={cm.cn(
                cm.fontWeight('bold'),
                'px-4 py-2 text-[11px] uppercase tracking-widest rounded-full bg-primary text-on-primary shadow-sm hover:shadow-md transition-shadow',
              )}
              data-mol-id="mark-all-read"
            >
              {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className={cm.cn(cm.sp('mb', 4), cm.textSize('sm'), 'text-error font-bold')}
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : items.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
          <span className={cm.cn('text-3xl material-symbols-outlined text-outline')}>inbox</span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
            {t('notifications.empty.title', {}, { defaultValue: 'No notifications yet.' })}
          </p>
        </div>
      ) : (
        <div
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
          data-mol-id="notifications-list"
        >
          {items.map((n) => {
            const meta = KIND_TO_CATEGORY[n.kind] ?? {
              category: 'system',
              icon: 'notifications',
              defaultUrgency: 'routine',
            }
            const payload = parsePayload(n.payload)
            const urgency =
              URGENCY_VISUALS[payload.urgency] ??
              URGENCY_VISUALS[meta.defaultUrgency] ??
              URGENCY_VISUALS.routine
            const isUnread = !n.read_at
            return (
              <article
                key={n.id}
                data-mol-id={`notification-${n.id}`}
                data-mol-unread={isUnread ? 'true' : 'false'}
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 'md' }),
                  cm.sp('p', 5),
                  'bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md transition-all',
                )}
                style={{ borderLeft: `4px solid ${urgency.border}` }}
              >
                <div
                  className={cm.cn(
                    cm.shrink0,
                    cm.sp('mt', 1),
                    cm.flex({ align: 'center', gap: 'sm' }),
                  )}
                >
                  {isUnread && (
                    <span
                      className={cm.cn('w-2 h-2 rounded-full bg-primary')}
                      aria-label={t('status.unread', {}, { defaultValue: 'Unread' })}
                    />
                  )}
                  <span
                    className={cm.cn('material-symbols-outlined text-xl')}
                    style={{ color: urgency.border }}
                    aria-hidden="true"
                  >
                    {meta.icon}
                  </span>
                </div>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
                    )}
                  >
                    <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                      {payload.title ||
                        t(`notifications.kind.${n.kind}`, {}, { defaultValue: n.kind })}
                    </p>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'tabular-nums text-on-surface-variant uppercase tracking-wider font-semibold',
                      )}
                    >
                      {fmtTime(n.created_at)}
                    </span>
                  </div>
                  {payload.body && (
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.sp('mt', 1),
                        'text-on-surface-variant',
                      )}
                    >
                      {payload.body}
                    </p>
                  )}
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 3))}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'px-2 py-0.5 text-[10px] uppercase tracking-widest rounded-full',
                        urgency.pill,
                      )}
                    >
                      {t(
                        `notifications.urgency.${payload.urgency || meta.defaultUrgency}`,
                        {},
                        { defaultValue: payload.urgency || meta.defaultUrgency },
                      )}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant uppercase tracking-wider font-bold',
                      )}
                    >
                      {t(
                        `notifications.category.${meta.category}`,
                        {},
                        { defaultValue: meta.category },
                      )}
                    </span>
                    {isUnread && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(n.id)}
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'uppercase tracking-widest text-primary hover:underline ml-auto',
                        )}
                        data-mol-id={`notification-read-${n.id}`}
                      >
                        {t('notifications.markRead', {}, { defaultValue: 'Mark read' })}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
