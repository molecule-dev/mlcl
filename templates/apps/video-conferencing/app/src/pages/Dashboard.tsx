import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ActivityFeedItem, type ActivityType } from '../components/ActivityFeedItem.js'
import { MeetingCard, type MeetingCardStatus } from '../components/MeetingCard.js'
import { MeetingHeroCard } from '../components/MeetingHeroCard.js'
import { RecordingTile } from '../components/RecordingTile.js'

interface ApiMeeting {
  id: string
  title: string
  starts_at?: string | null
  ends_at?: string | null
  status?: string
  is_recurring?: boolean
  join_code?: string
}

interface ApiRecording {
  id: string
  meeting_id: string
  video_url?: string
  thumbnail_url?: string | null
  duration_ms?: number
  size_bytes?: number
  status?: string
  created_at: string
  title?: string
}

interface ApiNotification {
  id: string
  type: string
  title: string
  body?: string | null
  data?: Record<string, unknown> | null
  read_at?: string | null
  created_at: string
}

const NOTIFICATION_TO_ACTIVITY: Record<string, ActivityType> = {
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

function startsInMinutes(iso?: string | null): number | undefined {
  if (!iso) return undefined
  const ms = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(ms)) return undefined
  return Math.max(0, Math.round(ms / 60_000))
}

function durationMinutes(start?: string | null, end?: string | null): number | undefined {
  if (!start || !end) return undefined
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (Number.isNaN(ms) || ms <= 0) return undefined
  return Math.round(ms / 60_000)
}

function formatScheduledLabel(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (sameDay) return `Today, ${time}`
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60_000)
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`
  return (
    date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
    ', ' +
    time
  )
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

function recordingTitle(rec: ApiRecording): string {
  if (rec.title && rec.title.trim().length) return rec.title
  return `Recording from ${new Date(rec.created_at).toLocaleDateString()}`
}

function recordingDurationMinutes(rec: ApiRecording): number {
  if (typeof rec.duration_ms !== 'number') return 0
  return Math.max(0, Math.round(rec.duration_ms / 60_000))
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState<ApiMeeting[]>([])
  const [recordings, setRecordings] = useState<ApiRecording[]>([])
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const loadDashboard = useCallback(() => {
    setLoading(true)
    setLoadError(false)
    let cancelled = false
    let failures = 0
    let settled = 0
    const finish = () => {
      settled += 1
      if (settled === 3 && !cancelled) setLoading(false)
    }
    const onFail = () => {
      failures += 1
      // Only the meetings list drives the hero + primary CTA — treat its
      // failure (all three fail together on an API outage) as a page error.
      if (failures >= 3 && !cancelled) setLoadError(true)
    }
    http
      .get('/api/meetings?status=scheduled')
      .then((res) => {
        if (!cancelled) setMeetings(unwrap<ApiMeeting[]>(res, []))
      })
      .catch(() => onFail())
      .finally(finish)
    http
      .get('/api/recordings?limit=3')
      .then((res) => {
        if (!cancelled) setRecordings(unwrap<ApiRecording[]>(res, []))
      })
      .catch(() => onFail())
      .finally(finish)
    http
      .get('/api/notifications?limit=4')
      .then((res) => {
        if (!cancelled) setNotifications(unwrap<ApiNotification[]>(res, []))
      })
      .catch(() => onFail())
      .finally(finish)
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(() => {
    const dispose = loadDashboard()
    return dispose
  }, [loadDashboard])

  const joinMeeting = useCallback(async () => {
    const code = joinCode.trim()
    if (!code) return
    setJoinError(null)
    try {
      const res = (await http.get(`/api/meetings/by-code/${encodeURIComponent(code)}`)) as
        { id?: string } | { data?: { id?: string } }
      const meetingId =
        (res as { id?: string })?.id ?? (res as { data?: { id?: string } })?.data?.id
      if (meetingId) {
        track({ name: 'meeting.code_resolved', properties: { meeting_id: meetingId } })
        navigate(`/meeting/${meetingId}/lobby`)
        return
      }
      setJoinError(t('dashboard.joinInvalidCode', {}, { defaultValue: 'Invalid meeting code' }))
    } catch (_error) {
      // lookup failure — show invalid-code message to user
      setJoinError(t('dashboard.joinInvalidCode', {}, { defaultValue: 'Invalid meeting code' }))
    }
  }, [http, joinCode, navigate, t])

  const startInstantMeeting = useCallback(async () => {
    try {
      const res = (await http.post('/api/meetings', {
        title: t('dashboard.instantTitle', {}, { defaultValue: 'Instant meeting' }),
      })) as { id?: string } | { data?: { id?: string } }
      const meetingId =
        (res as { id?: string })?.id ?? (res as { data?: { id?: string } })?.data?.id
      if (meetingId) {
        track({ name: 'meeting.created', properties: { meeting_id: meetingId, instant: true } })
        navigate(`/meeting/${meetingId}/lobby`)
        return
      }
    } catch (_error) {
      // instant-meeting creation failed — fall through to generic lobby route
    }
    navigate('/meeting/instant/lobby')
  }, [http, navigate, t])

  const next = meetings[0]
  const heroAttendees = useMemo(() => [], [])

  const activity = useMemo(
    () =>
      notifications.map((n) => ({
        id: n.id,
        type: NOTIFICATION_TO_ACTIVITY[n.type] ?? 'invited',
        actor_name: n.title,
        context_title: n.body ?? '',
        timestamp_label: timestampLabel(n.created_at),
        unread: n.read_at == null,
      })),
    [notifications],
  )

  return (
    <div className={cm.stack(10)}>
      <header className={cm.stack(2)}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('status.today', {}, { defaultValue: 'Today' })}
        </span>
        <h1 className={cm.cn('text-4xl font-extrabold tracking-tight text-on-surface')}>
          {t('dashboard.title', {}, { defaultValue: 'Welcome back' })}
        </h1>
        <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
          {t(
            'dashboard.subtitle',
            {},
            { defaultValue: 'Your meetings, recordings, and team — all in one room.' },
          )}
        </p>
      </header>

      {loadError && !loading && (
        <div
          role="alert"
          data-testid="dashboard-load-error"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 4 }),
            cm.sp('p', 4),
            'rounded-xl bg-error/10 border border-error/30',
          )}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-error')}>
            {t(
              'dashboard.loadError',
              {},
              { defaultValue: 'Could not reach the server. Check your connection.' },
            )}
          </p>
          <button
            type="button"
            onClick={loadDashboard}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              'bg-error text-on-error hover:bg-error-active transition-colors',
            )}
          >
            {t('common.retry', {}, { defaultValue: 'Retry' })}
          </button>
        </div>
      )}

      {next && !loadError && (
        <MeetingHeroCard
          title={next.title}
          startsAtLabel={formatScheduledLabel(next.starts_at)}
          startsInLabel={
            startsInMinutes(next.starts_at) !== undefined
              ? `${startsInMinutes(next.starts_at)} min`
              : undefined
          }
          status={
            startsInMinutes(next.starts_at) !== undefined &&
            (startsInMinutes(next.starts_at) ?? 0) <= 5
              ? 'starting'
              : 'upcoming'
          }
          attendees={heroAttendees}
          onJoin={() => navigate(`/meeting/${next.id}/lobby`)}
          onDetails={() => navigate(`/meeting/${next.id}/details`)}
        />
      )}

      <section className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-3')}>
        <button
          type="button"
          onClick={startInstantMeeting}
          className={cm.cn(
            cm.flex({ align: 'start', gap: 4 }),
            cm.sp('p', 6),
            'group text-left bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border-l-4 border-primary',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-12 h-12 rounded-xl bg-primary-container/40 text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors',
            )}
          >
            <span className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}>videocam</span>
          </div>
          <div className={cm.stack(1)}>
            <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('dashboard.startMeeting', {}, { defaultValue: 'Start instant meeting' })}
            </h3>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'dashboard.startMeetingHint',
                {},
                { defaultValue: 'One click to a brand-new room.' },
              )}
            </p>
          </div>
        </button>
        <div
          className={cm.cn(
            cm.flex({ align: 'start', gap: 4 }),
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-xl shadow-sm border-l-4 border-secondary',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-12 h-12 rounded-xl bg-secondary/15 text-secondary',
            )}
          >
            <span className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}>login</span>
          </div>
          <div className={cm.cn(cm.stack(2), cm.flex1)}>
            <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('dashboard.joinMeeting', {}, { defaultValue: 'Join with code' })}
            </h3>
            <div className={cm.stack(2)}>
              <input
                type="text"
                value={joinCode}
                aria-label={t('dashboard.codePlaceholder', {}, { defaultValue: 'Meeting code' })}
                onChange={(e) => {
                  setJoinCode(e.target.value)
                  if (joinError) setJoinError(null)
                }}
                onKeyDown={(e) => e.key === 'Enter' && joinMeeting()}
                placeholder={t('dashboard.codePlaceholder', {}, { defaultValue: 'Meeting code' })}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'w-full min-w-0 rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all',
                )}
              />
              <button
                type="button"
                onClick={joinMeeting}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  cm.roundedFull,
                  'self-start bg-secondary text-on-secondary hover:bg-secondary-hover transition-colors',
                )}
              >
                {t('common.join', {}, { defaultValue: 'Join' })}
              </button>
            </div>
            {joinError && (
              <p
                role="alert"
                data-testid="join-error"
                className={cm.cn(cm.textSize('xs'), 'text-error')}
              >
                {joinError}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/schedule')}
          className={cm.cn(
            cm.flex({ align: 'start', gap: 4 }),
            cm.sp('p', 6),
            'group text-left bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border-l-4 border-tertiary',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-12 h-12 rounded-xl bg-tertiary/15 text-tertiary group-hover:bg-tertiary group-hover:text-on-tertiary transition-colors',
            )}
          >
            <span className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}>event</span>
          </div>
          <div className={cm.stack(1)}>
            <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('dashboard.schedule', {}, { defaultValue: 'Schedule a meeting' })}
            </h3>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('dashboard.scheduleHint', {}, { defaultValue: 'Plan, invite, and run on-time.' })}
            </p>
          </div>
        </button>
      </section>

      <section className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'xl:grid-cols-3')}>
        <div className={cm.cn(cm.stack(4), 'xl:col-span-2')}>
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('dashboard.upcoming', {}, { defaultValue: 'Upcoming meetings' })}
            </h3>
            <button
              type="button"
              onClick={() => navigate('/schedule')}
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline',
              )}
            >
              {t('common.viewAll', {}, { defaultValue: 'View all' })}
            </button>
          </div>
          {loading && meetings.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : meetings.length === 0 ? (
            <p
              data-testid="no-meetings"
              className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
            >
              {t('dashboard.noMeetings', {}, { defaultValue: 'No upcoming meetings yet.' })}
            </p>
          ) : (
            <div className={cm.stack(3)}>
              {meetings.slice(0, 4).map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  id={meeting.id}
                  title={meeting.title}
                  subtitle={formatScheduledLabel(meeting.starts_at)}
                  timeLabel={formatScheduledLabel(meeting.starts_at)}
                  durationLabel={
                    durationMinutes(meeting.starts_at, meeting.ends_at)
                      ? `${durationMinutes(meeting.starts_at, meeting.ends_at)} min`
                      : undefined
                  }
                  attendees={[]}
                  status={
                    (meeting.is_recurring
                      ? 'recurring'
                      : ((meeting.status as MeetingCardStatus | undefined) ??
                        'upcoming')) as MeetingCardStatus
                  }
                  onPrimary={() => navigate(`/meeting/${meeting.id}/lobby`)}
                  onSecondary={() => navigate(`/meeting/${meeting.id}/details`)}
                />
              ))}
            </div>
          )}
        </div>
        <div className={cm.stack(4)}>
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('dashboard.activity', {}, { defaultValue: 'Workspace activity' })}
            </h3>
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline',
              )}
            >
              {t('common.viewAll', {}, { defaultValue: 'View all' })}
            </button>
          </div>
          {activity.length === 0 ? (
            <p
              data-testid="no-activity"
              className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
            >
              {t('dashboard.noActivity', {}, { defaultValue: 'No workspace activity yet.' })}
            </p>
          ) : (
            <div className={cm.stack(2)}>
              {activity.slice(0, 4).map((item) => (
                <ActivityFeedItem
                  key={item.id}
                  id={item.id}
                  type={item.type}
                  actorName={item.actor_name}
                  contextTitle={item.context_title}
                  timestampLabel={item.timestamp_label}
                  unread={item.unread}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <h3
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('dashboard.recentRecordings', {}, { defaultValue: 'Recent recordings' })}
          </h3>
          <button
            type="button"
            onClick={() => navigate('/recordings')}
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-primary hover:underline',
            )}
          >
            {t('common.viewAll', {}, { defaultValue: 'View all' })}
          </button>
        </div>
        {recordings.length === 0 ? (
          <p
            data-testid="no-recordings"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t('dashboard.noRecordings', {}, { defaultValue: 'No recordings yet.' })}
          </p>
        ) : (
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2 xl:grid-cols-3')}>
            {recordings.map((recording) => (
              <RecordingTile
                key={recording.id}
                id={recording.id}
                title={recordingTitle(recording)}
                hostName=""
                recordedAtLabel={timestampLabel(recording.created_at)}
                durationMinutes={recordingDurationMinutes(recording)}
                thumbnailUrl={recording.thumbnail_url ?? undefined}
                onPlay={() => navigate(`/recordings/${recording.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
