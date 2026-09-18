import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ActivityFeedItem, type ActivityType } from '../components/ActivityFeedItem.js'

interface ApiNotification {
  id: string
  type: string
  title: string
  body?: string | null
  data?: Record<string, unknown> | null
  read_at?: string | null
  created_at: string
}

const TYPE_TO_ACTIVITY: Record<string, ActivityType> = {
  invite: 'invited',
  invited: 'invited',
  recording: 'recording_ready',
  recording_ready: 'recording_ready',
  mention: 'mentioned',
  mentioned: 'mentioned',
  transcript: 'transcript_ready',
  transcript_ready: 'transcript_ready',
  hand_raised: 'hand_raised',
  reminder: 'reminder',
}

function unwrap<T>(value: unknown, fallback: T): T {
  let current: unknown = value
  for (let i = 0; i < 3; i++) {
    if (Array.isArray(current)) return current as T
    if (current && typeof current === 'object' && 'data' in current) {
      current = (current as { data: unknown }).data
      continue
    }
    break
  }
  return Array.isArray(current) ? (current as T) : fallback
}

function timestampLabel(iso?: string): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return ''
  const minutes = Math.round(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString()
}

function notificationGroup(iso: string): 'today' | 'yesterday' | 'earlier' {
  const now = new Date()
  const ts = new Date(iso)
  if (Number.isNaN(ts.getTime())) return 'earlier'
  if (ts.toDateString() === now.toDateString()) return 'today'
  const yesterday = new Date(now.getTime() - 24 * 60 * 60_000)
  if (ts.toDateString() === yesterday.toDateString()) return 'yesterday'
  return 'earlier'
}

function notificationCtaPath(n: ApiNotification): string | undefined {
  const data = (n.data ?? {}) as Record<string, unknown>
  if (typeof data.meeting_id === 'string') return `/meeting/${data.meeting_id}/details`
  if (typeof data.recording_id === 'string') return `/recordings/${data.recording_id}`
  if (typeof data.path === 'string') return data.path
  return undefined
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [marking, setMarking] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadNotifications = useCallback(() => {
    http
      .get('/api/notifications')
      .then((res) => {
        setNotifications(unwrap<ApiNotification[]>(res, []))
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [http])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const handleMarkAllRead = useCallback(async () => {
    if (marking) return
    setMarking(true)
    try {
      await http.post('/api/notifications/mark-all-read', {})
      loadNotifications()
    } catch (_error) {
      // mark-all-read is best-effort; UI will reflect next successful load
    } finally {
      setMarking(false)
    }
  }, [http, loadNotifications, marking])

  const grouped = useMemo(() => {
    const groups: Record<'today' | 'yesterday' | 'earlier', ApiNotification[]> = {
      today: [],
      yesterday: [],
      earlier: [],
    }
    for (const n of notifications) {
      groups[notificationGroup(n.created_at)].push(n)
    }
    return groups
  }, [notifications])

  return (
    <div className={cm.stack(8)}>
      <header
        className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 6 }), 'flex-wrap')}
      >
        <div className={cm.stack(2)}>
          <h1 className={cm.cn('text-4xl font-extrabold tracking-tight text-on-surface')}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
            {t(
              'notifications.subtitle',
              {},
              { defaultValue: 'Catch up on every invite, mention, and ready-to-watch recording.' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={marking || notifications.every((n) => n.read_at != null)}
          data-testid="mark-all-read"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.roundedFull,
            'bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors disabled:opacity-50',
          )}
        >
          {t('common.markAllAsRead', {}, { defaultValue: 'Mark all as read' })}
        </button>
      </header>

      {loading && notifications.length === 0 ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : notifications.length === 0 ? (
        <div data-testid="no-notifications" className={cm.cn(cm.textCenter, cm.sp('py', 12))}>
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">
            notifications_none
          </span>
          <p className={cm.cn(cm.sp('mt', 3), cm.textSize('base'), 'text-on-surface-variant')}>
            {t('notifications.empty', {}, { defaultValue: 'No notifications yet.' })}
          </p>
        </div>
      ) : (
        (['today', 'yesterday', 'earlier'] as const).map((group) =>
          grouped[group].length > 0 ? (
            <section key={group} className={cm.stack(3)}>
              <h2
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(`notifications.${group}`, {}, { defaultValue: group })}
              </h2>
              <div className={cm.stack(2)}>
                {grouped[group].map((n) => {
                  const cta = notificationCtaPath(n)
                  return (
                    <ActivityFeedItem
                      key={n.id}
                      id={n.id}
                      type={TYPE_TO_ACTIVITY[n.type] ?? 'invited'}
                      actorName={n.title}
                      contextTitle={n.body ?? ''}
                      timestampLabel={timestampLabel(n.created_at)}
                      unread={n.read_at == null}
                      ctaLabel={cta ? t('common.open', {}, { defaultValue: 'Open' }) : undefined}
                      onCta={cta ? () => navigate(cta) : undefined}
                    />
                  )
                })}
              </div>
            </section>
          ) : null,
        )
      )}
    </div>
  )
}
